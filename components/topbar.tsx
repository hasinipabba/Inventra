"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/lib/types";

const CATEGORY_DOT: Record<NotificationItem["category"], string> = {
  "Low Stock": "bg-low",
  "Out of Stock": "bg-out",
  Expiry: "bg-expiring",
  Warehouse: "bg-primary",
  Shipment: "bg-primary",
  "Purchase Request": "bg-healthy",
  Transfer: "bg-primary",
  "AI Recommendation": "bg-primary",

  // Newly added categories
  Task: "bg-primary",
  "Leave Request": "bg-primary",
};

export function Topbar({ title }: { title: string }) {
  const pathname = usePathname();
  const notificationsHref = pathname?.startsWith("/staff") ? "/staff/notifications" : "/admin/notifications";
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data: NotificationItem[] = await res.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // Poll periodically so new alerts (low stock, approvals, check-ins…)
    // show up here without needing a manual refresh.
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const item = items.find((n) => n.id === id);
    if (!item) return;
    fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, read: true }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => {});
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)] px-4 md:px-6">
      <h1 className="text-[15px] font-medium text-[var(--text)]">{title}</h1>
      <div className="flex flex-1 items-center justify-end gap-2">
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
          >
            <Bell size={17} className={cn(unread > 0 && "animate-wiggle")} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F85149] px-1 text-[10px] font-semibold text-white ring-2 ring-[var(--topbar-bg)]">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-xl2 border border-border bg-surface shadow-popover animate-fade-in">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="font-display text-sm font-semibold">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
              </div>
              <div className="scrollbar-thin max-h-80 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted">
                    <Loader2 size={13} className="animate-spin" /> Loading…
                  </div>
                )}
                {!loading && items.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-muted">You're all caught up.</p>
                )}
                {!loading &&
                  items.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface2/60",
                        !n.read && "bg-primary/[0.04]"
                      )}
                    >
                      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", CATEGORY_DOT[n.category])} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-primary">{n.category}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-text">{n.message}</p>
                        <p className="mt-0.5 text-[11px] text-muted">{n.time}</p>
                      </div>
                    </button>
                  ))}
              </div>
              <Link
                href={notificationsHref}
                onClick={() => setOpen(false)}
                className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-surface2/60"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
