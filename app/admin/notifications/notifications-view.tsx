"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/lib/types";
import { Loader2 } from "lucide-react";
import {
  AlertTriangle,
  PackageX,
  CalendarClock,
  Warehouse,
  Truck,
  ClipboardList,
  ArrowLeftRight,
  Sparkles,
  Bell,
  CheckSquare,
  ClipboardCheck,
} from "lucide-react";


const ICONS = {
  "Low Stock": AlertTriangle,
  "Out of Stock": PackageX,
  Expiry: CalendarClock,
  Warehouse: Warehouse,
  Shipment: Truck,
  "Purchase Request": ClipboardList,
  Transfer: ArrowLeftRight,
  "AI Recommendation": Sparkles,

  // Additional categories
  "Leave Request": ClipboardCheck,
  Task: CheckSquare,
  Test: Bell,
};

export function NotificationsView() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((res) => (res.ok ? (res.json() as Promise<NotificationItem[]>) : Promise.reject()))
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function markOne(id: string) {
    const item = items.find((n) => n.id === id);
    if (!item || item.read) return;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
    fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, read: true }),
    }).catch(() => {});
  }

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={markAll}>
          Mark all as read
        </Button>
      </div>
      <Card className="divide-y divide-border overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" /> Loading notifications…
          </div>
        )}
        {!loading && items.length === 0 && <p className="px-5 py-10 text-center text-xs text-muted">You're all caught up.</p>}
        {!loading &&
          items.slice(0, 30).map((n) => {
            const Icon = ICONS[n.category] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => markOne(n.id)}
                className={cn("flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface2/50", !n.read && "bg-primary/[0.03]")}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-primary">{n.category}</p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-sm">{n.message}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{n.time}</span>
              </button>
            );
          })}
      </Card>
    </div>
  );
}
