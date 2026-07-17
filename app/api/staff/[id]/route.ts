import { NextResponse } from "next/server";
import { deleteStaffMember } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteStaffMember(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/staff/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
