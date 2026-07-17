import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { createLeaveRequest, findStaffByEmail, listLeaveRequests } from "@/lib/hr-store";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (session.role === "Admin") {
      return NextResponse.json(await listLeaveRequests());
    }
    const staff = await findStaffByEmail(session.email);
    if (!staff) return NextResponse.json([]);
    return NextResponse.json(await listLeaveRequests(staff.id));
  } catch (err) {
    console.error("GET /api/leave failed:", err);
    return NextResponse.json({ error: "Failed to load leave requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "Store Staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const staff = await findStaffByEmail(session.email);
    if (!staff) return NextResponse.json({ error: "No staff record linked to this account" }, { status: 400 });

    const body = await req.json();
    if (!body.fromDate || !body.toDate) {
      return NextResponse.json({ error: "fromDate and toDate are required" }, { status: 400 });
    }
    const created = await createLeaveRequest({
      staffId: staff.id,
      staffName: staff.name,
      fromDate: body.fromDate,
      toDate: body.toDate,
      reason: body.reason ?? "",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/leave failed:", err);
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }
}
