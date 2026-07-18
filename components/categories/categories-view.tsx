"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, Trash2, Loader2, AlertCircle } from "lucide-react";
import type { Category } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PALETTE = ["#3B82F6", "#22C55E", "#F59E0B", "#F97316", "#22C1C3", "#8B5CF6", "#EC4899"];

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load categories");
        return res.json() as Promise<Category[]>;
      })
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load categories from the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function add() {
    if (!name.trim() || adding) return;
    setAdding(true);
    setError(null);
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      productCount: 0,
      totalStock: 0,
      color: PALETTE[categories.length % PALETTE.length],
    };
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      if (!res.ok) throw new Error("Create failed");
      const saved = (await res.json()) as Category;
      setCategories((prev) => [saved, ...prev]);
      setName("");
    } catch {
      setError("Couldn't create that category — please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const previous = categories;
    setCategories((prev) => prev.filter((x) => x.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      setCategories(previous); // revert on failure
      setError("Couldn't delete that category — please try again.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New category name…"
          className="h-9 max-w-xs flex-1 rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary"
        />
        <Button variant="primary" onClick={add} disabled={adding}>
          {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create Category
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-8 text-xs text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading categories…
        </div>
      )}

      {!loading && categories.length === 0 && (
        <p className="py-10 text-center text-xs text-muted">No categories yet. Create one to get started.</p>
      )}

      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${c.color}1A`, color: c.color }}>
                    <Tag size={18} />
                  </div>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.productCount} products</p>
                  </div>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  className="rounded-md p-1.5 text-muted hover:bg-out/10 hover:text-out"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted">
                <span>Total stock</span>
                <span className="font-mono font-medium text-text">{c.totalStock.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (c.totalStock / 60000) * 100)}%`, backgroundColor: c.color }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
