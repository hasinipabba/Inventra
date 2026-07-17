/**
 * Shared types + fetch helper for every external barcode/product lookup
 * provider. IMPORTANT: everything under lib/providers/** only ever runs on
 * the server (imported from route handlers / lib/productLookup.ts). API
 * keys are read from process.env and never sent to the browser.
 */

export interface ExternalProductResult {
  name: string;
  brand: string;
  category: string;
  image: string;
  description: string;
  packageSize: string;
  weight: string;
  barcode: string;
  manufacturer: string;
  modelNumber: string;
  source: "openfoodfacts" | "upcitemdb" | "barcodelookup" | "eansearch";
}

export type LookupOutcome =
  | { status: "found"; result: ExternalProductResult }
  | { status: "not_found" }
  | { status: "rate_limited" }
  | { status: "timeout" }
  | { status: "error"; message: string };

export interface BarcodeProvider {
  id: ExternalProductResult["source"];
  enabled(): boolean;
  lookup(barcode: string): Promise<LookupOutcome>;
}

const DEFAULT_TIMEOUT_MS = 6000;

/** Every provider uses this for its actual network call — this is what
 * enforces "continue to the next provider on timeout" (requirement #10):
 * the fetch aborts at DEFAULT_TIMEOUT_MS, the provider's own catch block
 * turns that into a {status:"timeout"} outcome, and the orchestrator in
 * lib/providers/index.ts just moves on to the next provider in the list. */
export function fetchWithTimeout(url: string, init: RequestInit = {}, ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
