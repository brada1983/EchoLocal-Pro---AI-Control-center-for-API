function insertSample(db, sample) {
  db.prepare(
    `INSERT INTO system_samples
     (ts, cpu_pct, ram_used_mb, ram_total_mb, disk_used_gb, disk_total_gb,
      net_rx_bytes, net_tx_bytes, gpu_util_pct, gpu_vram_used_mb, gpu_vram_total_mb,
      gpu_temp_c, gpu_power_w)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sample.ts,
    sample.cpuPct ?? null,
    sample.ramUsedMb ?? null,
    sample.ramTotalMb ?? null,
    sample.diskUsedGb ?? null,
    sample.diskTotalGb ?? null,
    sample.netRxBytes ?? null,
    sample.netTxBytes ?? null,
    sample.gpuUtilPct ?? null,
    sample.gpuVramUsedMb ?? null,
    sample.gpuVramTotalMb ?? null,
    sample.gpuTempC ?? null,
    sample.gpuPowerW ?? null
  );
}

function getSince(db, sinceTs) {
  return db.prepare("SELECT * FROM system_samples WHERE ts >= ? ORDER BY ts ASC").all(sinceTs);
}

function getLatest(db) {
  return db.prepare("SELECT * FROM system_samples ORDER BY ts DESC LIMIT 1").get();
}

/** Deletes raw samples older than `retentionDays`. Run periodically, not on every insert. */
function pruneOlderThan(db, retentionDays) {
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
  db.prepare("DELETE FROM system_samples WHERE ts < ?").run(cutoff);
}

module.exports = { insertSample, getSince, getLatest, pruneOlderThan };
