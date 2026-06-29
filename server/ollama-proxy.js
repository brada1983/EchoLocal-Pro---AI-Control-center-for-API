// Thin wrappers around Ollama's own REST API. Every call here is logged into
// request_log (see db/queries/requests.js) by the route handlers that use
// this module, since the dashboard is the only Ollama traffic path it can
// see/account for (Ollama itself exposes no request-log endpoint).
function baseUrl() {
  return process.env.OLLAMA_BASE_URL || "http://192.168.0.3:11434";
}

async function tags() {
  const res = await fetch(`${baseUrl()}/api/tags`);
  if (!res.ok) throw new Error(`Ollama /api/tags returned ${res.status}`);
  return res.json();
}

/** Currently loaded-in-VRAM models, like `ollama ps`. */
async function ps() {
  const res = await fetch(`${baseUrl()}/api/ps`);
  if (!res.ok) throw new Error(`Ollama /api/ps returned ${res.status}`);
  return res.json();
}

/**
 * Streams NDJSON pull progress. `onProgress(obj)` is called per line;
 * callers (the /api/ollama/pull route) rebroadcast each one over the
 * `pull:<model>` WS channel.
 */
async function pull(model, onProgress) {
  const res = await fetch(`${baseUrl()}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Ollama /api/pull returned ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onProgress(JSON.parse(line));
      } catch {
        // ignore malformed line, keep streaming
      }
    }
  }
}

async function deleteModel(model) {
  const res = await fetch(`${baseUrl()}/api/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model }),
  });
  if (!res.ok) throw new Error(`Ollama /api/delete returned ${res.status}`);
}

async function generate(payload) {
  const res = await fetch(`${baseUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama /api/generate returned ${res.status}`);
  return res.json();
}

async function chat(payload) {
  const res = await fetch(`${baseUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama /api/chat returned ${res.status}`);
  return res.json();
}

module.exports = { baseUrl, tags, ps, pull, deleteModel, generate, chat };
