// Real CPU/RAM/disk/network stats via `systeminformation` — pure JS, works
// on any host (including this Windows dev machine), so it's genuinely real
// data even before the app is ever deployed to the LXC.
const si = require("systeminformation");

async function getSystemStats() {
  const [cpu, mem, fsSize, netStats] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
  ]);

  const rootFs = fsSize.find((f) => f.mount === "/" || f.mount === "C:") || fsSize[0];
  const net = netStats[0];

  return {
    cpuPct: Math.round(cpu.currentLoad * 10) / 10,
    ramUsedMb: Math.round(mem.active / 1024 / 1024),
    ramTotalMb: Math.round(mem.total / 1024 / 1024),
    diskUsedGb: rootFs ? Math.round((rootFs.used / 1024 / 1024 / 1024) * 10) / 10 : null,
    diskTotalGb: rootFs ? Math.round((rootFs.size / 1024 / 1024 / 1024) * 10) / 10 : null,
    netRxBytes: net?.rx_bytes ?? null,
    netTxBytes: net?.tx_bytes ?? null,
  };
}

function getMockSystemStats() {
  const t = Date.now() / 1000;
  return {
    cpuPct: Math.round((30 + 20 * Math.sin(t / 10)) * 10) / 10,
    ramUsedMb: 6200 + Math.round(400 * Math.sin(t / 15)),
    ramTotalMb: 16384,
    diskUsedGb: 84.5,
    diskTotalGb: 200,
    netRxBytes: Math.round(1_000_000 + 500_000 * Math.random()),
    netTxBytes: Math.round(200_000 + 100_000 * Math.random()),
  };
}

module.exports = { getSystemStats, getMockSystemStats };
