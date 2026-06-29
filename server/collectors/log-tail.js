// Live-tails `journalctl -u <unit> -f` for whisper-api and ollama, streaming
// each line to its `logs:<unit>` WS channel. Off the LXC (no journalctl,
// e.g. this Windows dev machine) or in mock mode, emits synthetic lines on
// an interval instead so the log viewer UI is still fully testable.
const { spawn } = require("child_process");
const { logMessage } = require("../ws/protocol");

const UNITS = ["whisper-api", "ollama"];
const MOCK = process.env.MOCK_COLLECTORS === "1";
const RING_BUFFER_SIZE = 500;

const ringBuffers = new Map(UNITS.map((u) => [u, []]));

function pushToRingBuffer(unit, line) {
  const buf = ringBuffers.get(unit);
  buf.push(line);
  if (buf.length > RING_BUFFER_SIZE) buf.shift();
}

function getRecentLines(unit) {
  return ringBuffers.get(unit) || [];
}

function startRealTail(unit, hub) {
  const child = spawn("journalctl", ["-u", unit, "-f", "-n", "0", "-o", "short-iso"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    for (const raw of chunk.toString("utf8").split("\n")) {
      if (!raw.trim()) continue;
      const line = { ts: Date.now(), raw };
      pushToRingBuffer(unit, line);
      hub.broadcast(`logs:${unit}`, logMessage(`logs:${unit}`, line));
    }
  });

  child.on("error", (err) => {
    console.error(`[log-tail] journalctl unavailable for ${unit}:`, err.message);
  });

  return () => child.kill();
}

function startMockTail(unit, hub) {
  const samples = [
    `${unit}: handling request`,
    `${unit}: request completed in 842ms`,
    `${unit}: health check ok`,
    `${unit}: model loaded`,
];
  const interval = setInterval(() => {
    const raw = `${new Date().toISOString()} ${unit}[mock]: ${
      samples[Math.floor(Math.random() * samples.length)]
    }`;
    const line = { ts: Date.now(), raw };
    pushToRingBuffer(unit, line);
    hub.broadcast(`logs:${unit}`, logMessage(`logs:${unit}`, line));
  }, 3000);
  return () => clearInterval(interval);
}

function start(hub) {
  const stoppers = UNITS.map((unit) =>
    MOCK ? startMockTail(unit, hub) : startRealTail(unit, hub)
  );
  return () => stoppers.forEach((stop) => stop());
}

module.exports = { start, getRecentLines, UNITS };
