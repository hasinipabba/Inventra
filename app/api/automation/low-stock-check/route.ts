import { NextResponse } from "next/server";
import { runLowStockChecker } from "@/lib/notifications/lowStockChecker";

/**
 * POST /api/automation/low-stock-check
 *
 * Thin transport wrapper only — all business logic lives in
 * `lib/notifications/lowStockChecker.ts` (`runLowStockChecker`).
 *
 * Mirrors app/api/automation/expiry-check/route.ts. Designed to be called
 * from two places:
 * 1. A scheduled cron job (e.g. Vercel Cron hitting this route on a
 *    schedule) to run the check automatically.
 * 2. A manual "Run Inventory Check" button in the UI, which POSTs to this
 *    same route on demand.
 *
 * Both callers get the same `LowStockCheckSummary` JSON response, so there
 * is exactly one code path to maintain.
 */
export async function POST() {
  try {
    const summary = await runLowStockChecker();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("POST /api/automation/low-stock-check failed:", err);
    return NextResponse.json({ error: "Low stock check failed unexpectedly." }, { status: 500 });
  }
}