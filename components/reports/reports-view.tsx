"use client";

import { useState } from "react";
import { FileText, Download, CalendarClock, Warehouse, Truck, PackageSearch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { kpis, warehouses, suppliers } from "@/lib/mock-data";

const REPORTS = [
  { id: "inventory", title: "Inventory Summary", desc: "Stock levels, health scores, and status breakdown across all products.", icon: PackageSearch, lastRun: "Today, 7:00 AM" },
  { id: "expiry", title: "Expiry Report", desc: "Products expiring this week, next week, and already expired.", icon: CalendarClock, lastRun: "Today, 7:00 AM" },
  { id: "warehouse", title: "Warehouse Utilization", desc: "Capacity, utilization, and transfer activity per warehouse.", icon: Warehouse, lastRun: "Yesterday, 9:15 PM" },
  { id: "procurement", title: "Procurement Summary", desc: "Purchase requests, approvals, and estimated spend.", icon: Truck, lastRun: "2 days ago" },
];

export function ReportsView() {
  const [selected, setSelected] = useState<string>("inventory");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.id} className={`p-5 ${selected === r.id ? "border-primary" : ""}`}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <r.icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted">{r.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-muted">Last generated {r.lastRun}</span>
                  <Button size="sm" onClick={() => setSelected(r.id)}>
                    <FileText size={13} /> Generate
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold">{REPORTS.find((r) => r.id === selected)?.title} — Preview</h2>
            <p className="text-xs text-muted">Generated for Jul 5, 2026</p>
          </div>
          <Button variant="primary" size="sm">
            <Download size={13} /> Export PDF
          </Button>
        </div>

        {selected === "inventory" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Total Products", kpis.totalProducts],
              ["In Stock", kpis.inStock],
              ["Low Stock", kpis.lowStock],
              ["Out of Stock", kpis.outOfStock],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-display text-xl font-semibold">{value as number}</p>
              </div>
            ))}
          </div>
        )}

        {selected === "expiry" && (
          <div className="grid grid-cols-3 gap-4">
            {[
              ["Expiring this week", kpis.expiringSoon],
              ["Already expired", kpis.expired],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-display text-xl font-semibold text-expiring">{value as number}</p>
              </div>
            ))}
          </div>
        )}

        {selected === "warehouse" && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="pb-2 font-medium">Warehouse</th>
                <th className="pb-2 font-medium">Utilization</th>
                <th className="pb-2 font-medium">Transfers Pending</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="py-2.5">{w.name}</td>
                  <td className="py-2.5">{Math.round((w.used / w.capacity) * 100)}%</td>
                  <td className="py-2.5">{w.transfersPending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {selected === "procurement" && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="pb-2 font-medium">Supplier</th>
                <th className="pb-2 font-medium">Products Supplied</th>
                <th className="pb-2 font-medium">Reliability</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2.5">{s.name}</td>
                  <td className="py-2.5">{s.productsSupplied}</td>
                  <td className="py-2.5">{s.reliability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
