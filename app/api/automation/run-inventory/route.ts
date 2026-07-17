import { NextResponse } from "next/server";
import { runInventoryAutomation } from "@/lib/automation/inventoryAutomation";

/**
 * POST /api/automation/run-inventory
 *
 * Thin transport wrapper only — all orchestration logic lives in
 * `lib/automation/inventoryAutomation.ts` (`runInventoryAutomation`), which
 * in turn only calls the three existing, already-implemented checkers:
 * `runExpiryChecker`, `runLowStockChecker`, `runPurchaseRequestAutomation`.
 *
 * Mirrors app/api/automation/expiry-check/route.ts,
 * app/api/automation/low-stock-check/route.ts, and
 * app/api/automation/purchase-request-check/route.ts. Designed to be called
 * from two places:
 * 1. A scheduled cron job (e.g. Vercel Cron hitting this single route on a
 *    schedule) to run the entire inventory automation pipeline at once.
 * 2. A manual "Run Inventory Check" button in the UI, which POSTs to this
 *    same route on demand.
 *
 * Both callers get the same `InventoryAutomationSummary` JSON response, so
 * there is exactly one code path to maintain.
 */
export async function POST() {
  try {
    const summary = await runInventoryAutomation();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("POST /api/automation/run-inventory failed:", err);
    return NextResponse.json({ error: "Inventory automation failed unexpectedly." }, { status: 500 });
  }
}