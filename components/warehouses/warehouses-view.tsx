"use client";

import { useEffect, useState } from "react";
import type { Warehouse } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Warehouse as WarehouseIcon, ArrowLeftRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

function heatColor(pct: number) {
  if (pct >= 90) return "bg-out";
  if (pct >= 75) return "bg-expiring";
  if (pct >= 50) return "bg-low";
  return "bg-healthy";
}

export function WarehousesView() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then(setWarehouses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && warehouses.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "400px",
          color: "var(--text-2)",
          fontSize: "14px",
        }}
      >
        No warehouses found. Add a warehouse to get started.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {warehouses.map((w) => {
          const pct = Math.round((w.used / (w.capacity || 1)) * 100);
          return (
            <Card key={w.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <WarehouseIcon size={18} />
                  </div>
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <MapPin size={11} /> {w.location} · Managed by {w.manager}
                    </p>
                  </div>
                </div>
                <span className={cn("rounded-full px-2 py-1 text-xs font-medium", pct >= 90 ? "bg-out/10 text-out" : pct >= 75 ? "bg-expiring/10 text-expiring" : "bg-healthy/10 text-healthy")}>
                  {pct}% full
                </span>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface2">
                <div className={cn("h-full rounded-full", heatColor(pct))} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{w.used.toLocaleString()} used</span>
                <span>{w.capacity.toLocaleString()} capacity</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                <div>
                  <p className="text-xs text-muted">Products stored</p>
                  <p className="font-medium">{w.products}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowLeftRight size={13} className="text-primary" />
                  <div>
                    <p className="text-xs text-muted">Transfers pending</p>
                    <p className="font-medium">{w.transfersPending}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <h2 className="mb-1 font-display text-sm font-semibold">Warehouse Heat Map</h2>
        <p className="mb-4 text-xs text-muted">Capacity utilization at a glance — darker means fuller</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-12">
          {warehouses.length > 0 &&
            Array.from({ length: 48 }).map((_, i) => {
              const w = warehouses[i % warehouses.length];
              if (!w || !w.capacity) return null;
              const base = Math.round((w.used / w.capacity) * 100);
              const jitter = (i * 13) % 20;
              const pct = Math.max(10, Math.min(100, base - 10 + jitter));
              return <div key={i} className={cn("h-6 w-full rounded-sm", heatColor(pct))} style={{ opacity: 0.35 + pct / 150 }} title={`${pct}%`} />;
            })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted">
          <LegendDot color="bg-healthy" label="< 50%" />
          <LegendDot color="bg-low" label="50–75%" />
          <LegendDot color="bg-expiring" label="75–90%" />
          <LegendDot color="bg-out" label="90%+" />
        </div>
      </Card>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-sm", color)} /> {label}
    </span>
  );
}
