"use client";

import { useState } from "react";

export default function PlaygroundPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-text-primary">API Playground</h1>
      <WhisperPanel />
      <OllamaPanel />
    </div>
  );
}

function WhisperPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("model", "whisper-1");
      if (language) form.append("language", language);
      const res = await fetch("/api/whisper/transcribe", { method: "POST", body: form });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="label">Whisper — POST /v1/audio/transcriptions</p>
      <input
        type="file"
        accept="audio/*,video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-text-secondary"
      />
      <input
        className="input"
        placeholder="language (optional, e.g. en)"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      />
      <button className="btn-primary" disabled={!file || loading} onClick={run}>
        {loading ? "Transcribing..." : "Send"}
      </button>
      {result && <pre className="mono text-xs bg-background-tertiary p-3 rounded overflow-x-auto">{result}</pre>}
    </div>
  );
}

function OllamaPanel() {
  const [mode, setMode] = useState<"generate" | "chat">("generate");
  const [model, setModel] = useState("llama3.2:latest");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const body =
        mode === "generate"
          ? { model, prompt }
          : { model, messages: [{ role: "user", content: prompt }] };
      const res = await fetch(`/api/ollama/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="label">Ollama — POST /api/{mode}</p>
      <div className="flex gap-2">
        <button
          className={mode === "generate" ? "btn-secondary" : "btn-ghost"}
          onClick={() => setMode("generate")}
        >
          generate
        </button>
        <button className={mode === "chat" ? "btn-secondary" : "btn-ghost"} onClick={() => setMode("chat")}>
          chat
        </button>
      </div>
      <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="model" />
      <textarea
        className="input min-h-24"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="prompt / message"
      />
      <button className="btn-primary" disabled={!prompt || loading} onClick={run}>
        {loading ? "Sending..." : "Send"}
      </button>
      {result && <pre className="mono text-xs bg-background-tertiary p-3 rounded overflow-x-auto">{result}</pre>}
    </div>
  );
}
