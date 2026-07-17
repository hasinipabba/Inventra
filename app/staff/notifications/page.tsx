import { Topbar } from "@/components/topbar";
import { NotificationsView } from "@/components/notifications/notifications-view";

export default function StaffNotificationsPage() {
  return (
    <>
      <Topbar title="Notifications" />
      <main className="flex-1 p-4 md:p-6">
        <NotificationsView />
      </main>
    </>
  );
}
