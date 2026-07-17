"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { warehouses } from "@/lib/mock-data";

const COLORS = ["#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6"];

export function WarehouseBar() {
  const data = warehouses.map((w) => ({ name: w.name.split("—")[1]?.trim() ?? w.name, utilization: Math.round((w.used / w.capacity) * 100) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={36} unit="%" />
        <Tooltip contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }} />
        <Bar dataKey="utilization" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
