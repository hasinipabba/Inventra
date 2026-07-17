import { NextResponse } from "next/server";
import { lookupProduct } from "@/lib/productLookup";

// Short-lived cache so re-scanning while filling out a form (or a flaky
// double-scan) doesn't hammer external APIs. Purely a performance cache —
// the database (via lookupProduct's checkDatabase step) is the real source
// of truth once a product is actually saved.
const cache = new Map<string, { at: number; payload: unknown }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get("barcode")?.trim();

  if (!barcode) {
    return NextResponse.json({ success: false, source: null, error: "Missing barcode query parameter" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9\-]{4,64}$/.test(barcode)) {
    return NextResponse.json({ success: false, source: null, error: "Barcode contains invalid characters" }, { status: 400 });
  }

  const cached = cache.get(barcode);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload);
  }

  try {
    const result = await lookupProduct(barcode);

    // Response shape: `success` and `source` are the fields requested for
    // this task. `status`/`product`/`provider` are kept alongside them,
    // unchanged from before, because components/products/scan-workflow.tsx
    // (the existing, working UI — out of scope to modify here) already
    // reads exactly those fields to decide which screen to show. This is
    // additive, not a breaking change to the response contract.
    if (result.success && result.product) {
      const payload = {
        success: true,
        source: result.source,
        product: result.product,
        status: result.source === "database" ? "database" : "external",
        provider: result.source === "database" ? undefined : result.source,
      };
      if (result.source !== "database") cache.set(barcode, { at: Date.now(), payload });
      return NextResponse.json(payload);
    }

    const payload = { success: false, source: null, status: "not_found", error: result.error || "No product found for this barcode in any source." };

    // Preserve the prior behavior: tell the UI *why* nothing came back so
    // it can show the right message, instead of a flat 404 for every case.
    const attempted = result.attempted ?? [];
    const rateLimited = attempted.some((a) => a.status === "rate_limited");
    const timedOut = attempted.length > 0 && attempted.every((a) => a.status === "timeout");

    if (rateLimited) {
      const rl = { ...payload, status: "rate_limited", error: "Product API rate limit reached. Try again shortly." };
      return NextResponse.json(rl, { status: 429 });
    }
    if (timedOut) {
      const to = { ...payload, status: "timeout", error: "Product lookup timed out. Check your connection and retry." };
      return NextResponse.json(to, { status: 504 });
    }

    cache.set(barcode, { at: Date.now(), payload });
    return NextResponse.json(payload, { status: 404 });
  } catch (err) {
    console.error("GET /api/scan/lookup failed:", err);
    return NextResponse.json({ success: false, source: null, status: "error", error: "Barcode lookup failed unexpectedly." }, { status: 500 });
  }
}
