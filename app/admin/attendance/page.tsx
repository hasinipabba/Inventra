import { Topbar } from "@/components/topbar";
import { getAdminOverview, getAttendanceSettings, listAttendanceAdmin } from "@/lib/attendance-db";
import { todayDateString } from "@/lib/attendance-utils";
import { AttendanceAdminView } from "@/components/attendance/attendance-admin-view";
import { AttendanceSettingsCard } from "@/components/attendance/attendance-settings-card";

export default async function AdminAttendancePage() {
  const today = todayDateString();
  const [overview, records, settings] = await Promise.all([
    getAdminOverview(today),
    listAttendanceAdmin({ from: today, to: today }),
    getAttendanceSettings(),
  ]);

  return (
    <>
      <Topbar title="Attendance" />
      <main className="animate-fade-in flex-1 space-y-5 p-4 md:p-6">
        <AttendanceSettingsCard initialOfficeStartTime={settings.officeStartTime} />
        <AttendanceAdminView initialOverview={overview} initialRecords={records} />
      </main>
    </>
  );
}
