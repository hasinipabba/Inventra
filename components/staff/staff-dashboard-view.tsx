"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, StatCard } from "@/components/ui/card";
import { ListChecks, Clock, ScanBarcode, Boxes, ArrowRight } from "lucide-react";
import type { TaskWithAssignees } from "@/lib/types";
import type { AttendanceRecord } from "@/lib/attendance-types";

export function StaffDashboardView() {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setName(data?.user?.name ?? ""))
      .catch(() => {});

    fetch("/api/tasks")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTasks)
      .catch(() => {});

    fetch("/api/attendance/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setToday(data?.record ?? null))
      .catch(() => {});
  }, []);

  const pendingTasks = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="font-display text-base font-semibold">Welcome back{name ? `, ${name}` : ""}</p>
        <p className="mt-1 text-xs text-muted">Here's what's on your plate today.</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open Tasks" value={pendingTasks} icon={ListChecks} accent="low" />
        <StatCard label="Today's Attendance" value={today?.attendanceStatus ?? "Not checked in"} icon={Clock} accent="primary" />
        <StatCard label="Total Assigned" value={tasks.length} icon={Boxes} accent="healthy" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/staff/scan">
          <Card className="flex items-center justify-between p-5 transition-colors hover:bg-surface2/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ScanBarcode size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold">Scan a product</p>
                <p className="text-xs text-muted">Barcode or OCR label scanner</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted" />
          </Card>
        </Link>
        <Link href="/staff/tasks">
          <Card className="flex items-center justify-between p-5 transition-colors hover:bg-surface2/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ListChecks size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold">View my tasks</p>
                <p className="text-xs text-muted">{pendingTasks} still open</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
