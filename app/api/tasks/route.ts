import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { createTask, listTasks } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId") ?? undefined;
    const warehouse = searchParams.get("warehouse") ?? undefined;
    return NextResponse.json(await listTasks({ staffId, warehouse }));
  } catch (err) {
    console.error("GET /api/tasks failed:", err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session || session.role !== "Admin") {
    return NextResponse.json({ error: "Only admins can create tasks" }, { status: 403 });
  }
  try {
    const body = await req.json();
    if (!body.title || !Array.isArray(body.assigneeIds) || body.assigneeIds.length === 0) {
      return NextResponse.json({ error: "Title and at least one assignee are required" }, { status: 400 });
    }
    const created = await createTask({
      title: body.title,
      description: body.description ?? "",
      category: body.category ?? "Custom",
      urgency: body.urgency ?? "medium",
      priority: body.priority ?? "normal",
      dueDate: body.dueDate ?? "",
      estimatedDuration: body.estimatedDuration ?? "",
      instructions: body.instructions ?? "",
      referenceImage: body.referenceImage ?? null,
      warehouse: body.warehouse ?? "",
      notes: body.notes ?? "",
      checklist: body.checklist ?? [],
      createdBy: session.name,
      assigneeIds: body.assigneeIds,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/tasks failed:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
