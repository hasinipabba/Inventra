"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Search, Loader2 } from "lucide-react";
import type { Product } from "@/lib/types";

export function InventoryUpdateView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) setProducts(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q));
  }, [products, query]);

  function adjust(id: string, delta: number) {
    setPendingQty((prev) => {
      const product = products.find((p) => p.id === id);
      const base = prev[id] ?? product?.stock ?? 0;
      return { ...prev, [id]: Math.max(0, base + delta) };
    });
  }

  async function save(product: Product) {
    const qty = pendingQty[product.id];
    if (qty === undefined || qty === product.stock) return;
    setSavingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, stock: qty }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setPendingQty((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
      }
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading inventory…</p>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product, SKU, or barcode…"
          className="h-9 w-full rounded-lg border border-border bg-surface2 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-primary"
        />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">SKU</th>
              <th className="px-4 py-2.5 font-medium">Warehouse</th>
              <th className="px-4 py-2.5 font-medium">Quantity</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted">
                  No products match your search.
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const qty = pendingQty[p.id] ?? p.stock;
              const dirty = qty !== p.stock;
              return (
                <tr key={p.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{p.sku}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{p.warehouse}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjust(p.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted hover:bg-surface2"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-10 text-center font-mono text-sm">{qty}</span>
                      <button
                        onClick={() => adjust(p.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted hover:bg-surface2"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="primary" disabled={!dirty || savingId === p.id} onClick={() => save(p)}>
                      {savingId === p.id && <Loader2 size={13} className="animate-spin" />} Save
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
