/**
 * Inventory Automation (orchestrator)
 * ----------------------------------------------------------------------------
 * A single reusable entry point that runs all inventory automation checks in
 * sequence and returns one combined summary:
 *
 *   runExpiryChecker()  ->  runLowStockChecker()  ->  runPurchaseRequestAutomation()
 *
 * Design notes:
 * - This file contains NO business logic of its own — no product/batch/
 *   request evaluation, no message building, no dedup. All of that already
 *   lives in, and stays in:
 *     lib/notifications/expiryChecker.ts        (runExpiryChecker)
 *     lib/notifications/lowStockChecker.ts       (runLowStockChecker)
 *     lib/automation/purchaseRequestAutomation.ts (runPurchaseRequestAutomation)
 * - Each of the three functions above is already transport-agnostic, takes
 *   no arguments, and independently reads whatever it needs from `lib/db.ts`
 *   — so orchestration is purely "call them in order and collect results,"
 *   with no data passed between them.
 * - Runs sequentially (not in parallel) so the checks happen in a
 *   predictable order: Expiry, then Low Stock, then Purchase Requests (which
 *   depends on the current low-stock state of products, so running it last
 *   is meaningful even though it independently re-reads that state itself).
 * - Each checker is wrapped in `runSafely`, a thin safety net *above* each
 *   module's own internal error handling. Every checker already collects
 *   its own per-record errors into its summary instead of throwing — but
 *   this adds a second layer of protection against a totally unexpected
 *   crash (e.g. an import-time error) in one checker preventing the other
 *   two from running.
 * - `runInventoryAutomation` is the single public entry point, transport-
 *   agnostic like the functions it orchestrates, reusable identically from
 *   a cron-triggered route or a manual "Run Inventory Check" button.
 */

import { runExpiryChecker, type ExpiryCheckSummary} from "@/lib/notifications/expiryChecker";
import { runLowStockChecker, type LowStockCheckSummary } from "@/lib/notifications/lowStockChecker";
import { runPurchaseRequestAutomation, type PurchaseRequestAutomationSummary } from "@/lib/automation/purchaseRequestAutomation";

/**
 * Combined result of a full inventory automation run: the three individual
 * checker summaries, plus timing metadata for the run as a whole.
 */
export interface InventoryAutomationSummary {
  expiry: ExpiryCheckSummary;
  lowStock: LowStockCheckSummary;
  purchaseRequests: PurchaseRequestAutomationSummary;
  /** ISO timestamp for when the orchestration run started. */
  startedAt: string;
  /** ISO timestamp for when the orchestration run finished. */
  finishedAt: string;
  /** Total wall-clock duration of the run, in milliseconds. */
  durationMs: number;
}

/**
 * Runs a single checker function, catching any unexpected (unthrown-by-
 * design) failure so it can't prevent the remaining checkers in the
 * orchestration from running. Each checker already reports its own
 * per-record errors inside its own summary (via an `errors` array) — this
 * wrapper only guards against a checker throwing entirely (e.g. a crash
 * before it can build its own summary), in which case `fallback` (a summary
 * shaped the same way, with the failure recorded in its `errors` array) is
 * returned instead.
 */
async function runSafely<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`Inventory automation: "${label}" failed unexpectedly:`, err);
    return fallback;
  }
}

/**
 * Runs the full inventory automation pipeline:
 * 1. `runExpiryChecker()` — flags expired / soon-to-expire batches.
 * 2. `runLowStockChecker()` — flags low-stock / out-of-stock products.
 * 3. `runPurchaseRequestAutomation()` — auto-creates purchase requests for
 *    products still at/below their minimum stock.
 *
 * Executed sequentially, in that exact order. Records start/finish
 * timestamps and total duration alongside the three individual summaries.
 *
 * Transport-agnostic by design, matching the three functions it calls: this
 * function takes no request/response objects and has no knowledge of HTTP,
 * cron, or UI, so the exact same call can be reused by a cron-triggered API
 * route and a manual "Run Inventory Check" button — with zero duplicated
 * orchestration logic between the two call sites.
 */
export async function runInventoryAutomation(): Promise<InventoryAutomationSummary> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const expiry = await runSafely("Expiry Checker", runExpiryChecker, {
    totalBatchesChecked: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
    notificationsCreated: 0,
    skippedDuplicates: 0,
    skippedInvalidDate: 0,
    errors: [{ batchId: "*", error: "Expiry Checker failed unexpectedly and did not run to completion." }],
  });

  const lowStock = await runSafely("Low Stock Checker", runLowStockChecker, {
    totalProductsChecked: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    notificationsCreated: 0,
    skippedDuplicates: 0,
    errors: [{ productId: "*", error: "Low Stock Checker failed unexpectedly and did not run to completion." }],
  });

  const purchaseRequests = await runSafely("Purchase Request Automation", runPurchaseRequestAutomation, {
    totalProductsChecked: 0,
    purchaseRequestsCreated: 0,
    duplicatesSkipped: 0,
    healthyProducts: 0,
    errors: [{ productId: "*", error: "Purchase Request Automation failed unexpectedly and did not run to completion." }],
  });

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  return { expiry, lowStock, purchaseRequests, startedAt, finishedAt, durationMs };
}