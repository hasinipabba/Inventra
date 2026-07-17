"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, UserCheck, UserX, Clock, LogIn, LogOut, Search, CalendarClock } from "lucide-react";
import { Card, StatCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast-context";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { AttendanceRowSkeleton } from "@/components/attendance/attendance-skeleton";
import { formatTimeIST, startOfWeekString, startOfMonthString, todayDateString, yesterdayDateString } from "@/lib/attendance-utils";
import type { AttendanceAdminOverview, AttendanceRecord } from "@/lib/attendance-types";

type Preset = "today" | "yesterday" | "week" | "month" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom Range" },
];

function rangeFor(preset: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = todayDateString();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = yesterdayDateString();
      return { from: y, to: y };
    }
    case "week":
      return { from: startOfWeekString(), to: today };
    case "month":
      return { from: startOfMonthString(), to: today };
    case "custom":
      return { from: customFrom || today, to: customTo || today };
  }
}

export function AttendanceAdminView({
  initialOverview,
  initialRecords,
}: {
  initialOverview: AttendanceAdminOverview;
  initialRecords: AttendanceRecord[];
}) {
  const { showToast } = useToast();
  const [overview, setOverview] = useState<AttendanceAdminOverview>(initialOverview);

  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState(todayDateString());
  const [customTo, setCustomTo] = useState(todayDateString());
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const refreshOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/admin/overview");
      if (!res.ok) throw new Error();
      setOverview(await res.json());
    } catch {
      // Stats are supplementary to the table below; fail quietly and keep showing the last good numbers.
    }
  }, []);

  const fetchRecords = useCallback(
    async (from: string, to: string, searchTerm: string) => {
      setRecordsLoading(true);
      try {
        const params = new URLSearchParams({ from, to });
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        const res = await fetch(`/api/attendance/admin?${params.toString()}`);
        if (res.status === 403) {
          showToast({ title: "Admin access required", variant: "error" });
          return;
        }
        if (!res.ok) throw new Error();
        setRecords(await res.json());
      } catch {
        showToast({ title: "Couldn't load attendance records", description: "Check your connection and try again.", variant: "error" });
      } finally {
        setRecordsLoading(false);
      }
    },
    [showToast]
  );

  // Debounced re-fetch whenever the date range or search text changes.
  useEffect(() => {
    const { from, to } = rangeFor(preset, customFrom, customTo);
    const id = setTimeout(() => fetchRecords(from, to, search), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo, search]);

  // Keep the "today" stats reasonably fresh without hammering the server.
  useEffect(() => {
    const id = setInterval(refreshOverview, 60_000);
    return () => clearInterval(id);
  }, [refreshOverview]);

  const stats = useMemo(
    () => [
      { label: "Total Staff", value: overview.totalStaff, icon: Users, accent: "primary" as const },
      { label: "Present Today", value: overview.presentToday, icon: UserCheck, accent: "healthy" as const },
      { label: "Absent Today", value: overview.absentToday, icon: UserX, accent: "out" as const },
      { label: "Late Arrivals", value: overview.lateArrivals, icon: Clock, accent: "expiring" as const },
      { label: "Checked In", value: overview.checkedIn, icon: LogIn, accent: "healthy" as const },
      { label: "Checked Out", value: overview.checkedOut, icon: LogOut, accent: "primary" as const },
    ],
    [overview]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                preset === p.key ? "bg-primary text-white" : "bg-surface2 text-muted hover:text-text"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="w-52 rounded-lg border border-border bg-surface2/50 py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-border bg-surface2/50 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-border bg-surface2/50 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {recordsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <AttendanceRowSkeleton key={i} />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <CalendarClock className="text-muted" size={28} />
          <p className="text-sm font-medium">No attendance records for this range</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted">
                <th className="px-4 py-3">Staff Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Clock In</th>
                <th className="px-4 py-3">Clock Out</th>
                <th className="px-4 py-3">Total Hours</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface2/40">
                  <td className="px-4 py-3 font-medium">{r.staffName}</td>
                  <td className="px-4 py-3 text-muted">{r.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(`${r.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">{formatTimeIST(r.checkInTime)}</td>
                  <td className="px-4 py-3">{formatTimeIST(r.checkOutTime)}</td>
                  <td className="px-4 py-3 tabular-nums">{r.totalHours.toFixed(1)}h</td>
                  <td className="px-4 py-3">
                    <AttendanceStatusBadge status={r.attendanceStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
