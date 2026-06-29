// Single interval that gathers system + GPU + service status into one
// consistent snapshot, persists it, and broadcasts it — rather than three
// independent intervals racing to push partial updates over the same channel.
const { getSystemStats, getMockSystemStats } = require("./system-stats");
const { getGpuStats, getMockGpuStats } = require("./gpu-stats");
const { getServiceStatus, getMockServiceStatus } = require("./service-status");
const statsQueries = require("../../db/queries/stats");
const { statsMessage } = require("../ws/protocol");
const alertEngine = require("./alert-engine");

const TICK_INTERVAL_MS = 10_000;
const MOCK = process.env.MOCK_COLLECTORS === "1";

function start(hub, db) {
  let stopped = false;

  async function tick() {
    if (stopped) return;
    try {
      const [system, gpu, services] = await Promise.all([
        MOCK ? getMockSystemStats() : getSystemStats(),
        MOCK ? getMockGpuStats() : getGpuStats(),
        MOCK ? getMockServiceStatus() : getServiceStatus(),
      ]);
      const ts = Math.floor(Date.now() / 1000);

      statsQueries.insertSample(db, {
        ts,
        cpuPct: system.cpuPct,
        ramUsedMb: system.ramUsedMb,
        ramTotalMb: system.ramTotalMb,
        diskUsedGb: system.diskUsedGb,
        diskTotalGb: system.diskTotalGb,
        netRxBytes: system.netRxBytes,
        netTxBytes: system.netTxBytes,
        gpuUtilPct: gpu.available ? gpu.utilPct : null,
        gpuVramUsedMb: gpu.available ? gpu.vramUsedMb : null,
        gpuVramTotalMb: gpu.available ? gpu.vramTotalMb : null,
        gpuTempC: gpu.available ? gpu.tempC : null,
        gpuPowerW: gpu.available ? gpu.powerW : null,
      });

      hub.broadcast("stats", statsMessage({ ts, system, gpu, services }));
      await alertEngine.checkServiceStatus(hub, db, services);
    } catch (err) {
      console.error("[stats-tick] error:", err.message);
    }
  }

  tick();
  const interval = setInterval(tick, TICK_INTERVAL_MS);
  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

module.exports = { start };
