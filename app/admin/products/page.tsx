import { Topbar } from "@/components/topbar";
import { ProductsTable } from "@/components/products/products-table";

export default function ProductsPage() {
  return (
    <>
      <Topbar title="Product Management" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <ProductsTable />
      </main>
    </>
  );
}
