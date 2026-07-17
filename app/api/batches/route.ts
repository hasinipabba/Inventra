import { NextResponse } from "next/server";
import { createBatch, listBatches, findProductByBarcode } from "@/lib/db";
import type { ProductBatch } from "@/lib/types";

function sanitize(str: unknown): string {
  return typeof str === "string" ? str.trim().slice(0, 500) : "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") || undefined;
    return NextResponse.json(await listBatches(productId));
  } catch (err) {
    console.error("GET /api/batches failed:", err);
    return NextResponse.json({ error: "Failed to load batches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.productId || !body.barcode) {
      return NextResponse.json({ error: "productId and barcode are required" }, { status: 400 });
    }
    const product = await findProductByBarcode(body.barcode);
    if (!product) {
      return NextResponse.json({ error: "No matching product for this barcode" }, { status: 404 });
    }
    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
    }

    const batch: ProductBatch = {
      id: `batch-${Date.now()}`,
      productId: product.id,
      barcode: sanitize(body.barcode),
      batchNumber: sanitize(body.batchNumber),
      lotNumber: sanitize(body.lotNumber),
      quantity,
      mfgDate: sanitize(body.mfgDate),
      expiryDate: sanitize(body.expiryDate),
      mrp: sanitize(body.mrp),
      netWeight: sanitize(body.netWeight),
      warehouse: sanitize(body.warehouse),
      scannedBy: sanitize(body.scannedBy) || "Unknown user",
      scannedAt: new Date().toISOString(),
      ocrConfidence: body.ocrConfidence,
    };
    const created = await createBatch(batch);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/batches failed:", err);
    return NextResponse.json({ error: "Failed to save batch" }, { status: 500 });
  }
}
