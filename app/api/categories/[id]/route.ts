import { NextResponse } from "next/server";
import { deleteCategory } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteCategory(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/categories/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
