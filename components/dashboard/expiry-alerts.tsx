"use client";

import { motion } from "framer-motion";
import { CalendarClock, ArrowRight } from "lucide-react";
import { expiryAlerts } from "@/lib/mock-data";
import { formatDate, cn } from "@/lib/utils";

const SEVERITY_STYLE: Record<string, { badge: string; text: string; bar: string }> = {
  safe: { badge: "bg-healthy/10 text-healthy", text: "text-healthy", bar: "bg-healthy" },
  warning: { badge: "bg-low/10 text-low", text: "text-low", bar: "bg-low" },
  critical: { badge: "bg-out/10 text-out", text: "text-out", bar: "bg-out" },
};

export function ExpiryAlerts() {
  return (
    <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-1">
      {expiryAlerts.map((item, i) => {
        const style = SEVERITY_STYLE[item.severity];
        const label = item.daysRemaining < 0 ? `Expired ${Math.abs(item.daysRemaining)}d ago` : `${item.daysRemaining}d left`;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="relative w-60 shrink-0 overflow-hidden rounded-xl2 border border-border bg-surface p-4 transition-shadow hover:shadow-popover"
          >
            <span className={cn("absolute inset-x-0 top-0 h-1", style.bar)} />
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug">{item.product}</p>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", style.badge)}>{label}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted">{item.category} · {item.batch}</p>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
              <p className="flex items-center gap-1 text-[11px] text-muted">
                <CalendarClock size={12} /> {formatDate(item.expiryDate)}
              </p>
              <button className={cn("flex items-center gap-1 text-[11px] font-medium hover:underline", style.text)}>
                Act now <ArrowRight size={11} />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
