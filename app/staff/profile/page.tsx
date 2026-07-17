import { Topbar } from "@/components/topbar";
import { ProfileView } from "@/components/staff/profile-view";

export default function StaffProfilePage() {
  return (
    <>
      <Topbar title="Profile" />
      <main className="flex-1 p-4 md:p-6">
        <ProfileView />
      </main>
    </>
  );
}
