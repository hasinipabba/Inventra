"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, X, Loader2, AlertCircle, ImageIcon } from "lucide-react";
import type { Product, ProductStatus, Category } from "@/lib/types";
import { StatusPill } from "@/components/ui/status-pill";
import { HealthRing } from "@/components/ui/health-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STATUS_FILTERS: { label: string; value: ProductStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Healthy", value: "healthy" },
  { label: "Low Stock", value: "low" },
  { label: "Out of Stock", value: "out" },
  { label: "Expiring Soon", value: "expiring" },
  { label: "Expired", value: "expired" },
];

export function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouseNames, setWarehouseNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/products").then((res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json() as Promise<Product[]>;
      }),
      fetch("/api/categories").then((res) => {
        if (!res.ok) throw new Error("Failed to load categories");
        return res.json() as Promise<Category[]>;
      }),
      fetch("/api/warehouses").then((res) => res.ok ? res.json() as Promise<{ name: string }[]> : []),
    ])
      .then(([productsData, categoriesData, warehousesData]) => {
        if (!cancelled) {
          setProducts(productsData);
          setCategories(categoriesData);
          setWarehouseNames((warehousesData as { name: string }[]).map((w) => w.name));
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load data from the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [products, query, statusFilter]);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setModalOpen(true);
  }

  async function remove(id: string) {
    const previous = products;
    setProducts((prev) => prev.filter((p) => p.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      setProducts(previous); // revert on failure
      setError("Couldn't delete that product — please try again.");
    }
  }

  async function save(p: Product) {
    setSaving(true);
    setError(null);
    const exists = products.some((x) => x.id === p.id);
    try {
      const res = await fetch(exists ? `/api/products/${p.id}` : "/api/products", {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = (await res.json()) as Product;
      setProducts((prev) => (exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]));
      setModalOpen(false);
    } catch {
      setError("Couldn't save that product — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, SKU, or barcode…"
            className="h-9 w-full rounded-lg border border-border bg-surface2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus size={15} /> Add Product
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:text-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface2">
              <tr className="text-xs text-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU / Batch</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Health</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-xs text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Loading products…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-xs text-muted">
                    No products found.
                  </td>
                </tr>
              )}
              {!loading && filtered.slice(0, 25).map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface2/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface2 text-muted">
                          <ImageIcon size={14} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{p.sku}</p>
                    <p className="font-mono text-xs text-muted">{p.batch}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{p.category}</td>
                  <td className="px-4 py-3 text-xs">{p.warehouse.split("—")[1]?.trim()}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.stock} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-xs">{p.expiryDate}</td>
                  <td className="px-4 py-3">
                    <HealthRing score={p.healthScore} size={30} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="rounded-md p-1.5 text-muted hover:bg-surface2 hover:text-primary">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(p.id)} className="rounded-md p-1.5 text-muted hover:bg-out/10 hover:text-out">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
          <span>
            Showing {Math.min(filtered.length, 25)} of {filtered.length} products
          </span>
        </div>
      </Card>

      {modalOpen && (
        <ProductModal
          product={editing}
          categories={categories}
          warehouseNames={warehouseNames}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ProductModal({
  product,
  categories,
  warehouseNames,
  saving,
  onClose,
  onSave,
}: {
  product: Product | null;
  categories: Category[];
  warehouseNames: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [form, setForm] = useState<Product>(
    product ?? {
      id: `prod-${Date.now()}`,
      name: "",
      sku: "",
      barcode: "",
      category: categories[0]?.name ?? "",
      brand: "",
      batch: "",
      supplier: "",
      warehouse: warehouseNames[0] ?? "",
      shelf: "",
      stock: 0,
      minStock: 40,
      maxStock: 500,
      unit: "pcs",
      mfgDate: "",
      expiryDate: "",
      lastRestocked: "",
      lastUpdated: new Date().toISOString().slice(0, 10),
      healthScore: 80,
      status: "healthy",
      image: "",
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto scrollbar-thin rounded-xl2 border border-border bg-surface shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-sm font-semibold">{product ? "Edit Product" : "Add Product"}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
        <form
          className="grid grid-cols-2 gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
        >
          <Field label="Product Name" className="col-span-2" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} mono required />
          <Field label="Barcode" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} mono />
          <SelectField label="Category" value={form.category} options={categories.map((c) => c.name)} onChange={(v) => setForm({ ...form, category: v })} />
          <Field label="Brand" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
          <SelectField label="Warehouse" value={form.warehouse} options={warehouseNames} onChange={(v) => setForm({ ...form, warehouse: v })} />
          <Field label="Shelf Location" value={form.shelf} onChange={(v) => setForm({ ...form, shelf: v })} />
          <Field label="Current Stock" type="number" value={String(form.stock)} onChange={(v) => setForm({ ...form, stock: Number(v) })} />
          <Field label="Unit" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
          <Field label="Expiry Date" type="date" value={form.expiryDate} onChange={(v) => setForm({ ...form, expiryDate: v })} />
          <Field label="Batch Number" value={form.batch} onChange={(v) => setForm({ ...form, batch: v })} mono />
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted">Product Image</label>
            <div className="mt-1 flex items-center gap-3">
              {form.image ? (
                <img src={form.image} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-border text-muted">
                  <ImageIcon size={18} />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setForm((f) => ({ ...f, image: reader.result as string }));
                  reader.readAsDataURL(file);
                }}
                className="text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text hover:file:bg-border/50"
              />
              {form.image && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, image: "" }))} className="text-xs text-muted hover:text-out">
                  Remove
                </button>
              )}
            </div>
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : product ? (
                "Save changes"
              ) : (
                "Add product"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  mono = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  mono?: boolean;
  required?: boolean;
}) {
  return (
    <label className={`text-xs font-medium text-muted ${className}`}>
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm text-text outline-none focus:border-primary ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm text-text outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
