/**
 * Low Stock Checker
 * ----------------------------------------------------------------------------
 * Scans every product, compares current stock against its minimum stock
 * threshold, and raises notifications for products that are low on stock or
 * fully out of stock.
 *
 * Design notes (mirrors lib/notifications/expiryChecker.ts):
 * - Reuses existing data-access functions from `lib/db.ts`
 *   (`listProducts`, `listNotifications`, `pushNotification`) instead of
 *   querying the database directly. No new tables/columns.
 * - `NotificationItem` already has `"Low Stock"` and `"Out of Stock"` in its
 *   `category` union, so no schema change is needed to express severity.
 * - Because the notifications table has no dedicated dedup key, each
 *   generated message embeds a stable `(ref: <productId>:<status>)` tag.
 *   Before creating a notification we check existing notifications for that
 *   exact tag, so re-running this checker does not spam duplicate alerts.
 *   Keying on status (not just productId, unlike the expiry checker's
 *   batch-only key) means a product escalating from "low-stock" to
 *   "out-of-stock" still gets a fresh, more urgent alert instead of being
 *   silenced by an earlier low-stock notification.
 * - Every product is processed independently inside a try/catch so a single
 *   malformed record can't abort the whole run.
 * - `runLowStockChecker` is the single public entry point. It is
 *   transport-agnostic (no knowledge of HTTP, cron, or UI) so it can be
 *   called identically from a cron-triggered route or a manual
 *   "Run Inventory Check" button, exactly like `runExpiryChecker`.
 */

import { listProducts, listNotifications, pushNotification } from "@/lib/db";
import type { Product, NotificationItem } from "@/lib/types";
import {sendLowStockEmail, sendOutOfStockEmail} from "@/lib/email/notificationEmails";
import { sendLowStockPush, sendOutOfStockPush } from "@/lib/push/pushNotifications";

/** Result of classifying a single product's stock level. */
export type StockStatus = "out-of-stock" | "low-stock" | "ok";

/** A product that needs a notification, with the message already composed. */
export interface LowStockFinding {
  productId: string;
  productName: string;
  status: Exclude<StockStatus, "ok">;
  stock: number;
  minStock: number;
  category: NotificationItem["category"];
  message: string;
}

/**
 * Structured result of a full low stock check run. Returned by
 * `runLowStockChecker` so any caller (cron route, manual-trigger route,
 * future script) can log or display exactly what happened.
 */
export interface LowStockCheckSummary {
  /** Total number of products read from the database and evaluated. */
  totalProductsChecked: number;
  /** Products at or below minStock but with some stock remaining. */
  lowStockCount: number;
  /** Products with zero (or negative/invalid-to-zero) stock. */
  outOfStockCount: number;
  /** Notifications actually created via pushNotification in this run. */
  notificationsCreated: number;
  /** Products that were low/out of stock but already had a notification for that status. */
  skippedDuplicates: number;
  /** Per-product failures, collected instead of thrown so one bad record can't abort the run. */
  errors: { productId: string; error: string }[];
}

/**
 * Classifies a product's stock level against its minimum stock threshold.
 * Out-of-stock takes precedence over low-stock, since zero stock is always
 * a subset of "at or below minStock."
 * Defensive against non-finite values (e.g. corrupted/missing data) by
 * treating them as out-of-stock — better to over-alert than silently skip.
 */
export function classifyStock(stock: number, minStock: number): StockStatus {
  const safeStock = Number.isFinite(stock) ? stock : 0;
  const safeMinStock = Number.isFinite(minStock) ? minStock : 0;

  if (safeStock <= 0) return "out-of-stock";
  if (safeStock <= safeMinStock) return "low-stock";
  return "ok";
}

/**
 * Builds the notification category/message for a product that needs
 * alerting. Out-of-stock products get a clearly flagged critical message;
 * low-stock products get a standard warning. Both embed a
 * `(ref: productId:status)` tag used for dedup by `hasExistingNotification`.
 */
export function buildStockMessage(
  product: Product,
  status: Exclude<StockStatus, "ok">
): { category: NotificationItem["category"]; message: string } {
  const label = product.name || "Unknown product";
  const where = product.warehouse ? ` at ${product.warehouse}` : "";

  if (status === "out-of-stock") {
    return {
      category: "Out of Stock",
      message: `CRITICAL: ${label} is out of stock${where}. Reorder immediately. (ref: ${product.id}:out-of-stock)`,
    };
  }

  return {
    category: "Low Stock",
    message: `${label} is running low${where} (${product.stock} left, minimum ${product.minStock}). Consider restocking. (ref: ${product.id}:low-stock)`,
  };
}

/**
 * Checks whether a notification for this exact product + status already
 * exists, using the `(ref: <productId>:<status>)` tag embedded by
 * `buildStockMessage`. Keying on status (not just productId) means a
 * product that escalates from low-stock to out-of-stock still gets a fresh
 * alert instead of being silenced by an earlier, less urgent notification.
 */
export function hasExistingNotification(
  existingNotifications: NotificationItem[],
  productId: string,
  status: Exclude<StockStatus, "ok">
): boolean {
  const tag = `(ref: ${productId}:${status})`;
  return existingNotifications.some(
    (n) => (n.category === "Low Stock" || n.category === "Out of Stock") && n.message.includes(tag)
  );
}

/**
 * Pure decision function for a single product: returns what should be
 * notified, or `null` if the product isn't due for an alert (stock is
 * healthy, or already notified about at this status). Kept side-effect-free
 * so it can be unit tested independently of the database.
 */
export function checkProduct(
  product: Product,
  existingNotifications: NotificationItem[]
): LowStockFinding | null {
  const status = classifyStock(product.stock, product.minStock);
  if (status === "ok") return null;

  if (hasExistingNotification(existingNotifications, product.id, status)) return null;

  const { category, message } = buildStockMessage(product, status);

  return {
    productId: product.id,
    productName: product.name,
    status,
    stock: product.stock,
    minStock: product.minStock,
    category,
    message,
  };
}

/**
 * Runs a full low stock check across all products.
 *
 * Steps:
 * 1. Loads products and existing notifications using the existing
 *    `lib/db.ts` functions (no direct SQL here).
 * 2. Evaluates every product via `checkProduct`.
 * 3. Creates a notification for each new finding via the existing
 *    `pushNotification` function.
 * 4. Returns a structured `LowStockCheckSummary`.
 *
 * Transport-agnostic by design, matching `runExpiryChecker`: this function
 * takes no request/response objects and has no knowledge of HTTP, cron, or
 * UI, so the exact same call can be reused by a cron-triggered API route
 * and a manual "Run Inventory Check" button.
 *
 * Errors on individual products are caught and collected rather than
 * thrown, so one bad record never aborts the rest of the scan. A failure
 * loading the initial data (e.g. database unreachable) is also caught and
 * reported in the summary rather than throwing, so callers always get a
 * usable result object.
 */
export async function runLowStockChecker(): Promise<LowStockCheckSummary> {
  const summary: LowStockCheckSummary = {
    totalProductsChecked: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    notificationsCreated: 0,
    skippedDuplicates: 0,
    errors: [],
  };

  let products: Product[];
  let existingNotifications: NotificationItem[];

  try {
    [products, existingNotifications] = await Promise.all([listProducts(), listNotifications()]);
  } catch (err) {
    summary.errors.push({
      productId: "*",
      error: `Failed to load data for low stock check: ${err instanceof Error ? err.message : String(err)}`,
    });
    return summary;
  }

  summary.totalProductsChecked = products.length;

  for (const product of products) {
    try {
      const result = checkProduct(product, existingNotifications);

      if (result === null) {
        const status = classifyStock(product.stock, product.minStock);
        if (status !== "ok") summary.skippedDuplicates += 1;
        continue;
      }

      if (result.status === "out-of-stock") summary.outOfStockCount += 1;
      else summary.lowStockCount += 1;

      const created = await pushNotification({ category: result.category, message: result.message });
      // Keep the in-memory list updated so later products in this same run
      // see it and don't duplicate (defensive; products are unique by id,
      // but keeps behavior consistent with expiryChecker.ts).
      existingNotifications.push(created);
      summary.notificationsCreated += 1;

      // Email is best-effort: sendLowStockEmail/sendOutOfStockEmail never
      // throw (see lib/email/mailer.ts), so a failed send can't interrupt
      // this run — it only logs internally.
      if (result.status === "out-of-stock") {
        await sendOutOfStockEmail({ productName: result.productName, warehouse: product.warehouse });
        // Push is likewise best-effort and never-throwing (see
        // lib/push/pushService.ts) — safe to call unconditionally.
        sendOutOfStockPush({ productName: result.productName, warehouse: product.warehouse });
      } else {
        await sendLowStockEmail({
          productName: result.productName,
          currentStock: result.stock,
          minimumStock: result.minStock,
        });
        sendLowStockPush({
          productName: result.productName,
          currentStock: result.stock,
          minimumStock: result.minStock,
        });
      }
    } catch (err) {
      summary.errors.push({
        productId: product.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}