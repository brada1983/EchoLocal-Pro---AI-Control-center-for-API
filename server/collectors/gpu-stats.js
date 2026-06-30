// Spawns `rocm-smi --json` for the AMD 890M iGPU. Off the LXC (e.g. this dev
// machine, or any host without ROCm) this always fails fast — callers treat
// `available: false` as "show a GPU-unavailable indicator", not an error.
const { execFile } = require("child_process");

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
            utilPct: parseFloat(card["GPU use (%)"]) || null,
            vramUsedMb: card["VRAM Total Used Memory (B)"]
              ? Math.round(Number(card["VRAM Total Used Memory (B)"]) / 1024 / 1024)
              : null,
            vramTotalMb: card["VRAM Total Memory (B)"]
              ? Math.round(Number(card["VRAM Total Memory (B)"]) / 1024 / 1024)
              : null,
            tempC: parseFloat(card["Temperature (Sensor edge) (C)"]) || null,
            // Field name confirmed against the real LXC's rocm-smi output —
            // differs from some documented/older ROCm versions which use
            // "Average Graphics Package Power (W)" instead.
            powerW: parseFloat(card["Current Socket Graphics Package Power (W)"]) || null,
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
