import { cn } from "@/lib/utils";

function colorFor(score: number) {
  if (score >= 75) return "#22C55E";
  if (score >= 45) return "#F59E0B";
  if (score >= 20) return "#F97316";
  return "#EF4444";
}

export function HealthRing({ score, size = 40 }: { score: number; size?: number }) {
  const stroke = Math.max(3, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = colorFor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(var(--border))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={cn("absolute font-mono font-medium", size <= 32 ? "text-[9px]" : "text-[11px]")} style={{ color }}>
        {score}
      </span>
    </div>
  );
}
