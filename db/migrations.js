// Migration SQL embedded as JS string constants rather than read from .sql
// files at runtime. Next's webpack bundler rewrites __dirname for modules it
// bundles (e.g. API routes that import db/client.js), so a
// fs.readdirSync(path.join(__dirname, 'migrations')) call resolves against
// the bundle's location, not this source tree — the .sql files never make
// it there. Embedding avoids the whole asset-bundling problem.

const MIGRATIONS = [
  {
    name: "0001_init",
    sql: `
-- Core tables: auth, system/GPU monitoring, request logging, app config.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS system_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  cpu_pct REAL,
  ram_used_mb INTEGER,
  ram_total_mb INTEGER,
  disk_used_gb REAL,
  disk_total_gb REAL,
  net_rx_bytes INTEGER,
  net_tx_bytes INTEGER,
  gpu_util_pct REAL,
  gpu_vram_used_mb INTEGER,
  gpu_vram_total_mb INTEGER,
  gpu_temp_c REAL,
  gpu_power_w REAL
);
CREATE INDEX IF NOT EXISTS idx_system_samples_ts ON system_samples(ts);

CREATE TABLE IF NOT EXISTS request_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  service TEXT NOT NULL,
  route TEXT,
  status_code INTEGER,
  latency_ms INTEGER,
  model TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_request_log_ts ON request_log(ts);
CREATE INDEX IF NOT EXISTS idx_request_log_service_ts ON request_log(service, ts);

CREATE TABLE IF NOT EXISTS request_log_hourly (
  hour_ts INTEGER NOT NULL,
  service TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms REAL,
  p95_latency_ms REAL,
  PRIMARY KEY (hour_ts, service)
);

CREATE TABLE IF NOT EXISTS service_status_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_service_status_log_ts ON service_status_log(ts);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER
);
`,
  },
  {
    name: "0002_alerts",
    sql: `
-- Alert thresholds/config (Telegram token, temp/disk thresholds) and fired-alert history.

CREATE TABLE IF NOT EXISTS alert_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS alert_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_alert_events_ts ON alert_events(ts);
`,
  },
  {
    name: "0003_chat",
    sql: `
-- Chat conversations/messages for the ChatGPT-style local-model chat UI.

CREATE TABLE IF NOT EXISTS chat_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at);
`,
  },
];

module.exports = { MIGRATIONS };
