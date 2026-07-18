"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", value: 30 },
  { month: "Feb", value: 25 },
  { month: "Mar", value: 55 },
  { month: "Apr", value: 75 },
  { month: "May", value: 70 },
  { month: "Jun", value: 80 },
  { month: "Jul", value: 95 },
];

export function InventoryHealthChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(47,129,247,0.25)" />
            <stop offset="100%" stopColor="rgba(47,129,247,0)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "var(--text-2)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: "var(--text-2)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          tickFormatter={(value: number) => `${value}%`}
        />
        <Tooltip
          contentStyle={{ background: "var(--card-bg)", border: "none", borderRadius: 6 }}
          labelStyle={{ color: "var(--text-2)" }}
          itemStyle={{ color: "var(--text)" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#2F81F7"
          strokeWidth={2}
          fill="url(#healthGradient)"
          activeDot={{ r: 5, fill: "#2F81F7", stroke: "var(--card-bg)", strokeWidth: 2 }}
          dot={{ r: 3, fill: "#2F81F7", stroke: "none" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
