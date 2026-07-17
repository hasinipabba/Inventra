import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("glass-card shadow-card transition-shadow duration-200", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: "primary" | "healthy" | "low" | "out" | "expiring";
}) {
  const accentMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    healthy: "text-healthy bg-healthy/10",
    low: "text-low bg-low/10",
    out: "text-out bg-out/10",
    expiring: "text-expiring bg-expiring/10",
  };
  const barMap: Record<string, string> = {
    primary: "bg-primary",
    healthy: "bg-healthy",
    low: "bg-low",
    out: "bg-out",
    expiring: "bg-expiring",
  };
  return (
    <Card className="relative overflow-hidden p-5 animate-fade-in hover:shadow-popover">
      <span className={cn("absolute inset-x-0 top-0 h-0.5", barMap[accent])} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentMap[accent])}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      {trend && (
        <p className={cn("mt-3 text-xs font-medium", trendUp ? "text-healthy" : "text-out")}>
          {trend}
        </p>
      )}
    </Card>
  );
}
