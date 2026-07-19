import { appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getDb } from "./db.js";
import { nowIso } from "./util.js";

const LOGS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "var", "logs");
let logsDirReady = false;

// Central event writer: every action lands in run_events (queryable by the
// UI), mirrors to the console, and appends to var/logs/run-<id>.jsonl as a
// belt-and-braces copy if the DB is ever lost. `data` must never contain
// secrets (tokens, keys).
export function logEvent(runId, level, { entity = null, source_id = null, action = null, message, data = null } = {}) {
  const ts = nowIso();
  getDb()
    .prepare(
      "INSERT INTO run_events (run_id, ts, level, entity, source_id, action, message, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(runId, ts, level, entity, source_id, action, message, data == null ? null : JSON.stringify(data));

  const tag = [entity, source_id ? `#${source_id}` : null, action].filter(Boolean).join(" ");
  const line = `[run ${runId}] ${level.toUpperCase()}${tag ? ` (${tag})` : ""} ${message}`;
  (level === "error" ? console.error : console.log)(line);

  if (!logsDirReady) {
    mkdirSync(LOGS_DIR, { recursive: true });
    logsDirReady = true;
  }
  appendFileSync(
    join(LOGS_DIR, `run-${runId}.jsonl`),
    JSON.stringify({ ts, level, entity, source_id, action, message, data }) + "\n"
  );
}
