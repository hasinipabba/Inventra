import { NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/db";
import type { AppUser } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listUsers());
  } catch (err) {
    console.error("GET /api/users failed:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AppUser;
    if (!body.id) body.id = `u-${Date.now()}`;
    const created = await createUser(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/users failed:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
