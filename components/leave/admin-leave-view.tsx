"use client";

import { useEffect, useState } from "react";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Check, X, Hourglass } from "lucide-react";
import type { LeaveRequest, LeaveStatus } from "@/lib/hr-store";

const STATUS_STYLE: Record<LeaveStatus, string> = {
  pending: "text-low bg-low/10",
  approved: "text-healthy bg-healthy/10",
  rejected: "text-out bg-out/10",
};

export function AdminLeaveView() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/leave");
      if (res.ok) setRequests(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: LeaveStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  if (loading) return <p className="text-sm text-muted">Loading leave requests…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={pending} icon={Hourglass} accent="low" />
        <StatCard label="Approved" value={approved} icon={Check} accent="healthy" />
        <StatCard label="Rejected" value={rejected} icon={X} accent="out" />
      </div>

      <div className="space-y-3">
        {requests.length === 0 && (
          <Card className="flex items-center gap-3 p-6 text-sm text-muted">
            <CalendarClock size={18} /> No leave requests have been submitted yet.
          </Card>
        )}
        {requests.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display text-sm font-semibold">{r.staffName}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {r.fromDate} → {r.toDate}
              </p>
              {r.reason && <p className="mt-1 text-xs text-muted">{r.reason}</p>}
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" variant="primary" disabled={busyId === r.id} onClick={() => setStatus(r.id, "approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" disabled={busyId === r.id} onClick={() => setStatus(r.id, "rejected")}>
                  Reject
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
