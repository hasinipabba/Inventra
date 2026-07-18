import { Suspense } from "react";
import { Topbar } from "@/components/topbar";
import { StatusPill } from "@/components/ui/status-pill";
import { HealthRing } from "@/components/ui/health-ring";
import { getExpiryAlerts, getDashboardKpis, getRecentProducts } from "@/lib/db";
import { ScanBarcode, PackagePlus, Upload, Download, Package, AlertTriangle, TrendingDown, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const InventoryHealthChart = dynamic(
  () => import("@/components/charts/inventory-health-chart").then((m) => ({ default: m.InventoryHealthChart })),
  { loading: () => null }
);
const CategoryDonut = dynamic(
  () => import("@/components/charts/category-donut").then((m) => ({ default: m.CategoryDonut })),
  { loading: () => null }
);

function expiryPillStyle(days: number) {
  if (days <= 2) return { bg: "#3D1A1A", color: "#F85149" };
  if (days <= 4) return { bg: "#2D2010", color: "#E3A941" };
  return { bg: "#1A2510", color: "#6B8F3E" };
}

export default async function DashboardPage() {
  const [expiryAlerts, kpis, recent] = await Promise.all([
    getExpiryAlerts(),
    getDashboardKpis(),
    getRecentProducts(6),
  ]);
  const { totalProducts, expiringCount, lowStockCount, healthyCount: safeCount } = kpis;

  const STAT_CARDS = [
    {
      label: "Total Products",
      value: totalProducts.toLocaleString(),
      color: "#2F81F7",
      subtitle: "+4.2% this month",
      icon: Package,
    },
    {
      label: "Expiring in 7 Days",
      value: expiringCount,
      color: "#F85149",
      subtitle: `${expiringCount} SKUs flagged`,
      icon: AlertTriangle,
    },
    {
      label: "Low Stock",
      value: lowStockCount,
      color: "#E3A941",
      subtitle: "Restock needed",
      icon: TrendingDown,
    },
    {
      label: "Healthy Products",
      value: safeCount,
      color: "#3FB950",
      subtitle: "Within shelf life",
      icon: CheckCircle2,
    },
  ];

  const QUICK_ACTIONS = [
    { href: "/admin/scan", label: "Scan Product", icon: ScanBarcode },
    { href: "/admin/products", label: "Add Product", icon: PackagePlus },
    { href: "/admin/products", label: "Upload CSV", icon: Upload },
    { href: "/admin/reports", label: "Export Report", icon: Download },
  ];

  const visibleAlerts = expiryAlerts.slice(0, 5);
  const remainingAlerts = expiryAlerts.length - visibleAlerts.length;

  return (
    <>
      <Topbar title="Dashboard Overview" />
      <main className="animate-fade-in flex-1 flex-col space-y-3 p-5">

        {/* Row 1 — KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STAT_CARDS.map(({ label, value, color, subtitle, icon: Icon }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-[10px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
            >
              <span className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: color }} />
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-2)]">{label}</p>
                <Icon size={16} style={{ color, opacity: 0.8 }} />
              </div>
              <p className="mt-2 text-[32px] font-bold leading-none tracking-[-0.03em] text-[var(--text)]">{value}</p>
              <p className="mt-1 text-xs font-medium" style={{ color }}>{subtitle}</p>
            </div>
          ))}
        </div>

        {/* Row 2 — Expiry alerts + Quick actions */}
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="min-w-0 flex-1 rounded-[10px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text)]">Priority Expiry Alerts</h2>
              <Link href="/admin/ai-insights" className="text-xs text-[var(--text-2)] hover:text-[var(--text)]">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-[var(--card-border)]">
              {visibleAlerts.map((item) => {
                const pill = expiryPillStyle(item.daysRemaining);
                const days = Math.max(item.daysRemaining, 0);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-[7px] w-[7px] shrink-0 rounded-full"
                        style={{ backgroundColor: pill.color }}
                      />
                      <p className="truncate text-[13px] font-medium text-[var(--text)]">{item.product}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ background: pill.bg, color: pill.color }}
                    >
                      {days}D LEFT
                    </span>
                  </div>
                );
              })}
            </div>
            {remainingAlerts > 0 && (
              <Link
                href="/admin/ai-insights"
                className="mt-2 block text-center text-[11px] text-[var(--text-3)] hover:text-[var(--text-2)]"
              >
                {remainingAlerts} more expiring this week →
              </Link>
            )}
          </div>

          <div className="w-full shrink-0 rounded-[10px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 lg:w-[280px]">
            <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="group flex min-h-[90px] flex-col items-center justify-center rounded-lg border border-[var(--card-border)] bg-surface2 p-5 text-center transition-colors hover:border-[var(--text-3)]"
                >
                  <Icon size={22} className="text-[var(--text-2)] transition-colors group-hover:text-[var(--text)]" />
                  <span className="mt-2 text-[11px] text-[var(--text-2)] transition-colors group-hover:text-[var(--text)]">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3 — Charts */}
        <Suspense fallback={null}>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="min-w-0 flex-1 rounded-[10px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text)]">Inventory Health Trend</h2>
                <div className="flex items-center gap-0.5 rounded-md bg-surface2 p-[3px]">
                  {["1M", "6M", "1Y"].map((label, i) => (
                    <span
                      key={label}
                      className={
                        i === 0
                          ? "rounded px-2.5 py-1 text-[11px] bg-[var(--card-border)] text-[var(--text)]"
                          : "rounded px-2.5 py-1 text-[11px] text-[var(--text-2)]"
                      }
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <InventoryHealthChart />
              </div>
            </div>
            <div className="w-full shrink-0 rounded-[10px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 lg:w-[280px]">
              <h2 className="mb-4 text-sm font-semibold text-[var(--text)]">Category Distribution</h2>
              <CategoryDonut />
            </div>
          </div>
        </Suspense>

        {/* Recently updated products table */}
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Recently Updated Products</h2>
            <Link href="/admin/products" className="text-xs font-medium text-[#2F81F7] hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Batch</th>
                  <th className="pb-2 font-medium">Expiry Date</th>
                  <th className="pb-2 font-medium">Health</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted">{p.sku}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted">{p.batch}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted">{p.expiryDate}</td>
                    <td className="py-2.5 pr-3">
                      <HealthRing score={p.healthScore} size={30} />
                    </td>
                    <td className="py-2.5">
                      <StatusPill status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
