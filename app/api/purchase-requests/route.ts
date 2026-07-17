import { NextResponse } from "next/server";
import { listPurchaseRequests } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listPurchaseRequests());
  } catch (err) {
    console.error("GET /api/purchase-requests failed:", err);
    return NextResponse.json({ error: "Failed to load purchase requests" }, { status: 500 });
  }
}
