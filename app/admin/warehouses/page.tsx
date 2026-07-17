import { Topbar } from "@/components/topbar";
import { WarehousesView } from "@/components/warehouses/warehouses-view";

export default function WarehousesPage() {
  return (
    <>
      <Topbar title="Warehouse Management" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <WarehousesView />
      </main>
    </>
  );
}
