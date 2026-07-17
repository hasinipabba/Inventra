import { Topbar } from "@/components/topbar";
import { StaffDashboardView } from "@/components/staff/staff-dashboard-view";

export default function StaffDashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6">
        <StaffDashboardView />
      </main>
    </>
  );
}
