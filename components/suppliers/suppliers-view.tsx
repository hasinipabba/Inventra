"use client";

import { useEffect, useState } from "react";
import { Plus, Mail, Trash2, X, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import type { Supplier } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

const STATUS_STYLE = {
  active: "bg-healthy/10 text-healthy",
  pending: "bg-low/10 text-low",
  inactive: "bg-expired/10 text-expired",
};

export function SuppliersView() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/suppliers")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<Supplier[]>;
      })
      .then((data) => {
        if (!cancelled) setSuppliers(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load suppliers from the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: string) {
    const previous = suppliers;
    setSuppliers((prev) => prev.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      showToast({ title: "Supplier removed", variant: "info" });
    } catch {
      setSuppliers(previous);
      showToast({ title: "Couldn't remove supplier", variant: "error" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Add Supplier
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface2">
              <tr className="text-xs text-muted">
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Products Supplied</th>
                <th className="px-4 py-3 font-medium">Reliability</th>
                <th className="px-4 py-3 font-medium">Last Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Loading suppliers…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && suppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted">
                    No suppliers yet.
                  </td>
                </tr>
              )}
              {!loading &&
                suppliers.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-surface2/50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs">{s.contact}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <Mail size={11} /> {s.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs">{s.productsSupplied}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface2">
                          <div
                            className={cn("h-full rounded-full", s.reliability >= 90 ? "bg-healthy" : s.reliability >= 75 ? "bg-low" : "bg-out")}
                            style={{ width: `${s.reliability}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">{s.reliability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDate(s.lastOrder)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLE[s.status])}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-muted hover:bg-out/10 hover:text-out">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modalOpen && (
        <AddSupplierModal
          onClose={() => setModalOpen(false)}
          onCreated={(s) => {
            setSuppliers((prev) => [s, ...prev]);
            setModalOpen(false);
            showToast({ title: `${s.name} added as a supplier`, variant: "success" });
          }}
        />
      )}
    </div>
  );
}

function AddSupplierModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Supplier) => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const payload: Supplier = {
      id: `sup-${Date.now()}`,
      name: name.trim(),
      contact,
      email,
      productsSupplied: 0,
      reliability: 100,
      lastOrder: new Date().toISOString().slice(0, 10),
      status: "pending",
    };
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      onCreated(await res.json());
    } catch {
      setError("Couldn't add this supplier — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-xl2 border border-border bg-surface shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-sm font-semibold">Add Supplier</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
        <form className="space-y-3 p-5" onSubmit={submit}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <label className="block text-xs font-medium text-muted">
            Supplier name
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs font-medium text-muted">
            Contact person
            <input value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block text-xs font-medium text-muted">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Add supplier
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
