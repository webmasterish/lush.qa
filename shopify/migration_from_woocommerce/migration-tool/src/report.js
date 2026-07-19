// report (plan M8 task 0b): assembles a migration status report (markdown)
// from local data only — staging counts, id map, the latest verify snapshot
// per entity, load stats, failures, and run durations. Makes NO API calls,
// so it is safe to run while a load is in progress. This output is the raw
// material for the client-facing report.
import { getDb } from "./db.js";
import { ENTITY_ORDER } from "./entities/index.js";

const fmtDur = (a, b) => {
  if (!a || !b) return "";
  const s = Math.round((Date.parse(b) - Date.parse(a)) / 1000);
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

export function buildReport(cfg) {
  const db = getDb();
  const project = cfg.project.name;
  const lines = [];
  lines.push(`# Migration report — ${project}`);
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()} · source ${cfg.project.source.url} · target ${cfg.project.target.store_domain}`);
  lines.push("");

  // Latest verify snapshot + latest load (current failure state) + cumulative
  // translated/published across all runs.
  const latestVerify = {};
  const latestLoad = {};
  const cumulative = {};
  for (const run of db
    .prepare(`SELECT id, type, stats, started_at, finished_at FROM runs WHERE project = ? AND stats IS NOT NULL ORDER BY id DESC`)
    .all(project)) {
    const stats = JSON.parse(run.stats);
    for (const name of ENTITY_ORDER) {
      if (stats[name]?.verify && !latestVerify[name]) latestVerify[name] = { run: run.id, ...stats[name].verify };
      if (stats[name]?.created !== undefined) {
        if (!latestLoad[name]) latestLoad[name] = { run: run.id, ...stats[name] };
        const c = (cumulative[name] ??= { translated: 0, published: 0 });
        c.translated += stats[name].translated ?? 0;
        c.published += stats[name].published ?? 0;
      }
    }
  }

  lines.push(`## Entities`);
  lines.push("");
  lines.push(`| Entity | Source (staged) | Migrated | Live store | Failures | Translated | Published | Verify |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  for (const name of ENTITY_ORDER) {
    const staged = {};
    for (const r of db
      .prepare(`SELECT lang, COUNT(*) n FROM staging WHERE project = ? AND entity = ? GROUP BY lang`)
      .all(project, name)) {
      staged[r.lang] = r.n;
    }
    const stagedStr = Object.entries(staged).map(([l, n]) => (l === "-" ? String(n) : `${l} ${n}`)).join(" · ") || "—";
    const mapped = db.prepare(`SELECT COUNT(*) n FROM id_map WHERE project = ? AND entity = ?`).get(project, name).n;
    const v = latestVerify[name];
    const l = latestLoad[name];
    const verdict = v
      ? (v.flags?.length || v.spot_mismatches?.length)
        ? `issues: ${[...(v.flags ?? []), ...(v.spot_mismatches ?? [])].length} (run ${v.run})`
        : `ok (run ${v.run}${v.orphans ? `, ${v.orphans} source-deleted`: ""})`
      : "not run";
    const c = cumulative[name];
    lines.push(
      `| ${name} | ${stagedStr} | ${mapped} | ${v?.live ?? "—"} | ${l?.failed ?? "—"} | ${c?.translated || "—"} | ${c?.published || "—"} | ${verdict} |`
    );
  }
  lines.push("");

  // Failures with reasons (grouped).
  const errors = db
    .prepare(
      `SELECT entity, message, COUNT(*) n FROM run_events
       WHERE level = 'error' AND run_id IN (SELECT id FROM runs WHERE project = ?)
       GROUP BY entity, message ORDER BY n DESC LIMIT 30`
    )
    .all(project);
  lines.push(`## Failures (${errors.reduce((a, e) => a + e.n, 0)} events, grouped)`);
  lines.push("");
  if (errors.length === 0) lines.push("None recorded.");
  for (const e of errors) lines.push(`- **${e.entity ?? "system"}** ×${e.n}: ${e.message}`);
  lines.push("");

  // Warnings summary (counts only — details are in the event log).
  const warns = db
    .prepare(
      `SELECT entity, COUNT(*) n FROM run_events
       WHERE level = 'warn' AND run_id IN (SELECT id FROM runs WHERE project = ?)
       GROUP BY entity ORDER BY n DESC`
    )
    .all(project);
  lines.push(`## Warnings by entity (details in run event logs)`);
  lines.push("");
  for (const w of warns) lines.push(`- ${w.entity ?? "system"}: ${w.n}`);
  if (warns.length === 0) lines.push("None recorded.");
  lines.push("");

  // Run history.
  lines.push(`## Runs`);
  lines.push("");
  lines.push(`| # | Type | Entities | Status | Started | Duration |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const r of db
    .prepare(`SELECT * FROM runs WHERE project = ? ORDER BY id`)
    .all(project)) {
    lines.push(
      `| ${r.id} | ${r.type} | ${JSON.parse(r.entities).join(", ") || "—"} | ${r.status} | ${r.started_at ?? ""} | ${fmtDur(r.started_at, r.finished_at)} |`
    );
  }
  lines.push("");
  lines.push(`Source data quality notes for the client review: see docs/client-data-quality-notes.md.`);
  return lines.join("\n");
}
