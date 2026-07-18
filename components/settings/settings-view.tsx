"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { ThemeToggle } from "@/components/theme-toggle";

const TABS = ["Account", "Company Profile", "Notifications", "Appearance", "Roles & Permissions", "Integrations"] as const;

interface SessionUser {
  name: string;
  role: string;
}

type NotificationPrefs = { lowStock: boolean; expiry: boolean; transfers: boolean; aiDigest: boolean };
const DEFAULT_PREFS: NotificationPrefs = { lowStock: true, expiry: true, transfers: true, aiDigest: false };

export function SettingsView() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Account");
  const [toggles, setToggles] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/notification-prefs")
      .then((res) => (res.ok ? (res.json() as Promise<NotificationPrefs>) : Promise.reject()))
      .then((data) => {
        if (!cancelled) setToggles(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateToggle(key: keyof NotificationPrefs, value: boolean) {
    const previous = toggles;
    const next = { ...toggles, [key]: value };
    setToggles(next);
    try {
      const res = await fetch("/api/settings/notification-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setToggles(previous);
      showToast({ title: "Couldn't save preference", variant: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              tab === t ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface2 hover:text-text"
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="flex-1">
        {tab === "Account" && (
          <div className="space-y-4">
            <Card className="max-w-xl space-y-3 p-5">
              <div>
                <p className="text-xs font-medium text-muted">Name</p>
                <p className="text-sm">{user?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Role</p>
                <p className="text-sm">{user?.role ?? "—"}</p>
              </div>
            </Card>
            <Link
              href="/admin/warehouses"
              className="flex max-w-xl items-center justify-between rounded-xl2 border border-border bg-surface p-5 text-sm font-medium transition-colors hover:bg-surface2/60"
            >
              Manage warehouses
              <ArrowRight size={16} className="text-muted" />
            </Link>
          </div>
        )}

        {tab === "Company Profile" && (
          <Card className="max-w-xl space-y-4 p-5">
            <Field label="Company Name" defaultValue="Inventra Retail Pvt. Ltd." />
            <Field label="Primary Contact Email" defaultValue="ops@inventra.example" />
            <Field label="Business Type" defaultValue="Retail & Distribution" />
            <div className="flex justify-end">
              <Button variant="primary">Save changes</Button>
            </div>
          </Card>
        )}

        {tab === "Notifications" && (
          <Card className="max-w-xl divide-y divide-border p-0">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted">
                <Loader2 size={14} className="animate-spin" /> Loading preferences…
              </div>
            )}
            {!loading &&
              [
                { key: "lowStock", label: "Low stock alerts", desc: "Get notified when a product falls below minimum stock." },
                { key: "expiry", label: "Expiry alerts", desc: "Get notified about products expiring soon." },
                { key: "transfers", label: "Warehouse transfers", desc: "Get notified when a transfer is requested or completed." },
                { key: "aiDigest", label: "Daily AI digest", desc: "Receive a daily summary of AI recommendations." },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted">{row.desc}</p>
                  </div>
                  <Toggle
                    checked={toggles[row.key as keyof typeof toggles]}
                    onChange={(v) => updateToggle(row.key as keyof NotificationPrefs, v)}
                  />
                </div>
              ))}
          </Card>
        )}

        {tab === "Appearance" && (
          <Card className="max-w-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted">Currently using {isDark ? "dark" : "light"} mode.</p>
              </div>
              <ThemeToggle />
            </div>
          </Card>
        )}

        {tab === "Roles & Permissions" && (
          <Card className="max-w-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface2">
                <tr className="text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Permission</th>
                  <th className="px-4 py-3 font-medium text-center">Administrator</th>
                  <th className="px-4 py-3 font-medium text-center">Inventory Manager</th>
                  <th className="px-4 py-3 font-medium text-center">Warehouse Staff</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Manage products", true, true, false],
                  ["Delete products", true, false, false],
                  ["Manage users", true, false, false],
                  ["Update stock", true, true, true],
                  ["Approve purchase requests", true, false, false],
                  ["View analytics", true, true, false],
                  ["Company settings", true, false, false],
                ].map(([perm, a, m, s]) => (
                  <tr key={perm as string} className="border-t border-border">
                    <td className="px-4 py-3">{perm as string}</td>
                    <td className="px-4 py-3 text-center">{a ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-center">{m ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-center">{s ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab === "Integrations" && (
          <Card className="max-w-xl p-5">
            <p className="text-sm text-muted">No integrations connected yet. Connect a barcode scanner, POS system, or accounting tool to sync data automatically.</p>
            <Button variant="secondary" className="mt-4">
              Browse integrations
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="block text-xs font-medium text-muted">
      {label}
      <input defaultValue={defaultValue} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm text-text outline-none focus:border-primary" />
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-surface2 border border-border")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}
