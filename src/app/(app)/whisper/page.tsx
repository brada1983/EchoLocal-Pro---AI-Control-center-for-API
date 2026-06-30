"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

type WhisperConfig = {
  model_size: string;
  default_language: string;
  beam_size: string;
  vad_enabled: string;
};

type HealthInfo = { status?: string; device?: string; compute_type?: string; model?: string; error?: string };

const MODEL_SIZES = ["tiny", "base", "small", "medium", "large-v3", "large-v3-turbo"];

export default function WhisperPage() {
  const [config, setConfig] = useState<WhisperConfig | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [inflight, setInflight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function refresh() {
    const [configRes, healthRes, metricsRes] = await Promise.all([
      fetch("/api/whisper/config").then((r) => r.json()),
      fetch("/api/whisper/health").then((r) => r.json()),
      fetch("/api/whisper/metrics").then((r) => r.json()).catch(() => null),
    ]);
    setConfig(configRes);
    setHealth(healthRes);
    setInflight(metricsRes?.inflight ?? null);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/whisper/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setNote(data.note ?? "Saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <p className="text-sm text-text-secondary">Loading...</p>;

  const gpuAvailable = health?.device === "cuda" || health?.device === "rocm";

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-text-primary">Whisper</h1>

      <div className="card p-4 space-y-2">
        <p className="label">Status</p>
        <p className="text-sm text-text-primary">
          {health?.status === "ok" ? `Running — ${health.model ?? "unknown model"}` : "Unreachable"}
        </p>
        <p className="text-sm text-text-secondary">
          Compute: <span className="mono">{health?.device ?? "—"} / {health?.compute_type ?? "—"}</span>
        </p>
        {!gpuAvailable && (
          <div className="flex items-start gap-2 text-xs text-accent-orange mt-1">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              GPU not available — the LXC&apos;s ROCm iGPU isn&apos;t visible to ctranslate2,
              so Whisper runs on CPU int8. See project notes for details.
            </span>
          </div>
        )}
        {inflight !== null && (
          <p className="text-sm text-text-secondary">
            In-flight requests: <span className="mono text-text-primary">{inflight}</span>
          </p>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <p className="label">Model & parameters</p>

        <div className="space-y-1">
          <label className="label">Model size</label>
          <select
            className="input"
            value={config.model_size}
            onChange={(e) => setConfig({ ...config, model_size: e.target.value })}
          >
            {MODEL_SIZES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="label">Default language</label>
          <input
            className="input"
            value={config.default_language}
            onChange={(e) => setConfig({ ...config, default_language: e.target.value })}
            placeholder="auto"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Beam size</label>
          <input
            type="number"
            min={1}
            max={10}
            className="input"
            value={config.beam_size}
            onChange={(e) => setConfig({ ...config, beam_size: e.target.value })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={config.vad_enabled === "1"}
            onChange={(e) => setConfig({ ...config, vad_enabled: e.target.checked ? "1" : "0" })}
          />
          Voice activity detection (VAD)
        </label>

        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save"}
        </button>
        {note && <p className="text-xs text-text-secondary">{note}</p>}
      </div>
    </div>
  );
}
