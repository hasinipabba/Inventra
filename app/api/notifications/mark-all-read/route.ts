import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/db";

export async function POST() {
  try {
    return NextResponse.json(await markAllNotificationsRead());
  } catch (err) {
    console.error("POST /api/notifications/mark-all-read failed:", err);
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
  }
}
