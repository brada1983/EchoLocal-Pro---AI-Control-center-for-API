// Evaluates the latest stats sample + service status against thresholds in
// alert_config every 30s. Uses alert_events as a dedup/cooldown gate (one
// open event per kind) so a sustained breach doesn't spam Telegram.
const statsQueries = require("../../db/queries/stats");
const alertsQueries = require("../../db/queries/alerts");
const telegram = require("../telegram");
const { alertMessage } = require("../ws/protocol");

const EVAL_INTERVAL_MS = 30_000;

const DEFAULTS = {
  cpu_temp_threshold_c: "85",
  gpu_temp_threshold_c: "90",
  disk_free_pct_threshold: "10",
  service_down_enabled: "1",
};

function configValue(config, key) {
  return config[key] !== undefined ? config[key] : DEFAULTS[key];
}

async function fire(db, hub, kind, message) {
  const open = alertsQueries.getOpenEvent(db, kind);
  if (open) return; // already firing, don't re-notify until resolved
  alertsQueries.insertEvent(db, kind, message);
  hub.broadcast("alerts", alertMessage({ kind, message, ts: Date.now() }));
  await telegram.sendMessage(db, `⚠️ EchoLocal AI Control: ${message}`);
}

function resolve(db, hub, kind, message) {
  const open = alertsQueries.getOpenEvent(db, kind);
  if (!open) return;
  alertsQueries.resolveOpenEvent(db, kind);
  hub.broadcast("alerts", alertMessage({ kind: `${kind}_resolved`, message, ts: Date.now() }));
}

function start(hub, db) {
  let stopped = false;

  async function tick() {
    if (stopped) return;
    try {
      const config = alertsQueries.getConfig(db);
      const sample = statsQueries.getLatest(db);
      if (!sample) return;

      const gpuTempThreshold = parseFloat(configValue(config, "gpu_temp_threshold_c"));
      if (sample.gpu_temp_c !== null && sample.gpu_temp_c >= gpuTempThreshold) {
        await fire(db, hub, "gpu_overheat", `GPU temperature at ${sample.gpu_temp_c}°C (threshold ${gpuTempThreshold}°C)`);
      } else {
        resolve(db, hub, "gpu_overheat", "GPU temperature back to normal");
      }

      const diskFreePctThreshold = parseFloat(configValue(config, "disk_free_pct_threshold"));
      if (sample.disk_total_gb) {
        const freePct = ((sample.disk_total_gb - sample.disk_used_gb) / sample.disk_total_gb) * 100;
        if (freePct <= diskFreePctThreshold) {
          await fire(db, hub, "disk_low", `Disk free space at ${freePct.toFixed(1)}% (threshold ${diskFreePctThreshold}%)`);
        } else {
          resolve(db, hub, "disk_low", "Disk space back to normal");
        }
      }
    } catch (err) {
      console.error("[alert-engine] error:", err.message);
    }
  }

  const interval = setInterval(tick, EVAL_INTERVAL_MS);
  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

/** Called directly by service-status checks (in server.js) on every stats tick, not on the 30s timer, so a service-down alert fires within ~10s. */
async function checkServiceStatus(hub, db, services) {
  const config = alertsQueries.getConfig(db);
  if (configValue(config, "service_down_enabled") !== "1") return;

  for (const [kindSuffix, status] of [
    ["whisper-api", services.whisperApi],
    ["ollama", services.ollama],
  ]) {
    const kind = `service_down_${kindSuffix}`;
    if (status === "inactive" || status === "failed") {
      await fire(db, hub, kind, `${kindSuffix} is ${status}`);
    } else if (status === "active") {
      resolve(db, hub, kind, `${kindSuffix} is back up`);
    }
  }
}

module.exports = { start, checkServiceStatus };
