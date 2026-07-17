import { NextResponse } from "next/server";
import { runExpiryChecker } from "@/lib/notifications/expiryChecker";

/**
 * POST /api/automation/expiry-check
 *
 * Thin transport wrapper only — all business logic lives in
 * `lib/notifications/expiryChecker.ts` (`runExpiryChecker`).
 *
 * Designed to be called from two places:
 * 1. A scheduled cron job (e.g. Vercel Cron hitting this route on a
 *    schedule) to run the check automatically.
 * 2. A manual "Run Inventory Check" button in the UI, which POSTs to this
 *    same route on demand.
 *
 * Both callers get the same `ExpiryCheckSummary` JSON response, so there is
 * exactly one code path to maintain.
 */
export async function POST() {
  try {
    const summary = await runExpiryChecker();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("POST /api/automation/expiry-check failed:", err);
    return NextResponse.json({ error: "Expiry check failed unexpectedly." }, { status: 500 });
  }
}
