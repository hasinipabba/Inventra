import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { deleteTask, getStaffForSession, listTasks, updateTask } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const body = await req.json();
    // "overdue" is derived at read time, never something a client sets directly.
    if (body.status === "overdue") delete body.status;

    if (session.role === "Admin") {
      const updated = await updateTask(params.id, { ...body, actor: session.name });
      return NextResponse.json(updated);
    }

    // Store Staff: only allowed to work the task assigned to them —
    // never reassign, retitle, reprioritize, or edit admin-only fields.
    const staff = await getStaffForSession(session);
    const own = await listTasks({ staffId: staff.id });
    if (!own.some((t) => t.id === params.id)) {
      return NextResponse.json({ error: "This task isn't assigned to you" }, { status: 403 });
    }
    const allowed: Record<string, unknown> = {};
    for (const key of ["status", "progress", "checklist", "notes", "completionImages", "activityNote"]) {
      if (key in body) allowed[key] = body[key];
    }
    const updated = await updateTask(params.id, { ...allowed, actor: staff.name });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PATCH /api/tasks/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session || session.role !== "Admin") {
    return NextResponse.json({ error: "Only admins can delete tasks" }, { status: 403 });
  }
  try {
    await deleteTask(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/tasks/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
