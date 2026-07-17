import { Sparkles, TrendingUp, ArrowLeftRight, CalendarClock, PackageX, Boxes } from "lucide-react";
import type { AIInsight } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS = {
  restock: TrendingUp,
  transfer: ArrowLeftRight,
  expiry: CalendarClock,
  "slow-moving": PackageX,
  excess: Boxes,
};

const URGENCY_STYLE = {
  high: "border-out/30 bg-out/[0.04]",
  medium: "border-low/30 bg-low/[0.04]",
  low: "border-border bg-surface",
};

export function AIInsightCard({ insight }: { insight: AIInsight }) {
  const Icon = ICONS[insight.type] ?? Sparkles;
  return (
    <div className={cn("rounded-xl2 border p-4 transition-shadow hover:shadow-card animate-fade-in", URGENCY_STYLE[insight.urgency])}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{insight.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{insight.detail}</p>
        </div>
      </div>
    </div>
  );
}
