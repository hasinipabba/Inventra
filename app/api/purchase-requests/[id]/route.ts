import { NextResponse } from "next/server";
import { pushNotification, updatePurchaseRequest } from "@/lib/db";
import type { PurchaseRequest } from "@/lib/types";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as PurchaseRequest;
    const updated = await updatePurchaseRequest(params.id, body);
    if (updated.status === "approved" || updated.status === "rejected") {
      await pushNotification({
        category: "Purchase Request",
        message: `Request for ${updated.quantity}× ${updated.product} was ${updated.status}.`,
      });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PUT /api/purchase-requests/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update purchase request" }, { status: 500 });
  }
}
