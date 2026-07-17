import { NextResponse } from "next/server";
import { deleteSupplier } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteSupplier(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/suppliers/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}
