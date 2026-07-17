import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { StaffSidebar } from "@/components/staff/staff-sidebar";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) redirect("/login");
  if (session.role !== "Store Staff") redirect("/admin/dashboard");

  return (
    <div className="flex min-h-screen bg-bg">
      <StaffSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
