import type { BarcodeProvider, ExternalProductResult } from "./types";
import { fetchWithTimeout } from "./types";

/**
 * UPCitemdb — the provider that actually closes the "non-food products
 * fail" gap. Broad general-retail coverage: electronics, mobile
 * accessories, cosmetics, personal care, cleaning products, stationery,
 * toys, household items, hardware, industrial goods. Works on the free
 * trial endpoint with no key (rate-limited); set UPCITEMDB_API_KEY in
 * .env.local to use the paid tier instead.
 */
export const upcItemDb: BarcodeProvider = {
  id: "upcitemdb",
  enabled: () => true,
  async lookup(barcode) {
    try {
      const apiKey = process.env.UPCITEMDB_API_KEY;
      const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`;
      const headers: Record<string, string> = { Accept: "application/json" };
      if (apiKey) {
        headers["user_key"] = apiKey;
        headers["key_type"] = "3scale";
      }

      const res = await fetchWithTimeout(url, { headers });
      if (res.status === 429) return { status: "rate_limited" };
      if (!res.ok) return { status: "error", message: `UPCitemdb responded ${res.status}` };

      const data = await res.json();
      const item = data?.items?.[0];
      if (!item) return { status: "not_found" };

      const result: ExternalProductResult = {
        name: item.title || "",
        brand: item.brand || "",
        category: item.category || "",
        image: item.images?.[0] || "",
        description: item.description || "",
        packageSize: item.size || "",
        weight: item.weight || "",
        barcode,
        manufacturer: item.manufacturer || item.brand || "",
        modelNumber: item.model || "",
        source: "upcitemdb",
      };
      if (!result.name) return { status: "not_found" };
      return { status: "found", result };
    } catch (err: any) {
      if (err?.name === "AbortError") return { status: "timeout" };
      return { status: "error", message: err?.message || "UPCitemdb lookup failed" };
    }
  },
};
