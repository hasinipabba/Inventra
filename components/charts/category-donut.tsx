"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { categories } from "@/lib/mock-data";

export function CategoryDonut() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={categories}
          dataKey="productCount"
          nameKey="name"
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          strokeWidth={0}
        >
          {categories.map((c) => (
            <Cell key={c.id} fill={c.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(v) => <span style={{ fontSize: 11, color: "rgb(var(--muted))" }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
