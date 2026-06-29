"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusDot } from "@/components/StatusDot";
import { useWebSocketChannel } from "@rootlib/ws-client";

type ServiceState = "active" | "inactive" | "failed" | "unknown";

const UNITS: { unit: string; label: string; statsKey: "whisperApi" | "ollama" }[] = [
  { unit: "whisper-api", label: "Whisper API", statsKey: "whisperApi" },
  { unit: "ollama", label: "Ollama", statsKey: "ollama" },
];

const CHANNELS = ["stats"];

export default function ServicesPage() {
  const [status, setStatus] = useState<Record<string, ServiceState>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services/status")
      .then((r) => r.json())
      .then((data) => setStatus({ "whisper-api": data.whisperApi, ollama: data.ollama }))
      .catch(() => {});
  }, []);

  useWebSocketChannel(
    CHANNELS,
    useCallback((msg) => {
      if (msg.type === "stats") {
        const data = msg.data as { services: { whisperApi: ServiceState; ollama: ServiceState } };
        setStatus({ "whisper-api": data.services.whisperApi, ollama: data.services.ollama });
      }
    }, [])
  );

  async function act(unit: string, action: "start" | "stop" | "restart") {
    setBusy(`${unit}:${action}`);
    try {
      await fetch(`/api/services/${unit}/${action}`, { method: "POST" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-lg font-semibold text-text-primary">Services</h1>
      {UNITS.map(({ unit, label }) => (
        <div key={unit} className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusDot status={status[unit] ?? "unknown"} pulse />
            <div>
              <p className="text-sm font-medium text-text-primary">{label}</p>
              <p className="text-xs text-text-secondary">{status[unit] ?? "checking..."}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={busy !== null}
              onClick={() => act(unit, "start")}
            >
              Start
            </button>
            <button
              className="btn-secondary"
              disabled={busy !== null}
              onClick={() => act(unit, "restart")}
            >
              Restart
            </button>
            <button
              className="btn-danger"
              disabled={busy !== null}
              onClick={() => act(unit, "stop")}
            >
              Stop
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
