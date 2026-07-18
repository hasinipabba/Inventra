"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGrid, ScanBarcode, Boxes as BoxesIcon, Bell, UserCircle, LogOut, ListChecks, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Store Staff only ever see these 8 items — no Reports, Analytics, AI
// Insights, Staff/User Management, Settings, Suppliers, Categories, or
// Warehouse Management, and no delete actions anywhere in this tree.
const NAV = [
  { href: "/staff/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/staff/tasks", label: "My Tasks", icon: ListChecks },
  { href: "/staff/attendance", label: "Attendance", icon: Clock },
  { href: "/staff/scan", label: "Barcode Scanner", icon: ScanBarcode },
  { href: "/staff/scan", label: "OCR Scanner", icon: ScanBarcode },
  { href: "/staff/inventory-update", label: "Inventory Update", icon: BoxesIcon },

  { href: "/staff/profile", label: "Profile", icon: UserCircle },
];

interface SessionUser {
  name: string;
  role: string;
}

export function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  const initials = user?.name
    ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "—";

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[var(--sidebar-bg)] md:flex">
      <div className="flex h-14 shrink-0 items-center gap-2 px-5">
        <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#2F81F7]">
          <BoxesIcon size={14} strokeWidth={2.5} className="text-white" />
        </div>
        <span className="text-[15px] font-semibold text-[var(--sidebar-active-text)]">Inventra</span>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto py-4">
        <div className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const base = href.split("?")[0];
            const active = pathname === base;
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "flex items-center gap-3 border-l-[3px] px-[13px] py-2.5 text-[13px] font-medium transition-colors duration-150",
                  active
                    ? "border-[#2F81F7] bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
                    : "border-transparent text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-hover-text)]"
                )}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2F81F7] text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-[var(--text)]">{user?.name ?? "Signed out"}</p>
            <p className="truncate text-[11px] text-[var(--text-3)]">{user?.role ?? "—"}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-3)] transition-colors hover:text-[var(--sidebar-hover-text)]"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
