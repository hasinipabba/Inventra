import { NextResponse } from "next/server";
import { seedRetailMasterCatalog } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const seeded = await seedRetailMasterCatalog();
    return NextResponse.json({ success: true, seeded });
  } catch (err: any) {
    console.error("POST /api/products/seed-retail error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to seed retail catalog" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const seeded = await seedRetailMasterCatalog();
    return NextResponse.json({ success: true, seeded });
  } catch (err: any) {
    console.error("GET /api/products/seed-retail error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to seed retail catalog" }, { status: 500 });
  }
}
