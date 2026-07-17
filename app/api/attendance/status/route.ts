import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getStaffForSession } from "@/lib/db";
import { getAttendanceSettings, getTodayForStaff } from "@/lib/attendance-db";
import { todayDateString } from "@/lib/attendance-utils";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

  try {
    const staff = await getStaffForSession(session);
    const date = todayDateString();
    const [record, settings] = await Promise.all([getTodayForStaff(staff.id, date), getAttendanceSettings()]);
    return NextResponse.json({ record, settings, date, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error("GET /api/attendance/status failed:", err);
    return NextResponse.json({ error: "Couldn't load today's attendance status. Please try again." }, { status: 500 });
  }
}
