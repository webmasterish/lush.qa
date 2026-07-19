import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const VAR_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "var");

const DDL = `
CREATE TABLE IF NOT EXISTS staging (
  project      TEXT NOT NULL,
  entity       TEXT NOT NULL,
  lang         TEXT NOT NULL,
  source_id    INTEGER NOT NULL,
  en_id        INTEGER NOT NULL,
  payload      TEXT NOT NULL,
  hash         TEXT NOT NULL,
  extracted_at TEXT NOT NULL,
  PRIMARY KEY (project, entity, lang, source_id)
);

CREATE TABLE IF NOT EXISTS id_map (
  project       TEXT NOT NULL,
  entity        TEXT NOT NULL,
  source_id     INTEGER NOT NULL,
  target_id     TEXT NOT NULL,
  target_handle TEXT,
  hash_at_sync  TEXT NOT NULL,
  synced_at     TEXT NOT NULL,
  PRIMARY KEY (project, entity, source_id)
);

CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project     TEXT NOT NULL,
  type        TEXT NOT NULL,
  entities    TEXT NOT NULL,
  options     TEXT NOT NULL,
  status      TEXT NOT NULL,
  stats       TEXT,
  created_at  TEXT NOT NULL,
  started_at  TEXT,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS run_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id    INTEGER NOT NULL,
  ts        TEXT NOT NULL,
  level     TEXT NOT NULL,
  entity    TEXT,
  source_id INTEGER,
  action    TEXT,
  message   TEXT NOT NULL,
  data      TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_run ON run_events (run_id, id);
`;

let db;

export function getDb() {
  if (!db) {
    mkdirSync(VAR_DIR, { recursive: true });
    db = new Database(join(VAR_DIR, "migration-tool.sqlite"));
    db.pragma("journal_mode = WAL");
    // A CLI extract and the server can run concurrently; wait instead of
    // throwing SQLITE_BUSY on write contention.
    db.pragma("busy_timeout = 10000");
    db.exec(DDL);
  }
  return db;
}

export function tableCounts(project) {
  const d = getDb();
  const one = (sql) => d.prepare(sql).get(project).n;
  return {
    staging: one("SELECT COUNT(*) n FROM staging WHERE project = ?"),
    id_map: one("SELECT COUNT(*) n FROM id_map WHERE project = ?"),
    runs: one("SELECT COUNT(*) n FROM runs WHERE project = ?"),
  };
}
