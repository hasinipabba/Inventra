import { NextResponse } from "next/server";
import { listProducts, pushNotification, findProductByBarcode, upsertProductByBarcode } from "@/lib/db";
import type { Product } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listProducts());
  } catch (err) {
    console.error("GET /api/products failed:", err);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Product;
    if (!body.id) {
      body.id = `prod-${Date.now()}`;
    }

    // Upsert-by-barcode, not a blind insert: if lib/productLookup.ts already
    // auto-saved a bare catalog row for this barcode during the scan step,
    // this fills in the operational details (warehouse, batch, stock,
    // expiry...) onto that SAME row instead of creating a second one for
    // the same physical product.
    const existedBefore = body.barcode ? await findProductByBarcode(body.barcode) : null;
    const saved = await upsertProductByBarcode(body);

    if (saved.stock <= 0) {
      await pushNotification({ category: "Out of Stock", message: `${saved.name} is out of stock at ${saved.warehouse || "its warehouse"}.` });
    } else if (saved.stock <= saved.minStock) {
      await pushNotification({ category: "Low Stock", message: `${saved.name} is running low (${saved.stock} left, min ${saved.minStock}).` });
    }
    return NextResponse.json(saved, { status: existedBefore ? 200 : 201 });
  } catch (err) {
    console.error("POST /api/products failed:", err);
    return NextResponse.json({ error: "Failed to save product" }, { status: 500 });
  }
}
