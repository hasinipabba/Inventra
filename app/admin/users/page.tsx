import { Topbar } from "@/components/topbar";
import { UsersView } from "@/components/users/users-view";

export default function UsersPage() {
  return (
    <>
      <Topbar title="User Management" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <UsersView />
      </main>
    </>
  );
}
