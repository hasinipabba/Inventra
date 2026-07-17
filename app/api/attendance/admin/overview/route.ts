import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getAdminOverview } from "@/lib/attendance-db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  if (session.role !== "Admin") {
    return NextResponse.json({ error: "Only admins can view attendance overview." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? undefined;
    const overview = await getAdminOverview(date);
    return NextResponse.json(overview);
  } catch (err) {
    console.error("GET /api/attendance/admin/overview failed:", err);
    return NextResponse.json({ error: "Couldn't load attendance overview. Please try again." }, { status: 500 });
  }
}
