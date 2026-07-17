"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { expiryTimeline } from "@/lib/mock-data";

const COLORS = ["#EF4444", "#F97316", "#F59E0B", "#6B7280"];

export function ExpiryTimelineChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={expiryTimeline} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--border))" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="week" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={80} />
        <Tooltip contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
          {expiryTimeline.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
