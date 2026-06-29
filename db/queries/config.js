function get(db, key) {
  return db.prepare("SELECT value FROM app_config WHERE key = ?").get(key)?.value ?? null;
}

function set(db, key, value) {
  db.prepare(
    `INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, String(value), Math.floor(Date.now() / 1000));
}

function getByPrefix(db, prefix) {
  const rows = db
    .prepare("SELECT key, value FROM app_config WHERE key LIKE ?")
    .all(`${prefix}%`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

module.exports = { get, set, getByPrefix };
