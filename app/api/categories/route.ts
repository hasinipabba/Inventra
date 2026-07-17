import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/db";
import type { Category } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listCategories());
  } catch (err) {
    console.error("GET /api/categories failed:", err);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Category;
    if (!body.id) {
      body.id = `cat-${Date.now()}`;
    }
    const created = await createCategory(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/categories failed:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
