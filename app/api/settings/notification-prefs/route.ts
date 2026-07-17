import { NextResponse } from "next/server";
import { getNotificationPrefs, setNotificationPrefs } from "@/lib/db";
import type { NotificationPrefs } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await getNotificationPrefs());
  } catch (err) {
    console.error("GET /api/settings/notification-prefs failed:", err);
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as NotificationPrefs;
    return NextResponse.json(await setNotificationPrefs(body));
  } catch (err) {
    console.error("PUT /api/settings/notification-prefs failed:", err);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
