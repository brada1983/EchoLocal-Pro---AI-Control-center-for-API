"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Point = Record<string, number | null>;

export function StatsChart({
  data,
  xKey,
  lines,
  height = 220,
}: {
  data: Point[];
  xKey: string;
  lines: { key: string; color: string; label: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickFormatter={(v) => new Date(v * 1000).toLocaleTimeString()}
          stroke="#8b949e"
          fontSize={11}
        />
        <YAxis stroke="#8b949e" fontSize={11} />
        <Tooltip
          contentStyle={{ background: "#161b22", border: "1px solid #21262d", fontSize: 12 }}
          labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={l.color}
            dot={false}
            strokeWidth={1.5}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
