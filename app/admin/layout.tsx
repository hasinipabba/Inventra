import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import dynamic from "next/dynamic";

const AIAssistant = dynamic(
  () => import("@/components/ai-assistant").then((m) => ({ default: m.AIAssistant })),
  { ssr: false, loading: () => null }
);
const PushListener = dynamic(
  () => import("@/components/push/PushListener").then((m) => ({ default: m.PushListener })),
  { ssr: false, loading: () => null }
);

// Defense in depth: middleware.ts already blocks non-Admins from reaching
// /admin/*, but this server-side check runs again here so the Admin-only
// layout (and everything it renders) never mounts for the wrong role, even
// if middleware is ever bypassed, misconfigured, or skipped by a cache.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) redirect("/login");
  if (session.role !== "Admin") redirect("/staff/dashboard");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="page-loading flex min-w-0 flex-1 flex-col scroll-smooth">{children}</div>
      <AIAssistant />
      <PushListener />
    </div>
  );
}
