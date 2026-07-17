"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Package,
  Tags,
  Warehouse,
  Truck,
  Users,
  BarChart3,
  ClipboardList,
  FileText,
  Sparkles,
  Bell,
  Settings,
  Boxes,
  ScanBarcode,
  UserCog,
  LogOut,
  CalendarClock,
  ListChecks,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Admin has full access to every feature — this sidebar is only ever
// rendered inside app/admin/layout.tsx, which is itself gated to the
// "Admin" role by middleware + a server-side check.
type NavItem = { href: string; label: string; icon: React.ElementType };

const GROUPS: { label: string; prefixes: string[]; items: NavItem[] }[] = [
  {
    label: "Inventory",
    prefixes: [
      "/admin/products",
      "/admin/categories",
      "/admin/warehouses",
      "/admin/suppliers",
      "/admin/procurement",
      "/admin/scan",
    ],
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: Tags },
      { href: "/admin/warehouses", label: "Warehouses", icon: Warehouse },
      { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
      { href: "/admin/procurement", label: "Purchase Requests", icon: ClipboardList },
      { href: "/admin/scan", label: "Barcode / OCR / AI Scanner", icon: ScanBarcode },
    ],
  },
  {
    label: "Staff",
    prefixes: [
      "/admin/staff",
      "/admin/tasks",
      "/admin/attendance",
      "/admin/leave",
      "/admin/users",
    ],
    items: [
      { href: "/admin/staff", label: "Staff", icon: UserCog },
      { href: "/admin/tasks", label: "Task Management", icon: ListChecks },
      { href: "/admin/attendance", label: "Attendance", icon: Clock },
      { href: "/admin/leave", label: "Leave Management", icon: CalendarClock },
      { href: "/admin/users", label: "Users", icon: Users },
    ],
  },
  {
    label: "Analytics",
    prefixes: ["/admin/reports", "/admin/analytics", "/admin/ai-insights"],
    items: [
      { href: "/admin/reports", label: "Reports", icon: FileText },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/ai-insights", label: "AI Insights", icon: Sparkles },
    ],
  },
  {
    label: "System",
    prefixes: ["/admin/notifications"],
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

interface SessionUser {
  name: string;
  role: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      GROUPS.map((g) => [g.label, g.prefixes.some((p) => pathname.startsWith(p))])
    )
  );

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

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  const dashboardActive = pathname === "/admin/dashboard";
  const settingsActive = pathname === "/admin/settings";

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Boxes size={16} strokeWidth={2.5} />
        </div>
        <span className="font-display text-[15px] font-semibold tracking-tight">Inventra</span>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {/* Dashboard — standalone */}
        <Link
          href="/admin/dashboard"
          className={cn(
            "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
            dashboardActive
              ? "bg-primary/10 text-primary"
              : "text-muted hover:bg-surface2 hover:text-text"
          )}
        >
          {dashboardActive && <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-primary" />}
          <LayoutGrid size={16} strokeWidth={2} />
          Dashboard
        </Link>

        {/* Collapsible groups */}
        <div className="mt-2 space-y-1">
          {GROUPS.map((group) => {
            const isOpen = openGroups[group.label];
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted transition-all duration-200 ease-in-out hover:text-text"
                >
                  <ChevronRight
                    size={12}
                    strokeWidth={2.5}
                    className={cn("shrink-0 transition-transform duration-200", isOpen && "rotate-90")}
                  />
                  {group.label}
                </button>
                {isOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    {group.items.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted hover:bg-surface2 hover:text-text"
                          )}
                        >
                          {active && <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-primary" />}
                          <Icon size={16} strokeWidth={2} />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
      <div className="px-3 pb-1">
        <Link
          href="/admin/settings"
          className={cn(
            "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
            settingsActive ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface2 hover:text-text"
          )}
        >
          {settingsActive && <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-primary" />}
          <Settings size={16} strokeWidth={2} />
          Settings
        </Link>
      </div>
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
