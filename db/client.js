const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const { hashPassword } = require("../lib/auth/password");
const { MIGRATIONS } = require("./migrations");

// process.cwd(), not __dirname: Next's webpack bundler rewrites __dirname
// per-bundle for each API route, which would otherwise point every route at
// a different (wrong) default path. cwd is stable across server.js and every
// bundled route since they all run in the same node process.
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "app.sqlite3");

let dbInstance = null;

function runMigrations(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)"
  );
  const appliedRows = db.prepare("SELECT name FROM _migrations").all();
  const applied = new Set(appliedRows.map((r) => r.name));

  for (const { name, sql } of MIGRATIONS) {
    if (applied.has(name)) continue;
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(
      name,
      Math.floor(Date.now() / 1000)
    );
    console.log(`[db] applied migration ${name}`);
  }
}

/** Seeds the singleton admin user from ADMIN_USERNAME/ADMIN_PASSWORD if the users table is empty. */
async function bootstrapAdminUser(db) {
  const existing = db.prepare("SELECT id FROM users WHERE id = 1").get();
  if (existing) return;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn(
      "[db] no admin user exists yet and ADMIN_USERNAME/ADMIN_PASSWORD are not set — login will fail until one is created"
    );
    return;
  }

  const passwordHash = await hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, username, password_hash, updated_at) VALUES (1, ?, ?, ?)"
  ).run(username, passwordHash, Math.floor(Date.now() / 1000));
  console.log(`[db] bootstrapped admin user "${username}"`);
}

/** Returns the singleton DatabaseSync instance, running migrations + admin bootstrap on first call. */
async function getDb() {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  runMigrations(db);
  await bootstrapAdminUser(db);

  dbInstance = db;
  return dbInstance;
}

module.exports = { getDb, DB_PATH };
