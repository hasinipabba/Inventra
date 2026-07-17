import { NextRequest, NextResponse } from "next/server";
import {runInventoryAutomation } from "@/lib/automation/inventoryAutomation";
import { broadcastPush } from "@/lib/push/pushService";

/**
 * GET /api/cron
 *
 * Thin transport wrapper only — all business logic (Expiry Checker, Low
 * Stock Checker, Purchase Request Automation, and their orchestration)
 * lives in `lib/automation/inventoryAutomation.ts` (`runInventoryAutomation`).
 * This route does not implement, duplicate, or re-shape any of that logic —
 * it authenticates the request, calls the one existing entry point, logs
 * the outcome, and returns an HTTP response.
 *
 * Intended to be called by Vercel Cron (see vercel.json), which issues a
 * GET request to this path on the configured schedule. Vercel automatically
 * attaches `Authorization: Bearer <CRON_SECRET>` when it invokes this route,
 * if the CRON_SECRET environment variable is set on the project — the check
 * below verifies that header. If CRON_SECRET is unset (e.g. local
 * development), the check is skipped so local testing isn't blocked.
 *
 * This same route can also be hit manually (browser, curl, Invoke-RestMethod)
 * for testing — see the accompanying explanation for exact commands.
 */
export async function GET(request: NextRequest) {
  // --- Auth: verify Vercel Cron's bearer token, when configured. ---
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[cron] Rejected request: missing or invalid Authorization header.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[cron] CRON_SECRET is not set — running without request authentication. Set it before deploying.");
  }

  console.log(`[cron] Inventory automation started at ${new Date().toISOString()}`);
  
  try {
    const summary = await runInventoryAutomation();

    const totalErrors =
      summary.expiry.errors.length + summary.lowStock.errors.length + summary.purchaseRequests.errors.length;

    console.log(`[cron] Inventory automation finished at ${summary.finishedAt} (duration: ${summary.durationMs}ms)`);
    if (totalErrors > 0) {
      console.error(`[cron] Inventory automation completed with ${totalErrors} recorded error(s):`, {
        expiryErrors: summary.expiry.errors,
        lowStockErrors: summary.lowStock.errors,
        purchaseRequestErrors: summary.purchaseRequests.errors,
      });
    } else {
      console.log("[cron] Inventory automation completed with no errors.");
      
    }

    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    // runInventoryAutomation() already catches errors from each checker
    // internally (see lib/automation/inventoryAutomation.ts's runSafely),
    // so reaching this block means something unexpected failed outside
    // that protection (e.g. a crash before a summary could be built).
    console.error("[cron] Inventory automation failed unexpectedly:", err);
    
    
    return NextResponse.json(
      { error: "Inventory automation failed unexpectedly.", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}