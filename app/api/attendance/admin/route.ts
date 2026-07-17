import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { listAttendanceAdmin } from "@/lib/attendance-db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  if (session.role !== "Admin") {
    return NextResponse.json({ error: "Only admins can view all staff attendance." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const records = await listAttendanceAdmin({ from, to, search });
    return NextResponse.json(records);
  } catch (err) {
    console.error("GET /api/attendance/admin failed:", err);
    return NextResponse.json({ error: "Couldn't load attendance records. Please try again." }, { status: 500 });
  }
}
