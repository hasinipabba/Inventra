import { NextResponse } from "next/server";
import { deleteUser } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteUser(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/users/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
