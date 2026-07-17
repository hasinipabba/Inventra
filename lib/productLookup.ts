/**
 * lib/productLookup.ts
 *
 * The single place all barcode-to-product resolution happens. Called from
 * app/api/scan/lookup/route.ts — the backend that the scanner's
 * onDetected(barcode) callback hits (see components/products/scan-workflow.tsx).
 *
 * Pipeline:
 *   checkDatabase()
 *     -> checkExternalProviders()   (OpenFoodFacts, then UPCitemdb, then any
 *                                    other enabled provider, in that order)
 *     -> saveIfFound()              (insert new, or update-in-place if this
 *                                    barcode already exists — never a
 *                                    duplicate row)
 *     -> returnProduct()
 *
 * This does NOT reimplement the OpenFoodFacts/UPCitemdb HTTP calls — those
 * already exist, working and tested, in lib/providers/ (with
 * timeouts, rate-limit detection, and two additional optional providers).
 * Reusing that module instead of duplicating its logic here is deliberate:
 * one place owns "how do we talk to external barcode APIs", this file owns
 * "what do we do with the answer".
 */

import { findProductByBarcode, upsertProductByBarcode } from "./db";
import { lookupExternalProduct, type ExternalProductResult } from "./providers";
import type { Product } from "./types";

export type ProductLookupSource = "database" | ExternalProductResult["source"] | null;

export interface ProductLookupResult {
  success: boolean;
  source: ProductLookupSource;
  product: Product | null;
  /** Only set when success is false — lets the caller distinguish "genuinely not found anywhere" from a transient provider failure. */
  error?: string;
  /** Diagnostic detail on what each external provider returned — used by
   * the route to pick the right HTTP status (e.g. 429 vs 404), not part of
   * the required {success, source} contract itself. */
  attempted?: { provider: string; status: string }[];
}

/** Builds a brand-new product row from a freshly-found external result. Operational fields (stock, warehouse, batch, expiry...) start blank/zero — they get filled in later, either by a human via the scan-workflow review form, or by a future stock-update/receiving action. */
function toNewProduct(barcode: string, ext: ExternalProductResult): Product {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: ext.name,
    sku: `SKU-${barcode}`,
    barcode,
    category: ext.category || "Uncategorized",
    brand: ext.brand,
    batch: "",
    supplier: "",
    warehouse: "",
    shelf: "",
    stock: 0,
    minStock: 0,
    maxStock: 0,
    unit: "pcs",
    mfgDate: "",
    expiryDate: "",
    lastRestocked: "",
    lastUpdated: today,
    healthScore: 0,
    status: "out",
    image: ext.image,
    description: ext.description,
    packageSize: ext.packageSize,
    weight: ext.weight,
    manufacturer: ext.manufacturer,
    modelNumber: ext.modelNumber,
    source: ext.source,
  };
}

/**
 * Step 1: checkDatabase(). This is what makes every scan after the first
 * one instant and free — no external API call at all once a barcode has
 * been seen before.
 */
async function checkDatabase(barcode: string): Promise<Product | null> {
  return findProductByBarcode(barcode);
}

/**
 * Steps 2-3: checkOpenFoodFacts() -> checkUPCitemDB(). Delegates to the
 * existing provider cascade in lib/providers/, which already
 * tries OpenFoodFacts first and UPCitemdb second (both required by this
 * task), then falls through to two additional optional providers
 * (Barcode Lookup, EAN-Search) if their API keys are configured — a
 * superset of what was asked for, kept because it's already working and
 * only makes lookups more likely to succeed, never less.
 */
async function checkExternalProviders(barcode: string): Promise<{ result: ExternalProductResult | null; attempted: { provider: string; status: string }[] }> {
  const { result, attempted } = await lookupExternalProduct(barcode);
  return { result, attempted: attempted.map((a) => ({ provider: a.provider, status: a.outcome.status })) };
}

/**
 * Step 4: saveIfFound(). Delegates the actual "no duplicates" rule to
 * upsertProductByBarcode() in lib/db.ts — the same function the manual
 * "Save Product" step now also uses, so a barcode discovered here and then
 * completed by a human later updates one row, never creates two.
 */
async function saveIfFound(barcode: string, ext: ExternalProductResult): Promise<Product> {
  const draft = toNewProduct(barcode, ext);
  return upsertProductByBarcode(draft);
}

/**
 * The full pipeline. This is the only function other code should call.
 */
export async function lookupProduct(barcode: string): Promise<ProductLookupResult> {
  const normalized = barcode.trim();
  if (!normalized) {
    return { success: false, source: null, product: null, error: "Empty barcode." };
  }

  // 1. checkDatabase()
  const existing = await checkDatabase(normalized);
  if (existing) {
    return { success: true, source: "database", product: existing };
  }

  // 2-3. checkOpenFoodFacts() -> checkUPCitemDB() (-> optional extra providers)
  const { result: external, attempted } = await checkExternalProviders(normalized);
  if (!external) {
    return { success: false, source: null, product: null, error: "No product found for this barcode in any source.", attempted };
  }

  // 4. saveIfFound() — insert or update-in-place, never duplicate.
  const saved = await saveIfFound(normalized, external);

  // 5. returnProduct()
  return { success: true, source: external.source, product: saved };
}
