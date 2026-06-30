"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { useWebSocketChannel } from "@rootlib/ws-client";

type AlertConfig = {
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  cpu_temp_threshold_c?: string;
  gpu_temp_threshold_c?: string;
  disk_free_pct_threshold?: string;
  service_down_enabled?: string;
};

type AlertEvent = { id: number; ts: number; kind: string; message: string; resolved_at: number | null };

const DEFAULTS: AlertConfig = {
  cpu_temp_threshold_c: "85",
  gpu_temp_threshold_c: "90",
  disk_free_pct_threshold: "10",
  service_down_enabled: "1",
};

export default function AlertsPage() {
  const [config, setConfig] = useState<AlertConfig>(DEFAULTS);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch("/api/alerts/config").then((r) => r.json());
    setConfig({ ...DEFAULTS, ...res.config });
    setEvents(res.events ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  useWebSocketChannel(
    ["alerts"],
    useCallback((msg) => {
      if (msg.type === "alert") refresh();
    }, [])
  );

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/alerts/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-text-primary">Alerts</h1>

      <div className="card p-4 space-y-3">
        <p className="label">Telegram</p>
        <input
          className="input"
          placeholder="Bot token"
          value={config.telegram_bot_token ?? ""}
          onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })}
        />
        <input
          className="input"
          placeholder="Chat ID"
          value={config.telegram_chat_id ?? ""}
          onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
        />
      </div>

      <div className="card p-4 space-y-3">
        <p className="label">Thresholds</p>
        <Field
          label="CPU temp (°C)"
          value={config.cpu_temp_threshold_c ?? ""}
          onChange={(v) => setConfig({ ...config, cpu_temp_threshold_c: v })}
        />
        <Field
          label="GPU temp (°C)"
          value={config.gpu_temp_threshold_c ?? ""}
          onChange={(v) => setConfig({ ...config, gpu_temp_threshold_c: v })}
        />
        <Field
          label="Disk free (%)"
          value={config.disk_free_pct_threshold ?? ""}
          onChange={(v) => setConfig({ ...config, disk_free_pct_threshold: v })}
        />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={config.service_down_enabled === "1"}
            onChange={(e) =>
              setConfig({ ...config, service_down_enabled: e.target.checked ? "1" : "0" })
            }
          />
          Alert on service down
        </label>
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="card divide-y divide-border">
        <p className="label p-4 pb-0">Recent alerts</p>
        {events.length === 0 && <p className="p-4 text-sm text-text-secondary">No alerts yet.</p>}
        {events.map((e) => (
          <div key={e.id} className="p-3 flex items-center justify-between text-sm">
            <div>
              <p className="text-text-primary">{e.message}</p>
              <p className="text-xs text-text-secondary mono">{new Date(e.ts * 1000).toLocaleString()}</p>
            </div>
            <span className={clsx("badge", e.resolved_at ? "bg-background-tertiary text-text-secondary" : "bg-accent-red-muted/20 text-accent-red")}>
              {e.resolved_at ? "resolved" : "active"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-text-secondary">{label}</label>
      <input className="input max-w-[120px]" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
