import { Topbar } from "@/components/topbar";
import { InventoryUpdateView } from "@/components/staff/inventory-update-view";

export default function StaffInventoryUpdatePage() {
  return (
    <>
      <Topbar title="Inventory Update" />
      <main className="flex-1 p-4 md:p-6">
        <InventoryUpdateView />
      </main>
    </>
  );
}
