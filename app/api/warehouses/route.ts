import { NextResponse } from "next/server";
import { getWarehouses, createWarehouse } from "@/lib/db";
import type { Warehouse } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await getWarehouses());
  } catch (err) {
    console.error("GET /api/warehouses failed:", err);
    return NextResponse.json({ error: "Failed to load warehouses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Warehouse>;
    const created = await createWarehouse({
      id: body.id ?? `wh-${Date.now()}`,
      name: body.name ?? "",
      location: body.location ?? "",
      capacity: body.capacity ?? 0,
      manager: body.manager ?? "",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/warehouses failed:", err);
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}
