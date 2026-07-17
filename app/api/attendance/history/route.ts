import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getStaffForSession } from "@/lib/db";
import { listAttendanceForStaff } from "@/lib/attendance-db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

  try {
    const staff = await getStaffForSession(session);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const month = searchParams.get("month") ?? undefined;
    const records = await listAttendanceForStaff(staff.id, { from, to, month });
    return NextResponse.json(records);
  } catch (err) {
    console.error("GET /api/attendance/history failed:", err);
    return NextResponse.json({ error: "Couldn't load your attendance history. Please try again." }, { status: 500 });
  }
}
