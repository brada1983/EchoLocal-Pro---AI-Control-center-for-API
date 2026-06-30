"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Trash2, Cpu } from "lucide-react";
import { Badge } from "@/components/Badge";
import { useWebSocketChannel } from "@rootlib/ws-client";

type Model = { name: string; size: number };
type LoadedModel = { name: string; size_vram: number; expires_at: string };

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loaded, setLoaded] = useState<LoadedModel[]>([]);
  const [pullName, setPullName] = useState("");
  const [pullProgress, setPullProgress] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [tagsRes, psRes, defaultsRes] = await Promise.all([
      fetch("/api/ollama/tags").then((r) => r.json()),
      fetch("/api/ollama/ps").then((r) => r.json()),
      fetch("/api/config/default-model").then((r) => r.json()),
    ]);
    setModels(tagsRes.models ?? []);
    setLoaded(psRes.models ?? []);
    setDefaults(defaultsRes ?? {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const channels = pullName ? [`pull:${pullName}`] : [];
  useWebSocketChannel(
    channels,
    useCallback((msg) => {
      if (msg.type === "pull-progress") {
        const data = msg.data as { status: string; completed?: number; total?: number };
        if (data.status === "success") {
          setPullProgress("done");
          setTimeout(() => {
            setPullProgress(null);
            setPullName("");
            refresh();
          }, 1500);
        } else if (data.status === "error") {
          setPullProgress("error");
        } else if (data.completed && data.total) {
          setPullProgress(`${data.status} ${Math.round((data.completed / data.total) * 100)}%`);
        } else {
          setPullProgress(data.status);
        }
      }
    }, [refresh])
  );

  async function startPull(e: React.FormEvent) {
    e.preventDefault();
    if (!pullName.trim()) return;
    setPullProgress("starting...");
    await fetch("/api/ollama/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: pullName }),
    });
  }

  async function deleteModel(name: string) {
    setBusy(true);
    try {
      await fetch("/api/ollama/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: name }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(useCase: string, model: string) {
    await fetch("/api/config/default-model", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useCase, model }),
    });
    setDefaults((d) => ({ ...d, [useCase]: model }));
  }

  const loadedNames = new Set(loaded.map((m) => m.name));

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-lg font-semibold text-text-primary">Ollama Models</h1>

      <form onSubmit={startPull} className="card p-4 space-y-2">
        <p className="label">Pull a model</p>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="e.g. llama3.2:latest"
            value={pullName}
            onChange={(e) => setPullName(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={!!pullProgress}>
            <Download className="w-4 h-4" />
            Pull
          </button>
        </div>
        {pullProgress && (
          <div className="relative h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div className="absolute inset-0 progress-bar-shimmer bg-accent-blue-muted" />
          </div>
        )}
        {pullProgress && <p className="text-xs text-text-secondary">{pullProgress}</p>}
      </form>

      <div className="card divide-y divide-border">
        {models.length === 0 && <p className="p-4 text-sm text-text-secondary">No models installed.</p>}
        {models.map((m) => (
          <div key={m.name} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary mono">{m.name}</p>
              <p className="text-xs text-text-secondary mt-0.5">{formatBytes(m.size)}</p>
            </div>
            <div className="flex items-center gap-2">
              {loadedNames.has(m.name) && (
                <Badge tone="green">
                  <Cpu className="w-3 h-3 mr-1" /> loaded
                </Badge>
              )}
              <button className="btn-icon" disabled={busy} onClick={() => deleteModel(m.name)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <p className="label">Default model per use-case</p>
        {["transcription_summary", "chat"].map((useCase) => (
          <div key={useCase} className="flex items-center justify-between gap-3">
            <span className="text-sm text-text-secondary mono">{useCase}</span>
            <select
              className="input max-w-xs"
              value={defaults[useCase] ?? ""}
              onChange={(e) => setDefault(useCase, e.target.value)}
            >
              <option value="">— none —</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
