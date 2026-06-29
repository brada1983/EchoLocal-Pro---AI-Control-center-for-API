// Polls whisper-api's /metrics endpoint (added by patches/server.py.patch)
// and ingests new request entries into request_log. Poll, not push, so the
// Whisper server never depends on the dashboard being reachable — see the
// "server.py instrumentation" section of the build plan for the rationale.
const whisperProxy = require("../whisper-proxy");
const requestsQueries = require("../../db/queries/requests");

const POLL_INTERVAL_MS = 7_000;
const MOCK = process.env.MOCK_COLLECTORS === "1";

function start(db) {
  let stopped = false;
  let lastSeenTs = requestsQueries.getLastIngestedTs(db, "whisper") || 0;

  async function tick() {
    if (stopped) return;
    try {
      if (MOCK) {
        if (Math.random() < 0.4) {
          requestsQueries.insertRequestLog(db, {
            ts: Math.floor(Date.now() / 1000),
            service: "whisper",
            route: "/v1/audio/transcriptions",
            statusCode: 200,
            latencyMs: Math.round(1500 + Math.random() * 4000),
            model: "large-v3-turbo",
          });
        }
        return;
      }

      const data = await whisperProxy.metrics();
      if (!data || !Array.isArray(data.recent)) return;

      for (const entry of data.recent) {
        if (entry.ts <= lastSeenTs) continue;
        requestsQueries.insertRequestLog(db, {
          ts: Math.floor(entry.ts),
          service: "whisper",
          route: entry.route,
          statusCode: entry.status_code,
          latencyMs: Math.round(entry.latency_ms),
          error: entry.error,
        });
        lastSeenTs = Math.max(lastSeenTs, entry.ts);
      }
    } catch (err) {
      console.error("[metrics-poller] error:", err.message);
    }
  }

  tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

module.exports = { start };
