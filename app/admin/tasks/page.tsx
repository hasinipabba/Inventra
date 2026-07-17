import { Topbar } from "@/components/topbar";
import { listStaff, listTasks } from "@/lib/db";
import { warehouses } from "@/lib/mock-data";
import { TasksAdminView } from "@/components/tasks/tasks-admin-view";

export default async function AdminTasksPage() {
  const [tasks, staff] = await Promise.all([listTasks(), listStaff()]);
  return (
    <>
      <Topbar title="Task Assignment" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <TasksAdminView initialTasks={tasks} staff={staff} warehouses={warehouses.map((w) => w.name)} />
      </main>
    </>
  );
}
