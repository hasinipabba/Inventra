"use client";

import { useEffect, useState } from "react";

/**
 * Shows elapsed time since `sinceIso`, updating once a minute. Isolated in
 * its own component so the ticking timer doesn't re-render the parent card.
 * If `sinceIso` is null (not clocked in), shows a static "0h 0m".
 */
export function LiveDuration({ sinceIso, className }: { sinceIso: string | null; className?: string }) {
  const [label, setLabel] = useState("0h 0m");

  useEffect(() => {
    if (!sinceIso) {
      setLabel("0h 0m");
      return;
    }
    function tick() {
      const ms = Date.now() - new Date(sinceIso as string).getTime();
      const totalMinutes = Math.max(0, Math.floor(ms / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setLabel(`${hours}h ${minutes}m`);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [sinceIso]);

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}
