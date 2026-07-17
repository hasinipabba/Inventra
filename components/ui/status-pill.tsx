import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/lib/types";

const CONFIG: Record<ProductStatus, { label: string; dot: string; text: string; bg: string }> = {
  healthy: { label: "Healthy", dot: "bg-healthy", text: "text-healthy", bg: "bg-healthy/10" },
  low: { label: "Low Stock", dot: "bg-low", text: "text-low", bg: "bg-low/10" },
  out: { label: "Out of Stock", dot: "bg-out", text: "text-out", bg: "bg-out/10" },
  expiring: { label: "Expiring Soon", dot: "bg-expiring", text: "text-expiring", bg: "bg-expiring/10" },
  expired: { label: "Expired", dot: "bg-expired", text: "text-expired", bg: "bg-expired/10" },
};

export function StatusPill({ status }: { status: ProductStatus }) {
  const c = CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", c.bg, c.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot, status === "out" && "animate-pulse2")} />
      {c.label}
    </span>
  );
}
