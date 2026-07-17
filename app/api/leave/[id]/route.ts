import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { updateLeaveStatus } from "@/lib/hr-store";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session || session.role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.status || !["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }
    const updated = await updateLeaveStatus(params.id, body.status);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PATCH /api/leave/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}
