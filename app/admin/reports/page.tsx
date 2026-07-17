import { Topbar } from "@/components/topbar";
import { ReportsView } from "@/components/reports/reports-view";

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Reports" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <ReportsView />
      </main>
    </>
  );
}
