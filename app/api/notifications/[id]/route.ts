import { NextResponse } from "next/server";
import { updateNotification } from "@/lib/db";
import type { NotificationItem } from "@/lib/types";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as NotificationItem;
    const updated = await updateNotification(params.id, body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PUT /api/notifications/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
