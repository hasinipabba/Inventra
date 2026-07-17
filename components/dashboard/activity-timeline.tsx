"use client";

import { motion } from "framer-motion";
import { ScanBarcode, PackagePlus, RefreshCw, AlertTriangle, FileText } from "lucide-react";
import { activityFeed, type ActivityKind } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const ICON: Record<ActivityKind, typeof ScanBarcode> = {
  scan: ScanBarcode,
  add: PackagePlus,
  update: RefreshCw,
  alert: AlertTriangle,
  report: FileText,
};

const STATUS_DOT: Record<string, string> = {
  success: "bg-healthy",
  warning: "bg-low",
  danger: "bg-out",
  neutral: "bg-primary",
};

export function ActivityTimeline() {
  return (
    <div className="relative">
      <div className="absolute bottom-1 left-[15px] top-1 w-px bg-border" />
      <ul className="space-y-4">
        {activityFeed.map((event, i) => {
          const Icon = ICON[event.kind];
          return (
            <motion.li
              key={event.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="relative flex gap-3"
            >
              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface2">
                <Icon size={14} className="text-muted" />
                <span className={cn("absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-surface", STATUS_DOT[event.status])} />
              </span>
              <div className="min-w-0 pb-0.5">
                <p className="text-sm font-medium leading-snug">{event.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{event.meta}</p>
                <p className="mt-0.5 text-[11px] text-muted">{event.time}</p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
