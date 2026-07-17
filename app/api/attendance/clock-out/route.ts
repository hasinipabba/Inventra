import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getStaffForSession } from "@/lib/db";
import { clockOut } from "@/lib/attendance-db";
import { AttendanceError } from "@/lib/attendance-types";
import { todayDateString } from "@/lib/attendance-utils";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

  try {
    const staff = await getStaffForSession(session);
    const date = todayDateString();
    const record = await clockOut(staff.id, date, new Date().toISOString());
    return NextResponse.json(record);
  } catch (err) {
    if (err instanceof AttendanceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("POST /api/attendance/clock-out failed:", err);
    return NextResponse.json({ error: "Couldn't clock you out right now. Please try again." }, { status: 500 });
  }
}
