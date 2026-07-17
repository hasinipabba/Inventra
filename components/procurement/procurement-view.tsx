"use client";

import { useEffect, useState } from "react";
import { Check, X as XIcon, Loader2, AlertCircle } from "lucide-react";
import { Card, StatCard } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { ClipboardList, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { PurchaseRequest } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

const STATUS_STYLE = {
  pending: "bg-low/10 text-low",
  approved: "bg-healthy/10 text-healthy",
  rejected: "bg-out/10 text-out",
};

export function ProcurementView() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/purchase-requests")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<PurchaseRequest[]>;
      })
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load purchase requests from the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(id: string, status: "approved" | "rejected") {
    const target = requests.find((r) => r.id === id);
    if (!target) return;
    setBusyId(id);
    const previous = requests;
    const updatedLocal = { ...target, status };
    setRequests((prev) => prev.map((r) => (r.id === id ? updatedLocal : r)));
    try {
      const res = await fetch(`/api/purchase-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedLocal),
      });
      if (!res.ok) throw new Error("failed");
      const saved = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === id ? saved : r)));
      showToast({ title: `Request ${status}`, description: target.product, variant: status === "approved" ? "success" : "warning" });
    } catch {
      setRequests(previous);
      showToast({ title: "Couldn't update request", variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Requests" value={requests.length} icon={ClipboardList} accent="primary" />
        <StatCard label="Pending" value={pending} icon={Clock} accent="low" />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} accent="healthy" />
        <StatCard label="Rejected" value={rejected} icon={XCircle} accent="out" />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-surface2">
              <tr className="text-xs text-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Requested By</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Est. Cost</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-xs text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Loading requests…
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                requests.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface2/50">
                    <td className="px-4 py-3 font-medium">{r.product}</td>
                    <td className="px-4 py-3 text-xs">{r.quantity} units</td>
                    <td className="px-4 py-3 text-xs">{r.requestedBy}</td>
                    <td className="px-4 py-3 text-xs">{r.warehouse.split("—")[1]?.trim()}</td>
                    <td className="px-4 py-3 font-mono text-xs">₹{r.estCost.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(r.date)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLE[r.status])}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "approved")} className="rounded-md p-1.5 text-healthy hover:bg-healthy/10 disabled:opacity-50">
                            {busyId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                          </button>
                          <button disabled={busyId === r.id} onClick={() => setStatus(r.id, "rejected")} className="rounded-md p-1.5 text-out hover:bg-out/10 disabled:opacity-50">
                            <XIcon size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
