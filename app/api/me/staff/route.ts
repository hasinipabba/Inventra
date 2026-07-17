import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { findStaffByEmail } from "@/lib/hr-store";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ staff: null }, { status: 401 });

  const staff = await findStaffByEmail(session.email);
  return NextResponse.json({ staff });
}
