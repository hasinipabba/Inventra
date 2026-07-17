import type { BarcodeProvider, ExternalProductResult } from "./types";
import { fetchWithTimeout } from "./types";

/**
 * Open Food Facts — free, no API key required. Excellent coverage for
 * food/grocery products specifically; essentially no coverage for
 * non-food categories (electronics, cosmetics, hardware, etc.), which is
 * exactly why it's tried FIRST but not RELIED ON ALONE — see
 * lib/providers/index.ts for the fallback chain that covers the rest.
 */
export const openFoodFacts: BarcodeProvider = {
  id: "openfoodfacts",
  enabled: () => true,
  async lookup(barcode) {
    try {
      const res = await fetchWithTimeout(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
        headers: { "User-Agent": "Inventra-WMS/1.0 (inventory-management)" },
      });
      if (res.status === 429) return { status: "rate_limited" };
      if (!res.ok) return { status: "error", message: `Open Food Facts responded ${res.status}` };

      const data = await res.json();
      if (data.status !== 1 || !data.product) return { status: "not_found" };

      const p = data.product;
      const result: ExternalProductResult = {
        name: p.product_name || p.generic_name || "",
        brand: (p.brands || "").split(",")[0]?.trim() || "",
        category: (p.categories || "").split(",")[0]?.trim() || "",
        image: p.image_front_url || p.image_url || "",
        description: p.generic_name_en || p.generic_name || "",
        packageSize: p.quantity || "",
        weight: p.product_quantity ? `${p.product_quantity}${p.product_quantity_unit || "g"}` : "",
        barcode,
        manufacturer: p.manufacturing_places || (p.brands || "").split(",")[0]?.trim() || "",
        modelNumber: "", // no equivalent concept for food products
        source: "openfoodfacts",
      };
      if (!result.name) return { status: "not_found" };
      return { status: "found", result };
    } catch (err: any) {
      if (err?.name === "AbortError") return { status: "timeout" };
      return { status: "error", message: err?.message || "Open Food Facts lookup failed" };
    }
  },
};
