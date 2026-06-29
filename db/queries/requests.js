function insertRequestLog(db, entry) {
  db.prepare(
    `INSERT INTO request_log (ts, service, route, status_code, latency_ms, model, error)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.ts,
    entry.service,
    entry.route ?? null,
    entry.statusCode ?? null,
    entry.latencyMs ?? null,
    entry.model ?? null,
    entry.error ?? null
  );
}

function getRecentByService(db, service, limit = 100) {
  return db
    .prepare("SELECT * FROM request_log WHERE service = ? ORDER BY ts DESC LIMIT ?")
    .all(service, limit);
}

/** Highest `ts` already ingested for a service — used by metrics-poller.js to dedupe. */
function getLastIngestedTs(db, service) {
  const row = db
    .prepare("SELECT MAX(ts) as maxTs FROM request_log WHERE service = ?")
    .get(service);
  return row?.maxTs ?? 0;
}

function getHourlyRollup(db, service, sinceTs) {
  return db
    .prepare(
      "SELECT * FROM request_log_hourly WHERE service = ? AND hour_ts >= ? ORDER BY hour_ts ASC"
    )
    .all(service, sinceTs);
}

/** Recomputes the hourly rollup for a single hour bucket (idempotent upsert). */
function rebuildHourlyBucket(db, service, hourTs) {
  const row = db
    .prepare(
      `SELECT COUNT(*) as cnt,
              SUM(CASE WHEN status_code >= 400 OR status_code IS NULL THEN 1 ELSE 0 END) as errCnt,
              AVG(latency_ms) as avgLatency
       FROM request_log
       WHERE service = ? AND ts >= ? AND ts < ?`
    )
    .get(service, hourTs, hourTs + 3600);

  const latencies = db
    .prepare(
      "SELECT latency_ms FROM request_log WHERE service = ? AND ts >= ? AND ts < ? AND latency_ms IS NOT NULL ORDER BY latency_ms ASC"
    )
    .all(service, hourTs, hourTs + 3600);
  const p95 =
    latencies.length > 0
      ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))].latency_ms
      : null;

  db.prepare(
    `INSERT INTO request_log_hourly (hour_ts, service, request_count, error_count, avg_latency_ms, p95_latency_ms)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(hour_ts, service) DO UPDATE SET
       request_count = excluded.request_count,
       error_count = excluded.error_count,
       avg_latency_ms = excluded.avg_latency_ms,
       p95_latency_ms = excluded.p95_latency_ms`
  ).run(hourTs, service, row.cnt, row.errCnt, row.avgLatency, p95);
}

function pruneOlderThan(db, retentionDays) {
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
  db.prepare("DELETE FROM request_log WHERE ts < ?").run(cutoff);
}

module.exports = {
  insertRequestLog,
  getRecentByService,
  getLastIngestedTs,
  getHourlyRollup,
  rebuildHourlyBucket,
  pruneOlderThan,
};
