/**
 * Expiry Checker
 * ----------------------------------------------------------------------------
 * Scans every product batch, compares its expiry date against today, and
 * raises notifications for batches that are already expired or expiring
 * within the next 30 days.
 *
 * Design notes:
 * - Reuses existing data-access functions from `lib/db.ts`
 *   (`listBatches`, `listProducts`, `listNotifications`, `pushNotification`)
 *   instead of querying the database directly. No new tables/columns.
 * - `NotificationItem` has no `priority` field, and the notifications schema
 *   is not modified here, so "high priority" for expired items is conveyed
 *   through the message text itself (a clear prefix) rather than a new field.
 * - Because the notifications table has no dedicated dedup key, each
 *   generated message embeds a stable `(ref: <batchId>:<expiryDate>)` tag.
 *   Before creating a notification we check existing notifications for that
 *   exact tag, so re-running this checker (e.g. daily, via cron) does not
 *   spam duplicate alerts for the same batch at the same expiry date. The
 *   tag intentionally includes the expiry date (not just the batch id): if
 *   a batch's expiry date is later corrected/edited, that's meaningfully
 *   new information, so it must produce a fresh notification rather than
 *   being silently suppressed by an old alert for the batch's previous date.
 * - Every batch is processed independently inside a try/catch so a single
 *   malformed record can't abort the whole run.
 * - `runExpiryChecker` is the single public entry point. It is intentionally
 *   transport-agnostic (no knowledge of HTTP, cron, or UI) so it can be
 *   called identically from an API route hit by a cron job, or from an API
 *   route hit by a "Run Inventory Check" button.
 */

import { listBatches, listProducts, listNotifications, pushNotification } from "@/lib/db";
import type { ProductBatch, Product, NotificationItem } from "@/lib/types";
import {sendExpiredEmail, sendExpiringSoonEmail}  from "@/lib/email/notificationEmails";
import { sendExpiredPush, sendExpiringSoonPush } from "@/lib/push/pushNotifications";

/** How many days out counts as "expiring soon". */
const EXPIRY_WARNING_WINDOW_DAYS = 30;

/** Result of classifying a single batch's expiry date. */
export type ExpiryStatus = "expired" | "expiring-soon" | "ok";

/** A batch that needs a notification, with the message already composed. */
export interface ExpiryFinding {
  batchId: string;
  productId: string;
  productName: string;
  status: Exclude<ExpiryStatus, "ok">;
  daysUntilExpiry: number;
  category: NotificationItem["category"];
  message: string;
}

/**
 * Structured result of a full expiry check run. Returned by
 * `runExpiryChecker` so any caller (cron route, manual-trigger route,
 * future script) can log or display exactly what happened.
 */
export interface ExpiryCheckSummary {
  /** Total number of batches read from the database and evaluated. */
  totalBatchesChecked: number;
  /** Batches whose expiry date has already passed. */
  expiredCount: number;
  /** Batches expiring within the warning window (but not yet expired). */
  expiringSoonCount: number;
  /** Notifications actually created via pushNotification in this run. */
  notificationsCreated: number;
  /** Batches that were expiring/expired but already had a notification. */
  skippedDuplicates: number;
  /** Batches skipped because their expiryDate was missing/unparseable. */
  skippedInvalidDate: number;
  /** Per-batch failures, collected instead of thrown so one bad record can't abort the run. */
  errors: { batchId: string; error: string }[];
}

/**
 * Parses a batch's `expiryDate` string into a `Date`.
 * Returns `null` (never throws) for missing or unparseable values so a
 * single malformed record doesn't break the whole scan.
 */
export function parseExpiryDate(expiryDate: string | undefined | null): Date | null {
  if (!expiryDate || typeof expiryDate !== "string" || !expiryDate.trim()) return null;
  const parsed = new Date(expiryDate.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Whole-day difference between `expiryDate` and today, normalized to
 * midnight so results aren't skewed by time-of-day.
 * Negative values mean the date is in the past (already expired).
 */
export function getDaysUntilExpiry(expiryDate: Date, now: Date = new Date()): number {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExpiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfExpiry.getTime() - startOfToday.getTime()) / msPerDay);
}

/**
 * Classifies a day count into an expiry status using the 30-day window.
 */
export function classifyExpiry(daysUntilExpiry: number): ExpiryStatus {
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= EXPIRY_WARNING_WINDOW_DAYS) return "expiring-soon";
  return "ok";
}

/**
 * Builds the notification category/message for a batch that needs alerting.
 * Expired batches get a clearly flagged high-priority message; expiring-soon
 * batches get a standard heads-up. Both embed a `(ref: batchId:expiryDate)`
 * tag used for dedup by `hasExistingNotification` — keying on the expiry
 * date (not just the batch id) means a corrected/changed expiry date is
 * treated as new information, not a duplicate.
 */
export function buildExpiryMessage(
  batch: ProductBatch,
  productName: string,
  status: Exclude<ExpiryStatus, "ok">,
  daysUntilExpiry: number
): { category: NotificationItem["category"]; message: string } {
  const label = productName || "Unknown product";
  const lotRef = batch.batchNumber || batch.lotNumber || batch.id;
  const dedupTag = `(ref: ${batch.id}:${batch.expiryDate})`;

  if (status === "expired") {
    const overdueDays = Math.abs(daysUntilExpiry);
    return {
      category: "Expiry",
      message: `HIGH PRIORITY: ${label} (lot ${lotRef}) expired ${overdueDays} day${overdueDays === 1 ? "" : "s"} ago. Remove from stock immediately. ${dedupTag}`,
    };
  }

  return {
    category: "Expiry",
    message: `${label} (lot ${lotRef}) expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}. Plan to sell or rotate soon. ${dedupTag}`,
  };
}

/**
 * Checks whether a notification for this exact batch id + expiry date
 * already exists, using the `(ref: <batchId>:<expiryDate>)` tag embedded by
 * `buildExpiryMessage`. Keying on both fields (not batchId alone) means
 * that if a batch's expiry date changes — e.g. a data-entry correction —
 * it's treated as new information and gets a fresh notification, instead
 * of being silently suppressed by an old notification for the batch's
 * previous expiry date.
 */
export function hasExistingNotification(
  existingNotifications: NotificationItem[],
  batchId: string,
  expiryDate: string
): boolean {
  const tag = `(ref: ${batchId}:${expiryDate})`;
  return existingNotifications.some((n) => n.category === "Expiry" && n.message.includes(tag));
}

/**
 * Pure decision function for a single batch: returns what should be
 * notified, `"invalid-date"` if the expiry date couldn't be parsed, or
 * `null` if the batch isn't due for an alert (not expiring, or already
 * notified about). Kept side-effect-free so it can be unit tested
 * independently of the database.
 */
export function checkBatch(
  batch: ProductBatch,
  productNameById: Map<string, string>,
  existingNotifications: NotificationItem[],
  now: Date = new Date()
): ExpiryFinding | "invalid-date" | null {
  const expiryDate = parseExpiryDate(batch.expiryDate);
  if (!expiryDate) return "invalid-date";

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate, now);
  const status = classifyExpiry(daysUntilExpiry);
  if (status === "ok") return null;

  if (hasExistingNotification(existingNotifications, batch.id, batch.expiryDate)) return null;

  const productName = productNameById.get(batch.productId) ?? "Unknown product";
  const { category, message } = buildExpiryMessage(batch, productName, status, daysUntilExpiry);

  return {
    batchId: batch.id,
    productId: batch.productId,
    productName,
    status,
    daysUntilExpiry,
    category,
    message,
  };
}

/**
 * Runs a full expiry check across all inventory batches.
 *
 * Steps:
 * 1. Loads batches, products, and existing notifications using the
 *    existing `lib/db.ts` functions (no direct SQL here).
 * 2. Evaluates every batch via `checkBatch`.
 * 3. Creates a notification for each new finding via the existing
 *    `pushNotification` function.
 * 4. Returns a structured `ExpiryCheckSummary`.
 *
 * Transport-agnostic by design: this function takes no request/response
 * objects and has no knowledge of HTTP, cron, or UI, so the exact same
 * call can be reused by:
 * - a cron-triggered API route (e.g. `app/api/automation/expiry-check/route.ts`
 *   invoked on a schedule), and
 * - a manual "Run Inventory Check" button in the UI, which calls the same
 *   route on demand.
 *
 * Errors on individual batches are caught and collected rather than thrown,
 * so one bad record never aborts the rest of the scan. A failure loading
 * the initial data (e.g. database unreachable) is also caught and reported
 * in the summary rather than throwing, so callers always get a usable
 * result object.
 */
export async function runExpiryChecker(): Promise<ExpiryCheckSummary> {
  const summary: ExpiryCheckSummary = {
    totalBatchesChecked: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
    notificationsCreated: 0,
    skippedDuplicates: 0,
    skippedInvalidDate: 0,
    errors: [],
  };

  let batches: ProductBatch[];
  let products: Product[];
  let existingNotifications: NotificationItem[];

  try {
    [batches, products, existingNotifications] = await Promise.all([listBatches(), listProducts(), listNotifications()]);
  } catch (err) {
    summary.errors.push({
      batchId: "*",
      error: `Failed to load data for expiry check: ${err instanceof Error ? err.message : String(err)}`,
    });
    return summary;
  }

  const productNameById = new Map(products.map((p) => [p.id, p.name]));
  summary.totalBatchesChecked = batches.length;

  for (const batch of batches) {
    try {
      const result = checkBatch(batch, productNameById, existingNotifications);

      if (result === "invalid-date") {
        summary.skippedInvalidDate += 1;
        continue;
      }
      if (result === null) {
        summary.skippedDuplicates += 1;
        continue;
      }

      if (result.status === "expired") summary.expiredCount += 1;
      else summary.expiringSoonCount += 1;

      const created = await pushNotification({ category: result.category, message: result.message });
      // Keep the in-memory list updated so later batches in this same run
      // (e.g. a second batch of the same product) see it and don't duplicate.
      existingNotifications.push(created);
      summary.notificationsCreated += 1;

      // Email is best-effort: sendExpiredEmail/sendExpiringSoonEmail never
      // throw (see lib/email/mailer.ts), so a failed send can't interrupt
      // this run — it only logs internally.
      if (result.status === "expired") {
        await sendExpiredEmail({
          productName: result.productName,
          batchId: result.batchId,
          expiryDate: batch.expiryDate,
          daysExpired: Math.abs(result.daysUntilExpiry),
        });
        // Push is likewise best-effort and synchronous/never-throwing (see
        // lib/push/pushService.ts) — safe to call unconditionally.
        sendExpiredPush({
          productName: result.productName,
          batchId: result.batchId,
          daysExpired: Math.abs(result.daysUntilExpiry),
        });
      } else {
        await sendExpiringSoonEmail({
          productName: result.productName,
          batchId: result.batchId,
          expiryDate: batch.expiryDate,
          daysRemaining: result.daysUntilExpiry,
        });
        sendExpiringSoonPush({
          productName: result.productName,
          batchId: result.batchId,
          daysRemaining: result.daysUntilExpiry,
        });
      }
    } catch (err) {
      summary.errors.push({
        batchId: batch.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}