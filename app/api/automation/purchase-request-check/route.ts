import { NextResponse } from "next/server";
import { runPurchaseRequestAutomation } from "@/lib/automation/purchaseRequestAutomation";

/**
 * POST /api/automation/purchase-request-check
 *
 * Thin transport wrapper only — all business logic lives in
 * `lib/automation/purchaseRequestAutomation.ts`
 * (`runPurchaseRequestAutomation`).
 *
 * Mirrors app/api/automation/expiry-check/route.ts and
 * app/api/automation/low-stock-check/route.ts. Designed to be called from
 * two places:
 * 1. A scheduled cron job (e.g. Vercel Cron hitting this route on a
 *    schedule) to run the automation automatically.
 * 2. A manual "Run Inventory Check" button in the UI, which POSTs to this
 *    same route on demand.
 *
 * Both callers get the same `PurchaseRequestAutomationSummary` JSON
 * response, so there is exactly one code path to maintain.
 */
export async function POST() {
  try {
    const summary = await runPurchaseRequestAutomation();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("POST /api/automation/purchase-request-check failed:", err);
    return NextResponse.json({ error: "Purchase request automation failed unexpectedly." }, { status: 500 });
  }
}