import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config';

const dbFile = path.resolve(config.dbPath);
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS agents (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  role        TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS calls (
  id           INTEGER PRIMARY KEY,
  agent_id     INTEGER,
  agent_name   TEXT,
  person_id    INTEGER,
  phone        TEXT,
  is_incoming  INTEGER NOT NULL DEFAULT 0,
  duration     INTEGER NOT NULL DEFAULT 0,
  outcome      TEXT,
  note         TEXT,
  created_at   TEXT NOT NULL,
  synced_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calls_created ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);

CREATE TABLE IF NOT EXISTS sync_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity      TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  records     INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL,
  message     TEXT
);

CREATE TABLE IF NOT EXISTS deals (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  source           TEXT NOT NULL DEFAULT 'fub',
  source_id        TEXT NOT NULL,
  name             TEXT,
  pipeline         TEXT,
  stage            TEXT,
  status           TEXT NOT NULL DEFAULT 'open',
  price            REAL NOT NULL DEFAULT 0,
  commission       REAL,
  agent_id         INTEGER,
  agent_name       TEXT,
  projected_close  TEXT,
  closed_date      TEXT,
  created_at       TEXT,
  updated_at       TEXT,
  synced_at        TEXT NOT NULL,
  UNIQUE(source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_closed ON deals(closed_date);
CREATE INDEX IF NOT EXISTS idx_deals_agent ON deals(agent_id);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

export function getMeta(key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

export function setMeta(key: string, value: string): void {
  db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}
