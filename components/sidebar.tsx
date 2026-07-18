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
  ClipboardList,
  FileText,
  Settings,
  Boxes,
  ScanBarcode,
  Users,
  UserCog,
  Clock,
  ListChecks,
  CalendarDays,
  BarChart3,
  Sparkles,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Admin has full access to every feature — this sidebar is only ever
// rendered inside app/admin/layout.tsx, which is itself gated to the
// "Admin" role by middleware + a server-side check.
type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; defaultOpen: boolean; items: NavItem[] };

const DASHBOARD_ITEM: NavItem = { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "INVENTORY",
    defaultOpen: true,
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/scan", label: "Scanner", icon: ScanBarcode },
      { href: "/admin/categories", label: "Categories", icon: Tags },
      { href: "/admin/warehouses", label: "Warehouses", icon: Warehouse },
    ],
  },
  {
    label: "OPERATIONS",
    defaultOpen: true,
    items: [
      { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
      { href: "/admin/procurement", label: "Procurement", icon: ClipboardList },
      { href: "/admin/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "ANALYTICS",
    defaultOpen: false,
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/ai-insights", label: "AI Insights", icon: Sparkles },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "WORKFORCE",
    defaultOpen: false,
    items: [
      { href: "/admin/staff", label: "Staff", icon: Users },
      { href: "/admin/users", label: "Users", icon: UserCog },
      { href: "/admin/attendance", label: "Attendance", icon: Clock },
      { href: "/admin/tasks", label: "Task Management", icon: ListChecks },
      { href: "/admin/leave", label: "Leave Management", icon: CalendarDays },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { href: "/admin/settings", label: "Settings", icon: Settings };

interface SessionUser {
  name: string;
  role: string;
}

function NavLink({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 border-l-[3px] px-[13px] py-2.5 text-[13px] font-medium transition-colors duration-150",
        active
          ? "border-[#2F81F7] bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
          : "border-transparent text-[var(--sidebar-text)] hover:bg-[color-mix(in_srgb,var(--sidebar-active-bg)_50%,transparent)] hover:text-[var(--text)]"
      )}
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </Link>
  );
}

function NavGroupSection({ group, pathname }: { group: NavGroup; pathname: string | null }) {
  const [open, setOpen] = useState(
    () => group.defaultOpen || group.items.some((item) => item.href === pathname)
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 pb-1 pt-3 text-[10px] font-medium uppercase tracking-widest text-[#555555] transition-colors hover:text-[var(--sidebar-hover-text)]"
      >
        {group.label}
        <ChevronRight
          size={12}
          strokeWidth={2.5}
          className={cn("text-[#444444] transition-transform duration-200", open && "rotate-90")}
        />
      </button>
      <div className={cn("sidebar-group-items", open && "open")}>
        <div className="flex flex-col gap-0.5">
          {group.items.map((item) => (
            <NavLink key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
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

  const settingsActive = pathname === SETTINGS_ITEM.href;

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[var(--sidebar-bg)] md:flex">
      <div className="flex h-14 shrink-0 flex-col justify-center gap-1 px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#2F81F7]">
            <Boxes size={14} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold text-[var(--sidebar-active-text)]">Inventra</span>
        </div>
        <span className="pl-8 text-[9px] font-medium uppercase tracking-widest text-[var(--text-3)]">
          Enterprise Logistics
        </span>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto py-2">
        <div className="flex flex-col gap-0.5 pb-1">
          <NavLink {...DASHBOARD_ITEM} active={pathname === DASHBOARD_ITEM.href} />
        </div>

        {NAV_GROUPS.map((group) => (
          <NavGroupSection key={group.label} group={group} pathname={pathname} />
        ))}
      </nav>

      <div className="py-1">
        <NavLink {...SETTINGS_ITEM} active={settingsActive} />
      </div>

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
