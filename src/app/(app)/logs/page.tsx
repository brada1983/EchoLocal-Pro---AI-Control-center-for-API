"use client";

import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { useWebSocketChannel } from "@rootlib/ws-client";

type LogLine = { ts: number; raw: string };

const UNITS = ["whisper-api", "ollama"] as const;
const MAX_LINES = 1000;

export default function LogsPage() {
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("whisper-api");
  const [filter, setFilter] = useState("");
  const [lines, setLines] = useState<LogLine[]>([]);

  const channel = `logs:${unit}`;
  const { connected } = useWebSocketChannel(
    useMemo(() => [channel], [channel]),
    useCallback(
      (msg) => {
        if (msg.type === "log" && msg.channel === channel) {
          setLines((prev) => {
            const next = [...prev, msg.line as LogLine];
            return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
          });
        }
      },
      [channel]
    )
  );

  function switchUnit(next: (typeof UNITS)[number]) {
    setUnit(next);
    setLines([]);
  }

  const filtered = filter.trim()
    ? lines.filter((l) => l.raw.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Logs</h1>
        <span className={clsx("text-xs", connected ? "text-accent-green" : "text-accent-red")}>
          {connected ? "live" : "disconnected"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {UNITS.map((u) => (
          <button
            key={u}
            className={u === unit ? "btn-secondary" : "btn-ghost"}
            onClick={() => switchUnit(u)}
          >
            {u}
          </button>
        ))}
        <input
          className="input max-w-xs ml-auto"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className="btn-ghost" onClick={() => setLines([])}>
          Clear
        </button>
      </div>

      <div className="card flex-1 overflow-y-auto p-3 mono text-xs space-y-0.5">
        {filtered.length === 0 && <p className="text-text-muted">Waiting for log lines...</p>}
        {filtered.map((line, i) => (
          <div key={i} className="text-text-secondary whitespace-pre-wrap break-all">
            {line.raw}
          </div>
        ))}
      </div>
    </div>
  );
}
