import { NextResponse } from "next/server";
import { listNotifications } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listNotifications());
  } catch (err) {
    console.error("GET /api/notifications failed:", err);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
