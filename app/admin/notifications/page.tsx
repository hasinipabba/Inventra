import { Topbar } from "@/components/topbar";
import { NotificationsView } from "./notifications-view";

export default function NotificationsPage() {
  return (
    <>
      <Topbar title="Notification Center" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <NotificationsView />
      </main>
    </>
  );
}
