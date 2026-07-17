import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getAttendanceSettings, setAttendanceSettings } from "@/lib/attendance-db";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  try {
    return NextResponse.json(await getAttendanceSettings());
  } catch (err) {
    console.error("GET /api/attendance/settings failed:", err);
    return NextResponse.json({ error: "Couldn't load attendance settings." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  if (session.role !== "Admin") {
    return NextResponse.json({ error: "Only admins can change attendance settings." }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (typeof body.officeStartTime !== "string" || !TIME_RE.test(body.officeStartTime)) {
      return NextResponse.json({ error: "Office start time must be in HH:MM 24-hour format." }, { status: 400 });
    }
    const updated = await setAttendanceSettings({ officeStartTime: body.officeStartTime });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/attendance/settings failed:", err);
    return NextResponse.json({ error: "Couldn't save attendance settings. Please try again." }, { status: 500 });
  }
}
