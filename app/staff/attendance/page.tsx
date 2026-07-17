import { cookies } from "next/headers";
import { Topbar } from "@/components/topbar";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { getStaffForSession } from "@/lib/db";
import { getTodayForStaff, listAttendanceForStaff } from "@/lib/attendance-db";
import { todayDateString } from "@/lib/attendance-utils";
import { StaffAttendanceView } from "@/components/staff/attendance-view";

export default async function StaffAttendancePage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;

  const staff = await getStaffForSession(session);
  const date = todayDateString();
  const [record, history] = await Promise.all([
    getTodayForStaff(staff.id, date),
    listAttendanceForStaff(staff.id, { month: date.slice(0, 7) }),
  ]);

  return (
    <>
      <Topbar title="Attendance" />
      <main className="flex-1 p-4 md:p-6">
        <StaffAttendanceView initialRecord={record} initialHistory={history} />
      </main>
    </>
  );
}
