import { Topbar } from "@/components/topbar";
import { ProcurementView } from "@/components/procurement/procurement-view";

export default function ProcurementPage() {
  return (
    <>
      <Topbar title="Procurement" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <ProcurementView />
      </main>
    </>
  );
}
