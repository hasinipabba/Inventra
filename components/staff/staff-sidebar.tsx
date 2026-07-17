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
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BoxesIcon size={16} strokeWidth={2.5} />
        </div>
        <span className="font-display text-[15px] font-semibold tracking-tight">Inventra</span>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const base = href.split("?")[0];
          const active = pathname === base;
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface2 hover:text-text"
              )}
            >
              {active && <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-primary" />}
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user?.name ?? "Signed out"}</p>
            <p className="truncate text-[11px] text-muted">{user?.role ?? "—"}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface2 hover:text-out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
