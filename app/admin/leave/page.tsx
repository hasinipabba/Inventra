import { Topbar } from "@/components/topbar";
import { AdminLeaveView } from "@/components/leave/admin-leave-view";

export default function AdminLeavePage() {
  return (
    <>
      <Topbar title="Leave Management" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <AdminLeaveView />
      </main>
    </>
  );
}
