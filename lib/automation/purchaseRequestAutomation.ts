/**
 * Purchase Request Automation
 * ----------------------------------------------------------------------------
 * Scans every product, and for any product at or below its minimum stock
 * threshold, automatically creates a "pending" Purchase Request — unless one
 * is already active for that product.
 *
 * Design notes (mirrors lib/notifications/expiryChecker.ts and
 * lib/notifications/lowStockChecker.ts):
 * - Reuses existing data-access functions from `lib/db.ts`
 *   (`listProducts`, `listPurchaseRequests`, `updatePurchaseRequest`,
 *   `pushNotification`) instead of adding new database functions.
 *   `updatePurchaseRequest` already performs an upsert
 *   (`INSERT ... ON CONFLICT (id) DO UPDATE`), so it doubles as the
 *   "create" function here — no new database code is needed.
 * - The `PurchaseRequest` schema has no `productId`, `minStock`, or
 *   "recommended quantity" column, and is not modified here. `quantity`
 *   already means "how much to order," so it holds the recommended
 *   quantity directly. To keep a reliable link back to the source product
 *   for duplicate detection, the automation embeds a `(ref: productId)`
 *   tag inside `requestedBy`, prefixed with `"Automation"` so it still
 *   reads sensibly wherever a requester name is displayed (matches the
 *   `(ref: ...)` dedup pattern already used by both existing checkers).
 * - `estCost` has no source of truth on `Product` (no price field exists),
 *   so it defaults to `0` rather than being fabricated. This is a known
 *   limitation, not a bug — flagged here for future work if pricing data
 *   becomes available.
 * - Every product is processed independently inside a try/catch so a
 *   single malformed record can't abort the whole run.
 * - `runPurchaseRequestAutomation` is the single public entry point,
 *   transport-agnostic (no knowledge of HTTP, cron, or UI), reusable from
 *   both a cron-triggered route and a manual "Run Inventory Check" button.
 */

import { listProducts, listPurchaseRequests, updatePurchaseRequest, pushNotification } from "@/lib/db";
import type { Product, PurchaseRequest } from "@/lib/types";
import {sendPurchaseRequestEmail} from "@/lib/email/notificationEmails";
import { sendPurchaseRequestPush } from "@/lib/push/pushNotifications";

/** Statuses that count as "already being handled" for dedup purposes. */
const ACTIVE_STATUSES: PurchaseRequest["status"][] = ["pending", "approved"];

/**
 * Structured result of a full purchase request automation run. Returned by
 * `runPurchaseRequestAutomation` so any caller (cron route, manual-trigger
 * route, future script) can log or display exactly what happened.
 */
export interface PurchaseRequestAutomationSummary {
  /** Total number of products read from the database and evaluated. */
  totalProductsChecked: number;
  /** New purchase requests created in this run. */
  purchaseRequestsCreated: number;
  /** Products at/below minStock that already had an active (pending/approved) request. */
  duplicatesSkipped: number;
  /** Products with healthy stock (stock > minStock) — no action needed. */
  healthyProducts: number;
  /** Per-product failures, collected instead of thrown so one bad record can't abort the run. */
  errors: { productId: string; error: string }[];
}

/**
 * Calculates how much to order for a product that's at or below its
 * minimum stock threshold.
 *
 * Formula: max(minStock * 2 - stock, minStock)
 * — restocks back up to double the minimum, but never recommends less than
 * the minimum itself (guards against a small/negative result when stock is
 * close to, or oddly above, minStock due to stale data).
 */
export function calculateRecommendedQuantity(stock: number, minStock: number): number {
  const safeStock = Number.isFinite(stock) ? stock : 0;
  const safeMinStock = Number.isFinite(minStock) ? minStock : 0;
  return Math.max(safeMinStock * 2 - safeStock, safeMinStock);
}

/**
 * Builds a new (not-yet-persisted) PurchaseRequest record for a product
 * that needs restocking. `requestedBy` embeds a `(ref: productId)` tag,
 * prefixed with "Automation", used by `hasActivePurchaseRequest` for
 * duplicate detection — see module-level notes on why this is necessary
 * without a schema change.
 */
export function buildPurchaseRequestRecord(product: Product, recommendedQuantity: number): PurchaseRequest {
  return {
    id: `pr-auto-${product.id}-${Date.now()}`,
    product: product.name,
    quantity: recommendedQuantity,
    requestedBy: `Automation (ref: ${product.id})`,
    warehouse: product.warehouse,
    status: "pending",
    date: new Date().toISOString(),
    estCost: 0,
  };
}

/**
 * Checks whether a product already has an active purchase request
 * (status "pending" or "approved"), using the `(ref: productId)` tag
 * embedded in `requestedBy` by `buildPurchaseRequestRecord`. This is how
 * duplicate requests are prevented: only one active request is allowed per
 * product at a time, regardless of how many times this automation runs.
 */
export function hasActivePurchaseRequest(existingRequests: PurchaseRequest[], productId: string): boolean {
  const tag = `(ref: ${productId})`;
  return existingRequests.some((r) => ACTIVE_STATUSES.includes(r.status) && r.requestedBy.includes(tag));
}

/**
 * Pure decision function for a single product: returns a new purchase
 * request record to create, or `null` if no action is needed (stock is
 * healthy, or an active request already covers this product). Kept
 * side-effect-free so it can be unit tested independently of the database.
 */
export function checkProduct(product: Product, existingRequests: PurchaseRequest[]): PurchaseRequest | null {
  const stock = Number.isFinite(product.stock) ? product.stock : 0;
  const minStock = Number.isFinite(product.minStock) ? product.minStock : 0;

  if (stock > minStock) return null; // healthy — rule: stock <= minStock triggers a request

  if (hasActivePurchaseRequest(existingRequests, product.id)) return null; // already being handled

  const recommendedQuantity = calculateRecommendedQuantity(stock, minStock);
  return buildPurchaseRequestRecord(product, recommendedQuantity);
}

/**
 * Runs a full purchase request automation pass across all products.
 *
 * Steps:
 * 1. Loads products and existing purchase requests using the existing
 *    `lib/db.ts` functions (no direct SQL here).
 * 2. Evaluates every product via `checkProduct`.
 * 3. Creates each new request via the existing `updatePurchaseRequest`
 *    (upsert), and pushes a `"Purchase Request"` notification via the
 *    existing `pushNotification`, so an auto-created request is visible in
 *    the notification feed the same way manual approve/reject actions are.
 * 4. Returns a structured `PurchaseRequestAutomationSummary`.
 *
 * Transport-agnostic by design, matching `runExpiryChecker` and
 * `runLowStockChecker`: this function takes no request/response objects
 * and has no knowledge of HTTP, cron, or UI, so the exact same call can be
 * reused by a cron-triggered API route and a manual "Run Inventory Check"
 * button.
 *
 * Errors on individual products are caught and collected rather than
 * thrown, so one bad record never aborts the rest of the scan. A failure
 * loading the initial data (e.g. database unreachable) is also caught and
 * reported in the summary rather than throwing, so callers always get a
 * usable result object.
 */
export async function runPurchaseRequestAutomation(): Promise<PurchaseRequestAutomationSummary> {
  const summary: PurchaseRequestAutomationSummary = {
    totalProductsChecked: 0,
    purchaseRequestsCreated: 0,
    duplicatesSkipped: 0,
    healthyProducts: 0,
    errors: [],
  };

  let products: Product[];
  let existingRequests: PurchaseRequest[];

  try {
    [products, existingRequests] = await Promise.all([listProducts(), listPurchaseRequests()]);
  } catch (err) {
    summary.errors.push({
      productId: "*",
      error: `Failed to load data for purchase request automation: ${err instanceof Error ? err.message : String(err)}`,
    });
    return summary;
  }

  summary.totalProductsChecked = products.length;

  for (const product of products) {
    try {
      const stock = Number.isFinite(product.stock) ? product.stock : 0;
      const minStock = Number.isFinite(product.minStock) ? product.minStock : 0;

      if (stock > minStock) {
        summary.healthyProducts += 1;
        continue;
      }

      const newRequest = checkProduct(product, existingRequests);

      if (newRequest === null) {
        summary.duplicatesSkipped += 1;
        continue;
      }

      const created = await updatePurchaseRequest(newRequest.id, newRequest);
      // Keep the in-memory list updated so later products in this same run
      // see it (defensive; products are unique by id, but keeps behavior
      // consistent with the other checkers).
      existingRequests.push(created);
      summary.purchaseRequestsCreated += 1;

      await pushNotification({
        category: "Purchase Request",
        message: `Auto-generated purchase request for ${created.quantity}× ${created.product} (stock ${stock}, min ${minStock}).`,
      });

      // Email is best-effort: sendPurchaseRequestEmail never throws (see
      // lib/email/mailer.ts), so a failed send can't interrupt this run —
      // it only logs internally.
      await sendPurchaseRequestEmail({
        productName: created.product,
        recommendedQuantity: created.quantity,
        warehouse: created.warehouse,
      });

      // Push is likewise best-effort and never-throwing (see
      // lib/push/pushService.ts) — safe to call unconditionally.
      sendPurchaseRequestPush({
        productName: created.product,
        recommendedQuantity: created.quantity,
        warehouse: created.warehouse,
      });
    } catch (err) {
      summary.errors.push({
        productId: product.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}