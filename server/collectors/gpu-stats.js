// Spawns `rocm-smi --json` for the AMD 890M iGPU. Off the LXC (e.g. this dev
// machine, or any host without ROCm) this always fails fast — callers treat
// `available: false` as "show a GPU-unavailable indicator", not an error.
const { execFile } = require("child_process");

// parseFloat(x) || null is wrong here: a legitimate reading of 0 (e.g. idle
// GPU at 0% utilization) is falsy in JS, so `|| null` would silently turn a
// real 0 into a missing value. Use isNaN instead.
function numOrNull(value) {
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function getGpuStats() {
  return new Promise((resolve) => {
    execFile(
      "rocm-smi",
      ["--showuse", "--showmeminfo", "vram", "--showtemp", "--showpower", "--json"],
      { timeout: 5000 },
      (error, stdout) => {
        if (error) {
          resolve({ available: false });
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          const cardKey = Object.keys(parsed).find((k) => k.startsWith("card"));
          const card = cardKey ? parsed[cardKey] : null;
          if (!card) {
            resolve({ available: false });
            return;
          }
          resolve({
            available: true,
            utilPct: numOrNull(card["GPU use (%)"]),
            vramUsedMb: card["VRAM Total Used Memory (B)"] !== undefined
              ? Math.round(Number(card["VRAM Total Used Memory (B)"]) / 1024 / 1024)
              : null,
            vramTotalMb: card["VRAM Total Memory (B)"] !== undefined
              ? Math.round(Number(card["VRAM Total Memory (B)"]) / 1024 / 1024)
              : null,
            tempC: numOrNull(card["Temperature (Sensor edge) (C)"]),
            // Field name confirmed against the real LXC's rocm-smi output —
            // differs from some documented/older ROCm versions which use
            // "Average Graphics Package Power (W)" instead.
            powerW: numOrNull(card["Current Socket Graphics Package Power (W)"]),
          });
        } catch {
          resolve({ available: false });
        }
      }
    );
  });
}

function getMockGpuStats() {
  const t = Date.now() / 1000;
  return {
    available: true,
    utilPct: Math.round(40 + 30 * Math.abs(Math.sin(t / 8))),
    vramUsedMb: 4200 + Math.round(800 * Math.sin(t / 12)),
    vramTotalMb: 29900,
    tempC: Math.round(55 + 8 * Math.sin(t / 20)),
    powerW: Math.round(18 + 6 * Math.abs(Math.sin(t / 8))),
  };
}

module.exports = { getGpuStats, getMockGpuStats };
