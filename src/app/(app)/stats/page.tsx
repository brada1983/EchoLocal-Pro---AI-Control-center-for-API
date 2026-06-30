"use client";

import { useEffect, useState } from "react";
import { StatsChart } from "@/components/StatsChart";

type SystemSample = {
  ts: number;
  cpu_pct: number | null;
  ram_used_mb: number | null;
  gpu_util_pct: number | null;
  gpu_temp_c: number | null;
};

const RANGES = ["1h", "24h", "7d"] as const;

export default function StatsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1h");
  const [system, setSystem] = useState<SystemSample[]>([]);

  useEffect(() => {
    fetch(`/api/stats/${range}`)
      .then((r) => r.json())
      .then((data) => setSystem(data.system ?? []));
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Stats</h1>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              className={r === range ? "btn-secondary" : "btn-ghost"}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <p className="label mb-2">CPU / RAM</p>
        <StatsChart
          data={system}
          xKey="ts"
          lines={[
            { key: "cpu_pct", color: "#58a6ff", label: "CPU %" },
          ]}
        />
      </div>

      <div className="card p-4">
        <p className="label mb-2">GPU utilization / temperature</p>
        <StatsChart
          data={system}
          xKey="ts"
          lines={[
            { key: "gpu_util_pct", color: "#a371f7", label: "GPU %" },
            { key: "gpu_temp_c", color: "#d29922", label: "GPU °C" },
          ]}
        />
      </div>

      {system.length === 0 && (
        <p className="text-sm text-text-secondary">No data yet for this range.</p>
      )}
    </div>
  );
}
