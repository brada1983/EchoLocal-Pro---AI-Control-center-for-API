// Thin wrappers around the whisper-api FastAPI server, replicating the exact
// contract EchoLocal Pro's own remote client already uses
// (src-tauri/src/transcription/remote.rs): GET /health, POST
// /v1/audio/transcriptions multipart, and the new GET /metrics endpoint added
// by patches/server.py.patch.
function baseUrl() {
  return process.env.WHISPER_BASE_URL || "http://192.168.0.3:8000";
}

async function health() {
  const res = await fetch(`${baseUrl()}/health`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Whisper /health returned ${res.status}`);
  return res.json();
}

/** `file` is a Blob/File, `opts` may include `model`, `language`. */
async function transcribe(file, opts = {}) {
  const form = new FormData();
  form.append("file", file);
  form.append("model", opts.model || "whisper-1");
  form.append("response_format", "verbose_json");
  if (opts.language) form.append("language", opts.language);

  const res = await fetch(`${baseUrl()}/v1/audio/transcriptions`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper transcription returned ${res.status}`);
  return res.json();
}

/** Returns null (rather than throwing) when the patch hasn't been applied yet / server unreachable. */
async function metrics() {
  try {
    const res = await fetch(`${baseUrl()}/metrics`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

module.exports = { baseUrl, health, transcribe, metrics };
