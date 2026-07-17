"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { weeklyScanActivity } from "@/lib/mock-data";

export function WeeklyScanChart() {
  const max = Math.max(...weeklyScanActivity.map((d) => d.scans));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={weeklyScanActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          cursor={{ fill: "rgb(var(--surface-2))" }}
          contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }}
        />
        <Bar dataKey="scans" name="Scans" radius={[6, 6, 0, 0]}>
          {weeklyScanActivity.map((d) => (
            <Cell key={d.day} fill={d.scans === max ? "#3B82F6" : "rgb(var(--primary) / 0.35)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
