"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { inventoryTrend } from "@/lib/mock-data";

export function InventoryHealthChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={inventoryTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="inStockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }}
        />
        <Area type="monotone" dataKey="inStock" name="In Stock" stroke="#3B82F6" fill="url(#inStockGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="lowStock" name="Low Stock" stroke="#F59E0B" fill="transparent" strokeWidth={2} />
        <Area type="monotone" dataKey="outOfStock" name="Out of Stock" stroke="#EF4444" fill="transparent" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
