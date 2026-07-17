/**
 * Orchestrates the external-provider cascade, stopping at the first
 * "found". Order is deliberate:
 *
 *   1. openFoodFacts  — free, no key, excellent for food/grocery
 *   2. upcItemDb      — free-trial-capable, broad general-retail coverage;
 *                       this is what actually covers electronics, cosmetics,
 *                       personal care, cleaning products, stationery, toys,
 *                       household items, hardware, and industrial goods
 *   3. barcodeLookup   — paid fallback, only attempted if BARCODE_LOOKUP_API_KEY is set
 *   4. eanSearch       — last-resort fallback, only attempted if EAN_SEARCH_API_KEY is set
 *
 * Each provider self-enforces its own network timeout (see
 * fetchWithTimeout in lib/providers/types.ts) and never throws — a
 * timeout, rate limit, or network error all become a normal outcome value,
 * so this loop always continues to the next provider instead of the whole
 * lookup failing because one provider had a bad moment (requirement #10).
 */

import { openFoodFacts } from "./openFoodFacts";
import { upcItemDb } from "./upcitemdb";
import { barcodeLookup } from "./barcodeLookup";
import { eanSearch } from "./eanSearch";
import type { BarcodeProvider, ExternalProductResult, LookupOutcome } from "./types";

export type { ExternalProductResult, LookupOutcome, BarcodeProvider } from "./types";

const PROVIDERS: BarcodeProvider[] = [openFoodFacts, upcItemDb, barcodeLookup, eanSearch];

export async function lookupExternalProduct(
  barcode: string
): Promise<{ result: ExternalProductResult | null; attempted: { provider: string; outcome: LookupOutcome }[] }> {
  const attempted: { provider: string; outcome: LookupOutcome }[] = [];

  for (const provider of PROVIDERS) {
    if (!provider.enabled()) continue; // key-gated providers are skipped, not attempted, when unconfigured
    const outcome = await provider.lookup(barcode);
    attempted.push({ provider: provider.id, outcome });
    if (outcome.status === "found") {
      return { result: outcome.result, attempted };
    }
    // any other outcome (not_found / rate_limited / timeout / error) — fall through to the next provider
  }

  return { result: null, attempted };
}
