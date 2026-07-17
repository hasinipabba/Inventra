import { Suspense } from "react";
import { Topbar } from "@/components/topbar";
import { StatusPill } from "@/components/ui/status-pill";
import { HealthRing } from "@/components/ui/health-ring";
import { getExpiryAlerts, getDashboardKpis, getRecentProducts } from "@/lib/db";
import { ScanBarcode, PackagePlus, Upload, Download } from "lucide-react";
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
    },
    {
      label: "Expiring in 7 Days",
      value: expiringCount,
      color: "#F85149",
      subtitle: `${expiringCount} SKUs flagged`,
    },
    {
      label: "Low Stock",
      value: lowStockCount,
      color: "#E3A941",
      subtitle: "Restock needed",
    },
    {
      label: "Healthy Products",
      value: safeCount,
      color: "#3FB950",
      subtitle: "Within shelf life",
    },
  ];

  const QUICK_ACTIONS = [
    { href: "/admin/scan", label: "Scan product", icon: ScanBarcode },
    { href: "/admin/products", label: "Add product", icon: PackagePlus },
    { href: "/admin/products", label: "Upload CSV", icon: Upload },
    { href: "/admin/reports", label: "Export report", icon: Download },
  ];

  return (
    <>
      <Topbar title="Dashboard Overview" />
      <main className="animate-fade-in flex-1 space-y-5 p-4 md:p-6">

        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STAT_CARDS.map(({ label, value, color, subtitle }) => (
            <div key={label} className="glass-card relative overflow-hidden p-5">
              <span className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: color }} />
              <p className="text-xs font-medium text-muted">{label}</p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
              <p className="mt-1.5 text-xs font-medium" style={{ color }}>{subtitle}</p>
            </div>
          ))}
        </div>

        {/* Expiry alerts + Quick actions */}
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Expiry alerts — vertical list */}
          <div className="glass-card min-w-0 flex-1 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Expiry Alerts</h2>
              <Link href="/admin/ai-insights" className="text-xs font-medium text-[#2F81F7] hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-1">
              {expiryAlerts.map((item) => {
                const days = item.daysRemaining;
                const isExpired = days < 0;
                const dotColor =
                  isExpired || days <= 2 ? "#F85149" : days === 3 ? "#E3B341" : "#E3A941";
                const badgeCls =
                  isExpired || days <= 2
                    ? "bg-[#F85149]/10 text-[#F85149]"
                    : days === 3
                    ? "bg-[#E3B341]/10 text-[#E3B341]"
                    : "bg-[#E3A941]/10 text-[#E3A941]";
                const badgeLabel = isExpired
                  ? `Expired ${Math.abs(days)}d ago`
                  : `${days}d left`;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.product}</p>
                      <p className="text-[11px] text-muted">
                        {item.category} · {item.batch}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCls}`}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass-card w-full shrink-0 p-5 lg:w-[210px]">
            <h2 className="mb-3 font-display text-sm font-semibold">Quick Actions</h2>
            <div className="space-y-2">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Icon size={15} strokeWidth={2} className="text-muted" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Charts */}
        <Suspense fallback={null}>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="glass-card min-w-0 flex-1 p-5">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold">Inventory Health</h2>
                <Link href="/admin/analytics" className="text-xs font-medium text-[#2F81F7] hover:underline">
                  View analytics
                </Link>
              </div>
              <p className="mb-2 text-xs text-muted">Stock levels across all warehouses, last 7 months</p>
              <InventoryHealthChart />
            </div>
            <div className="glass-card w-full shrink-0 p-5 lg:w-[200px]">
              <h2 className="mb-1 font-display text-sm font-semibold">Categories</h2>
              <p className="mb-2 text-xs text-muted">Distribution by count</p>
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
