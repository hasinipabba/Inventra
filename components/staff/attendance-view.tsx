"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, Clock3, Search, X, CalendarClock, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast-context";
import { LiveClock, LiveDateLabel } from "@/components/attendance/live-clock";
import { LiveDuration } from "@/components/attendance/live-duration";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { AttendanceRowSkeleton } from "@/components/attendance/attendance-skeleton";
import { formatTimeIST } from "@/lib/attendance-utils";
import type { AttendanceRecord } from "@/lib/attendance-types";

type DayState = "not-checked-in" | "checked-in" | "checked-out";

function dayStateOf(record: AttendanceRecord | null): DayState {
  if (!record || !record.checkInTime) return "not-checked-in";
  if (!record.checkOutTime) return "checked-in";
  return "checked-out";
}

const STATE_LABEL: Record<DayState, string> = {
  "not-checked-in": "Not Checked In",
  "checked-in": "Checked In",
  "checked-out": "Checked Out",
};

const STATE_STYLE: Record<DayState, string> = {
  "not-checked-in": "bg-surface2 text-muted",
  "checked-in": "bg-healthy/10 text-healthy",
  "checked-out": "bg-primary/10 text-primary",
};

export function StaffAttendanceView({
  initialRecord,
  initialHistory,
}: {
  initialRecord: AttendanceRecord | null;
  initialHistory: AttendanceRecord[];
}) {
  const { showToast } = useToast();
  const [record, setRecord] = useState<AttendanceRecord | null>(initialRecord);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  const [history, setHistory] = useState<AttendanceRecord[]>(initialHistory);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const dayState = dayStateOf(record);

  const fetchHistory = useCallback(async (filters: { date: string; month: string }) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date) {
        params.set("from", filters.date);
        params.set("to", filters.date);
      } else if (filters.month) {
        params.set("month", filters.month);
      }
      const res = await fetch(`/api/attendance/history?${params.toString()}`);
      if (res.status === 401) {
        showToast({ title: "Your session has expired", description: "Please sign in again.", variant: "error" });
        return;
      }
      if (!res.ok) throw new Error();
      setHistory(await res.json());
    } catch {
      showToast({ title: "Couldn't load attendance history", description: "Check your connection and try again.", variant: "error" });
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  // Refetch whenever the date or month filter changes (not on every keystroke
  // of the free-text search, which is applied client-side below).
  useEffect(() => {
    if (!dateFilter && !monthFilter) return; // initial data already covers the default view
    fetchHistory({ date: dateFilter, month: monthFilter });
  }, [dateFilter, monthFilter, fetchHistory]);

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.trim().toLowerCase();
    return history.filter((r) => r.date.includes(q) || r.attendanceStatus.replace("-", " ").includes(q));
  }, [history, search]);

  async function handleClockIn() {
    setClockingIn(true);
    try {
      const res = await fetch("/api/attendance/clock-in", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to clock in");
      setRecord(data);
      showToast({ title: "Clocked in successfully", variant: "success" });
    } catch (err: any) {
      showToast({ title: "Couldn't clock in", description: err?.message, variant: "error" });
    } finally {
      setClockingIn(false);
    }
  }

  async function handleClockOut() {
    setClockingOut(true);
    try {
      const res = await fetch("/api/attendance/clock-out", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to clock out");
      setRecord(data);
      showToast({ title: "Clocked out successfully", variant: "success" });
      setHistory((prev) => {
        const withoutToday = prev.filter((r) => r.date !== data.date);
        return [data, ...withoutToday];
      });
    } catch (err: any) {
      showToast({ title: "Couldn't clock out", description: err?.message, variant: "error" });
    } finally {
      setClockingOut(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setDateFilter("");
    setMonthFilter("");
    setHistory(initialHistory);
  }

  return (
    <div className="space-y-5">
      <Card className="animate-fade-in p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">Today</p>
            <p className="mt-1 font-display text-lg font-semibold tracking-tight">
              <LiveDateLabel />
            </p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATE_STYLE[dayState])}>{STATE_LABEL[dayState]}</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl2 border border-border bg-surface2/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Clock3 size={13} /> Current Time
            </p>
            <p className="mt-1.5 font-display text-xl font-semibold tabular-nums">
              <LiveClock />
            </p>
          </div>
          <div className="rounded-xl2 border border-border bg-surface2/40 p-4">
            <p className="text-xs font-medium text-muted">Clock In</p>
            <p className="mt-1.5 font-display text-xl font-semibold">{formatTimeIST(record?.checkInTime)}</p>
          </div>
          <div className="rounded-xl2 border border-border bg-surface2/40 p-4">
            <p className="text-xs font-medium text-muted">Clock Out</p>
            <p className="mt-1.5 font-display text-xl font-semibold">{formatTimeIST(record?.checkOutTime)}</p>
          </div>
          <div className="rounded-xl2 border border-border bg-surface2/40 p-4">
            <p className="text-xs font-medium text-muted">Working Hours Today</p>
            <p className="mt-1.5 font-display text-xl font-semibold tabular-nums">
              {dayState === "checked-in" ? (
                <LiveDuration sinceIso={record?.checkInTime ?? null} />
              ) : (
                `${(record?.totalHours ?? 0).toFixed(1)}h`
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" disabled={dayState !== "not-checked-in" || clockingIn} onClick={handleClockIn}>
            {clockingIn ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />} Clock In
          </Button>
          <Button variant="secondary" disabled={dayState !== "checked-in" || clockingOut} onClick={handleClockOut}>
            {clockingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Clock Out
          </Button>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold">Attendance History</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search status or date"
                className="w-44 rounded-lg border border-border bg-surface2/50 py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-primary"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setMonthFilter("");
              }}
              className="rounded-lg border border-border bg-surface2/50 px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setDateFilter("");
              }}
              className="rounded-lg border border-border bg-surface2/50 px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            />
            {(search || dateFilter || monthFilter) && (
              <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface2 hover:text-text">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        {historyLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <AttendanceRowSkeleton key={i} />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <CalendarClock className="text-muted" size={28} />
            <p className="text-sm font-medium">No attendance records found</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-[100px]">
                  <p className="text-sm font-medium">
                    {new Date(`${r.date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-xs text-muted">{r.lateMinutes > 0 ? `${r.lateMinutes} min late` : "On time"}</p>
                </div>
                <div className="text-xs text-muted">
                  <span className="text-text">{formatTimeIST(r.checkInTime)}</span> – <span className="text-text">{formatTimeIST(r.checkOutTime)}</span>
                </div>
                <div className="text-sm font-medium tabular-nums">{r.totalHours.toFixed(1)}h</div>
                <AttendanceStatusBadge status={r.attendanceStatus} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
