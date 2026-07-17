import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/attendance-types";

const CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-healthy/10 text-healthy" },
  "half-day": { label: "Half Day", className: "bg-low/10 text-low" },
  late: { label: "Late", className: "bg-expiring/10 text-expiring" },
  absent: { label: "Absent", className: "bg-out/10 text-out" },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const c = CONFIG[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", c.className)}>{c.label}</span>;
}
