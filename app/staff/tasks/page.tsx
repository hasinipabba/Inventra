import { cookies } from "next/headers";
import { Topbar } from "@/components/topbar";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getStaffForSession, listTasks } from "@/lib/db";
import { StaffTasksView } from "@/components/staff/tasks-view";

export default async function StaffTasksPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;

  const staff = await getStaffForSession(session);
  const tasks = await listTasks({ staffId: staff.id });

  return (
    <>
      <Topbar title="My Tasks" />
      <main className="flex-1 p-4 md:p-6">
        <StaffTasksView initialTasks={tasks} staffName={staff.name} staffId={staff.id} />
      </main>
    </>
  );
}
