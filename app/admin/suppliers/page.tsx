import { Topbar } from "@/components/topbar";
import { SuppliersView } from "@/components/suppliers/suppliers-view";

export default function SuppliersPage() {
  return (
    <>
      <Topbar title="Supplier Management" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <SuppliersView />
      </main>
    </>
  );
}
