#!/usr/bin/env node
// CLI entry. M0: loads + validates config, initializes the DB, prints a
// summary. Commands (extract, load, verify, full, wipe, rebuild-map,
// mint-token) are wired in from M1 onward per docs/migration-tool-plan.md.
import { resolveProjectName, loadConfig, configSummary } from "./config.js";
import { getDb, tableCounts } from "./db.js";

function main() {
  let cfg;
  try {
    const name = resolveProjectName();
    cfg = loadConfig(name);
  } catch (e) {
    console.error(`Config error: ${e.message}`);
    process.exit(1);
  }

  getDb();

  const summary = configSummary(cfg);
  summary.db = tableCounts(cfg.project.name);
  console.log(JSON.stringify(summary, null, 2));
}

main();
