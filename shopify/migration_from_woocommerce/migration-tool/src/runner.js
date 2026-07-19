// Run lifecycle: queue rows in `runs`, execute one at a time, cooperative
// cancellation, startup recovery (PRD §9.3). The CLI executes runs in the
// foreground; the server (M7) uses the same executeRun via startWorker.
import { getDb } from "./db.js";
import { logEvent } from "./log.js";
import { nowIso } from "./util.js";
import { createWooClient } from "./connectors/woocommerce.js";
import { createShopifyClient } from "./connectors/shopify.js";

export class RunCancelled extends Error {
  constructor() {
    super("Run cancelled by operator");
  }
}

const cancelRequests = new Set();

export function requestCancel(runId) {
  cancelRequests.add(runId);
}

// Any run left 'running' by a crashed process is unrecoverable in-memory
// state: mark it failed (completed work is preserved; create_missing
// resumes). BUT the CLI and server share this DB — a run may be legitimately
// executing in another process. Only treat a run as stale when it shows no
// sign of life: no fresh heartbeat AND no recent event.
// Generous threshold: order loads legitimately go quiet for 61s+ while
// waiting out the dev-store orders-per-minute cap.
const STALE_AFTER_MS = 300_000;

export function recoverStaleRuns() {
  const db = getDb();
  for (const r of db.prepare("SELECT id, heartbeat_at FROM runs WHERE status = 'running'").all()) {
    const beat = r.heartbeat_at ? Date.parse(r.heartbeat_at) : 0;
    const lastEvent = db.prepare("SELECT ts FROM run_events WHERE run_id = ? ORDER BY id DESC LIMIT 1").get(r.id);
    const lastSeen = Math.max(beat, lastEvent ? Date.parse(lastEvent.ts) : 0);
    if (Date.now() - lastSeen < STALE_AFTER_MS) continue; // alive in another process
    db.prepare("UPDATE runs SET status = 'failed', finished_at = ? WHERE id = ?").run(nowIso(), r.id);
    logEvent(r.id, "error", { action: "system", message: "Run showed no activity for 5 minutes and was still 'running' (crashed process); marked failed. Completed work is preserved." });
  }
}

export function createRun(cfg, type, entities, options = {}) {
  const db = getDb();
  const res = db
    .prepare("INSERT INTO runs (project, type, entities, options, status, created_at) VALUES (?, ?, ?, ?, 'queued', ?)")
    .run(cfg.project.name, type, JSON.stringify(entities), JSON.stringify(options), nowIso());
  return Number(res.lastInsertRowid);
}

export function getRun(runId) {
  return getDb().prepare("SELECT * FROM runs WHERE id = ?").get(runId);
}

export async function executeRun(cfg, runId) {
  const db = getDb();
  const run = getRun(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  const entities = JSON.parse(run.entities);
  const options = JSON.parse(run.options);

  db.prepare("UPDATE runs SET status = 'running', started_at = ?, heartbeat_at = ? WHERE id = ?").run(nowIso(), nowIso(), runId);
  logEvent(runId, "info", { action: "system", message: `Run ${runId} started: ${run.type} [${entities.join(", ")}] ${JSON.stringify(options)}` });
  const heartbeat = setInterval(() => {
    try {
      db.prepare("UPDATE runs SET heartbeat_at = ? WHERE id = ?").run(nowIso(), runId);
    } catch {
      // best-effort; the event log is the fallback liveness signal
    }
  }, 5000);
  heartbeat.unref?.();

  const stats = {};
  const ctx = {
    project: cfg.project,
    env: cfg.env,
    db,
    runId,
    woo: createWooClient(cfg.env),
    shopify: createShopifyClient(cfg.env),
    log: (level, fields) => logEvent(runId, level, fields),
    isCancelled: () => cancelRequests.has(runId),
    updateStats: () => db.prepare("UPDATE runs SET stats = ? WHERE id = ?").run(JSON.stringify(stats), runId),
  };
  // Live progress: stages call this as they go so the UI shows mid-entity
  // stats and cancelled runs keep their partial numbers.
  ctx.setStats = (name, s) => {
    stats[name] = { ...(stats[name] ?? {}), ...s };
    ctx.updateStats();
  };

  let status = "success";
  try {
    // Lazy import avoids a circular dependency (entities/index.js imports
    // RunCancelled from this module).
    const { extractEntity, loadEntity } = await import("./entities/index.js");
    const { verifyEntity } = await import("./verify.js");
    const { rebuildMap } = await import("./rebuild.js");

    if (run.type === "verify") {
      for (const name of entities) {
        stats[name] = { verify: await verifyEntity(ctx, name) };
        ctx.updateStats();
      }
    } else if (run.type === "rebuild-map") {
      stats.rebuilt = await rebuildMap(ctx);
    } else if (run.type === "extract") {
      for (const name of entities) {
        stats[name] = { extracted: await extractEntity(ctx, name, options) };
        ctx.updateStats();
      }
    } else if (run.type === "load") {
      for (const name of entities) {
        stats[name] = await loadEntity(ctx, name, options);
        ctx.updateStats();
      }
    } else if (run.type === "full") {
      for (const name of entities) {
        stats[name] = { extracted: await extractEntity(ctx, name, options) };
        ctx.updateStats();
      }
      for (const name of entities) {
        Object.assign(stats[name], await loadEntity(ctx, name, options));
        ctx.updateStats();
      }
      for (const name of entities) {
        stats[name].verify = await verifyEntity(ctx, name);
        ctx.updateStats();
      }
    } else {
      throw new Error(`Run type '${run.type}' is not implemented yet (see docs/migration-tool-plan.md milestones)`);
    }
  } catch (e) {
    if (e instanceof RunCancelled) {
      status = "cancelled";
      logEvent(runId, "info", { action: "system", message: "Run cancelled; completed work is preserved." });
    } else {
      status = "failed";
      logEvent(runId, "error", { action: "system", message: `Run failed: ${e.message}`, data: { stack: e.stack?.split("\n").slice(0, 5) } });
    }
  }

  clearInterval(heartbeat);
  db.prepare("UPDATE runs SET status = ?, stats = ?, finished_at = ? WHERE id = ?").run(status, JSON.stringify(stats), nowIso(), runId);
  cancelRequests.delete(runId);
  logEvent(runId, "info", { action: "system", message: `Run ${runId} finished: ${status}` });
  return { status, stats };
}

// Background worker loop for the server (M7): executes queued runs one at a
// time, oldest first.
export function startWorker(cfg, { pollMs = 1000 } = {}) {
  const db = getDb();
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    const next = db.prepare("SELECT id FROM runs WHERE status = 'queued' ORDER BY id LIMIT 1").get();
    if (!next) return;
    busy = true;
    try {
      await executeRun(cfg, next.id);
    } finally {
      busy = false;
    }
  }, pollMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
