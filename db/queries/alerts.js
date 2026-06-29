function getConfig(db) {
  const rows = db.prepare("SELECT key, value FROM alert_config").all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function setConfigValue(db, key, value) {
  db.prepare(
    "INSERT INTO alert_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

function setConfig(db, entries) {
  for (const [key, value] of Object.entries(entries)) {
    setConfigValue(db, key, String(value));
  }
}

/** Open (unresolved) alert event of a given kind, for cooldown/dedup checks. */
function getOpenEvent(db, kind) {
  return db
    .prepare(
      "SELECT * FROM alert_events WHERE kind = ? AND resolved_at IS NULL ORDER BY ts DESC LIMIT 1"
    )
    .get(kind);
}

function insertEvent(db, kind, message) {
  db.prepare("INSERT INTO alert_events (ts, kind, message) VALUES (?, ?, ?)").run(
    Math.floor(Date.now() / 1000),
    kind,
    message
  );
}

function resolveOpenEvent(db, kind) {
  db.prepare(
    "UPDATE alert_events SET resolved_at = ? WHERE kind = ? AND resolved_at IS NULL"
  ).run(Math.floor(Date.now() / 1000), kind);
}

function getRecentEvents(db, limit = 50) {
  return db.prepare("SELECT * FROM alert_events ORDER BY ts DESC LIMIT ?").all(limit);
}

module.exports = {
  getConfig,
  setConfigValue,
  setConfig,
  getOpenEvent,
  insertEvent,
  resolveOpenEvent,
  getRecentEvents,
};
