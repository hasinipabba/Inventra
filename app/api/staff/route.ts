import { NextResponse } from "next/server";
import { createStaffMember, listStaff, pushNotification } from "@/lib/db";
import type { StaffMember } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listStaff());
  } catch (err) {
    console.error("GET /api/staff failed:", err);
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StaffMember;
    if (!body.id) body.id = `st-${Date.now()}`;
    const created = await createStaffMember(body);
    await pushNotification({ category: "Warehouse", message: `${created.name} was added to ${created.department} as ${created.role}.` });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/staff failed:", err);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
