"use client";

import { useCallback, useState } from "react";
import { StatusDot } from "@/components/StatusDot";
import { GpuGauge } from "@/components/GpuGauge";
import { useWebSocketChannel } from "@rootlib/ws-client";

type StatsData = {
  ts: number;
  system: {
    cpuPct: number;
    ramUsedMb: number;
    ramTotalMb: number;
    diskUsedGb: number;
    diskTotalGb: number;
  };
  gpu: { available: boolean; utilPct?: number | null; tempC?: number | null; powerW?: number | null; vramUsedMb?: number | null; vramTotalMb?: number | null };
  services: { whisperApi: "active" | "inactive" | "failed" | "unknown"; ollama: "active" | "inactive" | "failed" | "unknown" };
};

const CHANNELS = ["stats"];

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const { connected } = useWebSocketChannel(
    CHANNELS,
    useCallback((msg) => {
      if (msg.type === "stats") setStats(msg.data as StatsData);
    }, [])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <StatusDot status={connected ? "active" : "failed"} />
          {connected ? "live" : "reconnecting..."}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Whisper API</p>
            <p className="text-xs text-text-secondary mt-0.5">CPU int8 · large-v3-turbo</p>
          </div>
          <StatusDot status={stats?.services.whisperApi ?? "unknown"} pulse />
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Ollama</p>
            <p className="text-xs text-text-secondary mt-0.5">GPU ROCm · gfx1150</p>
          </div>
          <StatusDot status={stats?.services.ollama ?? "unknown"} pulse />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="CPU" value={stats ? `${stats.system.cpuPct}%` : "—"} />
        <MetricCard
          label="RAM"
          value={
            stats
              ? `${(stats.system.ramUsedMb / 1024).toFixed(1)} / ${(stats.system.ramTotalMb / 1024).toFixed(1)} GB`
              : "—"
          }
        />
        <MetricCard
          label="Disk"
          value={
            stats
              ? `${stats.system.diskUsedGb.toFixed(0)} / ${stats.system.diskTotalGb.toFixed(0)} GB`
              : "—"
          }
        />
      </div>

      <GpuGauge gpu={stats?.gpu ?? null} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className="text-xl font-semibold text-text-primary mono mt-1">{value}</p>
    </div>
  );
}
