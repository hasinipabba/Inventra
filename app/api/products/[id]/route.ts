import { NextResponse } from "next/server";
import { deleteProduct, updateProduct } from "@/lib/db";
import type { Product } from "@/lib/types";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as Product;
    const updated = await updateProduct(params.id, body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PUT /api/products/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteProduct(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/products/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
