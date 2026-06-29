type GpuStats = {
  available: boolean;
  utilPct?: number | null;
  vramUsedMb?: number | null;
  vramTotalMb?: number | null;
  tempC?: number | null;
  powerW?: number | null;
};

export function GpuGauge({ gpu }: { gpu: GpuStats | null }) {
  if (!gpu || !gpu.available) {
    return (
      <div className="card p-4">
        <p className="label mb-2">GPU (AMD 890M / ROCm)</p>
        <p className="text-sm text-text-secondary">
          Not available here — rocm-smi only runs on the LXC.
        </p>
      </div>
    );
  }

  const vramPct =
    gpu.vramUsedMb && gpu.vramTotalMb ? Math.round((gpu.vramUsedMb / gpu.vramTotalMb) * 100) : 0;

  return (
    <div className="card p-4 space-y-2">
      <p className="label">GPU (AMD 890M / ROCm)</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Utilization" value={`${gpu.utilPct ?? "—"}%`} />
        <Stat label="Temperature" value={`${gpu.tempC ?? "—"}°C`} />
        <Stat label="Power" value={`${gpu.powerW ?? "—"} W`} />
        <Stat
          label="VRAM"
          value={
            gpu.vramUsedMb && gpu.vramTotalMb
              ? `${(gpu.vramUsedMb / 1024).toFixed(1)} / ${(gpu.vramTotalMb / 1024).toFixed(1)} GB`
              : "—"
          }
        />
      </div>
      <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
        <div className="h-full bg-accent-purple" style={{ width: `${vramPct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-muted text-xs">{label}</p>
      <p className="text-text-primary mono">{value}</p>
    </div>
  );
}
