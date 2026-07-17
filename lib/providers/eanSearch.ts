import type { BarcodeProvider, ExternalProductResult } from "./types";
import { fetchWithTimeout } from "./types";

/**
 * EAN-Search.org — last-resort, key-gated fallback, mainly useful for
 * European EAN-13 retail products the earlier providers missed. Disabled
 * entirely (skipped, not attempted) unless EAN_SEARCH_API_KEY is set.
 */
export const eanSearch: BarcodeProvider = {
  id: "eansearch",
  enabled: () => Boolean(process.env.EAN_SEARCH_API_KEY),
  async lookup(barcode) {
    try {
      const key = process.env.EAN_SEARCH_API_KEY;
      const url = `https://api.ean-search.org/api?token=${key}&op=barcode-lookup&ean=${encodeURIComponent(barcode)}&format=json`;

      const res = await fetchWithTimeout(url);
      if (res.status === 429) return { status: "rate_limited" };
      if (!res.ok) return { status: "error", message: `EAN-Search responded ${res.status}` };

      const data = await res.json();
      const item = Array.isArray(data) ? data[0] : null;
      if (!item || item.error) return { status: "not_found" };

      const result: ExternalProductResult = {
        name: item.name || "",
        brand: item.categoryName || "",
        category: item.categoryName || "",
        image: "",
        description: item.name || "",
        packageSize: "",
        weight: "",
        barcode,
        manufacturer: item.issuingCountry || "",
        modelNumber: "",
        source: "eansearch",
      };
      if (!result.name) return { status: "not_found" };
      return { status: "found", result };
    } catch (err: any) {
      if (err?.name === "AbortError") return { status: "timeout" };
      return { status: "error", message: err?.message || "EAN-Search lookup failed" };
    }
  },
};
