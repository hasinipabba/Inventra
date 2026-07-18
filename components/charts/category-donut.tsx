"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { categories } from "@/lib/mock-data";

const COLORS = ["#2F81F7", "#3FB950", "#A371F7", "#F85149", "#E3A941", "#EA580C"];

export function CategoryDonut() {
  const total = categories.reduce((sum, c) => sum + c.productCount, 0);

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={categories}
              dataKey="productCount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              strokeWidth={0}
              stroke="none"
            >
              {categories.map((c, i) => (
                <Cell key={c.id} fill={COLORS[i % COLORS.length]} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold text-[var(--text)]">{total}</span>
          <span className="text-[9px] uppercase tracking-widest text-[var(--text-2)]">Cats</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {categories.map((c, i) => (
          <div key={c.id} className="flex min-w-0 items-center gap-1.5">
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="truncate text-[11px] text-[var(--text-2)]">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
