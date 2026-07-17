import { NextResponse } from "next/server";
import { createSupplier, listSuppliers } from "@/lib/db";
import type { Supplier } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listSuppliers());
  } catch (err) {
    console.error("GET /api/suppliers failed:", err);
    return NextResponse.json({ error: "Failed to load suppliers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Supplier;
    if (!body.id) body.id = `sup-${Date.now()}`;
    const created = await createSupplier(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/suppliers failed:", err);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
