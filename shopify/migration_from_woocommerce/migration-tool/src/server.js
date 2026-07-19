// Web server (PRD §16): JSON API + static UI (ui/dist). Binds localhost
// only; no auth (local single-operator tool). Runs execute in this process
// via the background worker — the browser can be closed mid-run.
import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolveProjectName, loadConfig, configSummary } from "./config.js";
import { getDb } from "./db.js";
import { parseEntities, expandEntities, ENTITY_ORDER, ENTITIES } from "./entities/index.js";
import { createRun, recoverStaleRuns, requestCancel, startWorker } from "./runner.js";

const UI_DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "ui", "dist");
const PORT = Number(process.env.PORT ?? 4780);

const cfg = loadConfig(resolveProjectName());
const db = getDb();
recoverStaleRuns();
startWorker(cfg);

const app = express();
app.use(express.json());

app.get("/api/status", (req, res) => {
  const project = cfg.project.name;
  const entities = {};
  for (const name of ENTITY_ORDER) {
    const staged = {};
    for (const r of db
      .prepare(`SELECT lang, COUNT(*) n FROM staging WHERE project = ? AND entity = ? GROUP BY lang`)
      .all(project, name)) {
      staged[r.lang] = r.n;
    }
    entities[name] = {
      staged,
      mapped: db.prepare(`SELECT COUNT(*) n FROM id_map WHERE project = ? AND entity = ?`).get(project, name).n,
      dependencies: ENTITIES[name].dependencies,
      immutable: ENTITIES[name].immutable ?? false,
    };
  }
  const active = db.prepare(`SELECT id, type, status FROM runs WHERE project = ? AND status IN ('queued','running') ORDER BY id`).all(project);
  res.json({ ...configSummary(cfg), entities, active_runs: active });
});

app.get("/api/runs", (req, res) => {
  const rows = db
    .prepare(`SELECT id, type, entities, options, status, stats, created_at, started_at, finished_at FROM runs WHERE project = ? ORDER BY id DESC LIMIT 50`)
    .all(cfg.project.name);
  res.json(rows.map(inflateRun));
});

app.get("/api/runs/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM runs WHERE id = ? AND project = ?`).get(req.params.id, cfg.project.name);
  if (!row) return res.status(404).json({ error: "run not found" });
  res.json(inflateRun(row));
});

app.get("/api/runs/:id/events", (req, res) => {
  const afterId = Number(req.query.after_id ?? 0);
  const limit = Math.min(Number(req.query.limit ?? 200), 1000);
  const levels = req.query.level ? String(req.query.level).split(",") : ["info", "warn", "error"];
  const rows = db
    .prepare(
      `SELECT id, ts, level, entity, source_id, action, message FROM run_events
       WHERE run_id = ? AND id > ? AND level IN (${levels.map(() => "?").join(",")})
       ORDER BY id LIMIT ?`
    )
    .all(req.params.id, afterId, ...levels, limit);
  res.json(rows);
});

app.post("/api/runs", (req, res) => {
  try {
    const { type, entities: entIn, options: optIn = {} } = req.body ?? {};
    if (!["extract", "load", "full", "verify", "rebuild-map"].includes(type)) {
      return res.status(400).json({ error: `invalid type '${type}'` });
    }
    const includeDeps = optIn.include_dependencies !== false;
    const entities = expandEntities(parseEntities(Array.isArray(entIn) ? entIn.join(",") : entIn), includeDeps);
    const options = {};
    if (optIn.limit != null && optIn.limit !== "") {
      options.limit = Number(optIn.limit);
      if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error("limit must be a positive integer");
    }
    if (optIn.offset) {
      options.offset = Number(optIn.offset);
      if (!Number.isInteger(options.offset) || options.offset < 0) throw new Error("offset must be >= 0");
    }
    if (optIn.mode) {
      if (!["create_missing", "sync_changed", "force_all"].includes(optIn.mode)) throw new Error(`invalid mode '${optIn.mode}'`);
      options.mode = optIn.mode;
    }
    if (optIn.extract_full) options.extract_full = true;
    options.include_dependencies = includeDeps;
    const id = createRun(cfg, type, entities, options);
    res.json({ id, entities, options });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/runs/:id/cancel", (req, res) => {
  const row = db.prepare(`SELECT id, status FROM runs WHERE id = ? AND project = ?`).get(req.params.id, cfg.project.name);
  if (!row) return res.status(404).json({ error: "run not found" });
  if (row.status === "queued") {
    db.prepare(`UPDATE runs SET status = 'cancelled', finished_at = datetime('now') WHERE id = ?`).run(row.id);
  } else if (row.status === "running") {
    requestCancel(row.id);
  }
  res.json({ ok: true, status: row.status });
});

function inflateRun(row) {
  return {
    ...row,
    entities: JSON.parse(row.entities),
    options: JSON.parse(row.options),
    stats: row.stats ? JSON.parse(row.stats) : null,
  };
}

if (existsSync(UI_DIST)) {
  app.use(express.static(UI_DIST));
  // SPA fallback: any non-API GET serves the app shell.
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
      return res.sendFile(join(UI_DIST, "index.html"));
    }
    next();
  });
} else {
  app.get("/", (req, res) => res.type("text").send("UI not built yet — run `npm run ui:build` (see ui/)."));
}

app.listen(PORT, "127.0.0.1", () => {
  console.log(`migration-tool server: http://127.0.0.1:${PORT} (project: ${cfg.project.name})`);
});
