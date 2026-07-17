"use client";

import { cn } from "@/lib/utils";

function scoreOf(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-out", "bg-out", "bg-low", "bg-primary", "bg-healthy"];

export function PasswordStrength({ password }: { password: string }) {
  const score = password ? scoreOf(password) : -1;
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full bg-surface2 transition-colors", score > i && COLORS[score])}
          />
        ))}
      </div>
      {password && <p className="mt-1.5 text-[11px] text-muted">{LABELS[Math.max(score, 0)]}</p>}
    </div>
  );
}
