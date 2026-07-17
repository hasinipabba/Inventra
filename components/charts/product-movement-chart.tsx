"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { day: "Mon", inbound: 420, outbound: 380 },
  { day: "Tue", inbound: 380, outbound: 410 },
  { day: "Wed", inbound: 510, outbound: 460 },
  { day: "Thu", inbound: 460, outbound: 500 },
  { day: "Fri", inbound: 600, outbound: 540 },
  { day: "Sat", inbound: 340, outbound: 300 },
  { day: "Sun", inbound: 260, outbound: 220 },
];

export function ProductMovementChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border))", borderRadius: 10, fontSize: 12 }} />
        <Legend formatter={(v) => <span style={{ fontSize: 11, color: "rgb(var(--muted))" }}>{v}</span>} />
        <Line type="monotone" dataKey="inbound" name="Inbound" stroke="#3B82F6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="outbound" name="Outbound" stroke="#F97316" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
