/**
 * Push Notifications
 * ----------------------------------------------------------------------------
 * One reusable function per inventory automation event, mirroring
 * `lib/email/notificationEmails.ts`. Each function only formats a
 * title/body and delegates to `broadcastPush` (lib/push/pushService.ts) —
 * no business/decision logic lives here. Callers (the existing checker
 * loops) decide *when* a finding is real and not a duplicate; these
 * functions only decide *how it looks* as a push notification.
 *
 * All functions return whatever `broadcastPush` returns
 * (`{ success, delivered, failed }`) and never throw, so calling code in
 * the automation modules can call them without their own try/catch and
 * without any risk of a push failure interrupting the run.
 */

import { broadcastPush, type BroadcastResult} from "@/lib/push/pushService" ;

export interface ExpiredPushInput {
  productName: string;
  batchId: string;
  daysExpired: number;
}

/**
 * Sends the "Expired Product Alert" push. Called from `runExpiryChecker()`
 * right after it creates the corresponding in-app notification for an
 * "expired" finding.
 */
export function sendExpiredPush(input: ExpiredPushInput): BroadcastResult {
  return broadcastPush({
    title: "🚨 Expired Product Alert",
    body: `${input.productName} (batch ${input.batchId}) expired ${input.daysExpired} day${input.daysExpired === 1 ? "" : "s"} ago.`,
    category: "Expiry",
    timestamp: new Date().toISOString(),
  });
}

export interface ExpiringSoonPushInput {
  productName: string;
  batchId: string;
  daysRemaining: number;
}

/**
 * Sends the "Expiring Soon" push. Called from `runExpiryChecker()` right
 * after it creates the corresponding in-app notification for an
 * "expiring-soon" finding.
 */
export function sendExpiringSoonPush(input: ExpiringSoonPushInput): BroadcastResult {
  return broadcastPush({
    title: "⚠ Expiring Soon",
    body: `${input.productName} (batch ${input.batchId}) expires in ${input.daysRemaining} day${input.daysRemaining === 1 ? "" : "s"}.`,
    category: "Expiry",
    timestamp: new Date().toISOString(),
  });
}

export interface LowStockPushInput {
  productName: string;
  currentStock: number;
  minimumStock: number;
}

/**
 * Sends the "Low Stock Alert" push. Called from `runLowStockChecker()`
 * right after it creates the corresponding in-app notification for a
 * "low-stock" finding.
 */
export function sendLowStockPush(input: LowStockPushInput): BroadcastResult {
  return broadcastPush({
    title: "📦 Low Stock Alert",
    body: `${input.productName} is running low (${input.currentStock} left, minimum ${input.minimumStock}).`,
    category: "Low Stock",
    timestamp: new Date().toISOString(),
  });
}

export interface OutOfStockPushInput {
  productName: string;
  warehouse: string;
}

/**
 * Sends the "Out Of Stock" push. Called from `runLowStockChecker()` right
 * after it creates the corresponding in-app notification for an
 * "out-of-stock" finding.
 */
export function sendOutOfStockPush(input: OutOfStockPushInput): BroadcastResult {
  return broadcastPush({
    title: "❌ Out Of Stock",
    body: `${input.productName} is out of stock at ${input.warehouse}.`,
    category: "Out of Stock",
    timestamp: new Date().toISOString(),
  });
}

export interface PurchaseRequestPushInput {
  productName: string;
  recommendedQuantity: number;
  warehouse: string;
}

/**
 * Sends the "Purchase Request Created" push. Called from
 * `runPurchaseRequestAutomation()` right after it creates the corresponding
 * in-app notification for a newly auto-generated purchase request.
 */
export function sendPurchaseRequestPush(input: PurchaseRequestPushInput): BroadcastResult {
  return broadcastPush({
    title: "🛒 Purchase Request Created",
    body: `Requesting ${input.recommendedQuantity}× ${input.productName} for ${input.warehouse}.`,
    category: "Purchase Request",
    timestamp: new Date().toISOString(),
  });
}