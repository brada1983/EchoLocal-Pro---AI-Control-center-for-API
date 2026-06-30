// Custom entrypoint: wraps Next's request handler in a raw http.Server and
// attaches a `ws` WebSocket server on the `upgrade` event, so live stats/logs
// push to the browser without a separate process/port. Background collectors
// (stats, logs, alerts, metrics ingestion) are started here too, since Next
// API routes are request-scoped and can't host long-lived intervals.
//
// Env vars MUST be loaded before any other require() below — several
// collector modules read process.env.* at module-load time (e.g.
// MOCK_COLLECTORS), and Next's own .env loading only kicks in once
// next({...}) is called further down, which would be too late.
//
// .env.local (dev-only, gitignored) is loaded first so it takes priority;
// .env (the systemd EnvironmentFile on the LXC) fills in anything not
// already set. dotenv never overwrites a key already in process.env, so
// this order gives .env.local precedence without any NODE_ENV branching.
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const http = require("http");
const next = require("next");
const { WebSocketServer } = require("ws");

const { getDb } = require("./db/client");
const hub = require("./server/ws/hub-instance");
const { authenticateUpgradeRequest, rejectUpgrade } = require("./server/ws/auth");

const statsTick = require("./server/collectors/stats-tick");
const logTail = require("./server/collectors/log-tail");
const metricsPoller = require("./server/collectors/metrics-poller");
const alertEngine = require("./server/collectors/alert-engine");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3300", 10);
const hostname = process.env.HOST || "0.0.0.0";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();
  const db = await getDb();

  const server = http.createServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    if (!req.url?.startsWith("/ws")) {
      socket.destroy();
      return;
    }
    const session = await authenticateUpgradeRequest(req);
    if (!session) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === "subscribe" && typeof msg.channel === "string") {
        hub.subscribe(msg.channel, ws);
      } else if (msg.type === "unsubscribe" && typeof msg.channel === "string") {
        hub.unsubscribe(msg.channel, ws);
      } else if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    });
    ws.on("close", () => hub.removeSocket(ws));
  });

  const stoppers = [
    statsTick.start(hub, db),
    logTail.start(hub),
    metricsPoller.start(db),
    alertEngine.start(hub, db),
  ];

  const shutdown = () => {
    console.log("[server] shutting down...");
    stoppers.forEach((stop) => stop());
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  server.listen(port, hostname, () => {
    console.log(`[server] EchoLocal AI Control listening on http://${hostname}:${port} (${dev ? "dev" : "production"})`);
  });
}

main().catch((err) => {
  console.error("[server] fatal startup error:", err);
  process.exit(1);
});
