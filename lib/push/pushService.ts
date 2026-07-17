/**
 * Push Service (transport layer)
 * ----------------------------------------------------------------------------
 * Thin, reusable transport for in-tab browser push notifications, delivered
 * over Server-Sent Events (SSE). Contains no domain knowledge (no
 * product/batch/purchase-request logic) — that lives in
 * `lib/push/pushNotifications.ts`. This file only knows how to register
 * connected browser clients and broadcast a payload to all of them.
 *
 * Design notes:
 * - No schema changes: connected clients are tracked in an in-memory Map,
 *   not persisted anywhere. This is the SSE-appropriate choice anyway — an
 *   SSE connection is inherently a live, ephemeral socket, not something
 *   you'd store in a database.
 * - Known limitation (inherent to this approach, not a bug): this registry
 *   only knows about clients connected to *this* server process. In a
 *   traditional long-running Node server (e.g. `next start`, or `next dev`)
 *   that's the only process, so it works correctly end-to-end. In a
 *   multi-instance serverless deployment, a broadcast triggered on one
 *   instance won't reach a client whose SSE connection is being held open
 *   by a different instance. Fine for this scope (in-tab notifications
 *   while the dashboard is open); would need a shared pub/sub layer
 *   (e.g. Redis) to be fully serverless-correct.
 * - `broadcastPush` NEVER throws. A failure sending to one client (e.g. a
 *   connection that died without cleanly unregistering) is caught, logged,
 *   and that client is removed — it never prevents delivery to the other
 *   connected clients, and never bubbles up to the caller (the automation
 *   checkers).
 */

/** A single connected browser client, able to receive SSE-formatted messages. */
export interface PushClient {
  id: string;
  /** Writes a raw SSE-formatted chunk (already includes the `data: ...\n\n` framing) to this client's stream. */
  send: (chunk: string) => void;
}

/** Payload shape delivered to connected browsers and rendered via the Notification API. */
export interface PushPayload {
  title: string;
  body: string;
  category: string;
  timestamp: string;
}

const clients = new Map<string, PushClient>();

/**
 * Registers a newly connected browser client (called by the SSE route
 * handler when a new EventSource connection opens). Returns an
 * `unregister` function the route should call when the connection closes.
 */
export function registerClient(client: PushClient): () => void {
  clients.set(client.id, client);
  console.log(`[push] Client connected (${client.id}). Active clients: ${clients.size}`);

  return () => {
    clients.delete(client.id);
    console.log(`[push] Client disconnected (${client.id}). Active clients: ${clients.size}`);
  };
}

/** Number of browser tabs currently holding an open SSE connection. Useful for diagnostics/logging. */
export function getConnectedClientCount(): number {
  return clients.size;
}

/**
 * Formats a payload as an SSE `data:` frame.
 */
function formatSseMessage(payload: PushPayload): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export interface BroadcastResult {
  success: boolean;
  delivered: number;
  failed: number;
}

/**
 * Broadcasts a push payload to every currently connected browser client.
 *
 * NEVER throws. Each client's `send` is wrapped individually — a failure on
 * one dead/broken connection is caught, logged, and that client is removed
 * from the registry, but delivery continues to every other connected
 * client. If there are zero connected clients (nobody has the dashboard
 * open), this safely no-ops and reports `delivered: 0`.
 */
export function broadcastPush(payload: PushPayload): BroadcastResult {
  const message = formatSseMessage(payload);
  let delivered = 0;
  let failed = 0;

  for (const [id, client] of clients) {
    try {
      client.send(message);
      delivered += 1;
    } catch (err) {
      failed += 1;
      console.error(`[push] Failed to deliver to client ${id}, removing it:`, err instanceof Error ? err.message : err);
      clients.delete(id);
    }
  }

  if (delivered === 0 && failed === 0) {
    console.log(`[push] No connected clients — "${payload.title}" was not delivered to anyone.`);
  } else {
    console.log(`[push] Broadcast "${payload.title}" -> delivered to ${delivered}, failed for ${failed}.`);
  }

  return { success: true, delivered, failed };
}