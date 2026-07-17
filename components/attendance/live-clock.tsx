"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Ticks once a second. Kept as its own tiny component so the 1-second timer
 * only re-renders this element, not the whole attendance card/page.
 *
 * Renders a static placeholder until mounted so the server-rendered markup
 * (which has no concept of "now") always matches the client's first paint —
 * avoiding a hydration mismatch — then swaps in the live value after mount.
 */
export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={cn("tabular-nums", className)} suppressHydrationWarning>
      {now ? now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "--:--:--"}
    </span>
  );
}

/** Today's date, formatted, in Asia/Kolkata — static per mount, no ticking needed. */
export function LiveDateLabel({ className }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(
      new Date().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  return (
    <span className={className} suppressHydrationWarning>
      {label ?? ""}
    </span>
  );
}
