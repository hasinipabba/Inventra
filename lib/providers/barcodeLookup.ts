import type { BarcodeProvider, ExternalProductResult } from "./types";
import { fetchWithTimeout } from "./types";

/**
 * Barcode Lookup API (barcodelookup.com) — paid, key-gated fallback tried
 * after UPCitemdb. Broad general-retail coverage similar to UPCitemdb;
 * kept as a second opinion for barcodes UPCitemdb's free tier misses.
 * Disabled entirely (skipped, not attempted) unless BARCODE_LOOKUP_API_KEY
 * is set in .env.local.
 */
export const barcodeLookup: BarcodeProvider = {
  id: "barcodelookup",
  enabled: () => Boolean(process.env.BARCODE_LOOKUP_API_KEY),
  async lookup(barcode) {
    try {
      const key = process.env.BARCODE_LOOKUP_API_KEY;
      const url = `https://api.barcodelookup.com/v3/products?barcode=${encodeURIComponent(barcode)}&key=${key}`;

      const res = await fetchWithTimeout(url);
      if (res.status === 429) return { status: "rate_limited" };
      if (!res.ok) return { status: "error", message: `Barcode Lookup responded ${res.status}` };

      const data = await res.json();
      const item = data?.products?.[0];
      if (!item) return { status: "not_found" };

      const result: ExternalProductResult = {
        name: item.title || item.product_name || "",
        brand: item.brand || item.manufacturer || "",
        category: item.category || "",
        image: item.images?.[0] || "",
        description: item.description || "",
        packageSize: item.size || "",
        weight: item.weight || "",
        barcode,
        manufacturer: item.manufacturer || "",
        modelNumber: item.mpn || item.model || "",
        source: "barcodelookup",
      };
      if (!result.name) return { status: "not_found" };
      return { status: "found", result };
    } catch (err: any) {
      if (err?.name === "AbortError") return { status: "timeout" };
      return { status: "error", message: err?.message || "Barcode Lookup lookup failed" };
    }
  },
};
