import { registerClient } from "@/lib/push/pushService";

/**
 * GET /api/push/stream
 *
 * Thin transport wrapper only — all push logic (client registry, broadcast)
 * lives in `lib/push/pushService.ts`. This route's only job is to open a
 * Server-Sent Events connection, register it with the shared client
 * registry via `registerClient`, and clean up on disconnect.
 *
 * Browser clients connect with `new EventSource("/api/push/stream")`.
 * See components/push/PushListener.tsx for the client-side consumer that
 * turns incoming events into Notification API popups.
 *
 * Must run on the Node.js runtime (not Edge) and must not be statically
 * cached, since it's a long-lived streaming connection.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET() {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unregister: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      unregister = registerClient({
        id: clientId,
        send: (chunk: string) => controller.enqueue(encoder.encode(chunk)),
      });

      // Initial comment line so the browser's EventSource immediately sees
      // a live connection (comment lines starting with ":" are ignored by
      // EventSource itself but keep the connection from looking idle/dead).
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Periodic heartbeat to keep the connection alive through proxies/
      // load balancers that might otherwise time out an idle stream.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (err) {
          // Controller may already be closed if the client disconnected
          // between ticks; cleanup below (cancel()) handles teardown.
          console.warn("[push/stream] Heartbeat failed, connection likely closed:", err instanceof Error ? err.message : err);
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      // Called when the browser disconnects (tab closed, navigated away, etc.).
      if (heartbeat) clearInterval(heartbeat);
      if (unregister) unregister();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}