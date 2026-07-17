import { Topbar } from "@/components/topbar";
import { CategoriesView } from "@/components/categories/categories-view";

export default function CategoriesPage() {
  return (
    <>
      <Topbar title="Category Management" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <CategoriesView />
      </main>
    </>
  );
}
