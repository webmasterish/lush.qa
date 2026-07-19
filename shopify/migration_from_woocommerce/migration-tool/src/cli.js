#!/usr/bin/env node
// CLI entry — same runner as the web UI, foreground execution with events
// streamed to stdout. Commands land per docs/migration-tool-plan.md:
//   (none)               config + DB summary
//   extract              source -> staging   [M1]
//   load|verify|full     ...                 [M2+]
import { resolveProjectName, loadConfig, configSummary } from "./config.js";
import { getDb, tableCounts } from "./db.js";
import { parseEntities, expandEntities } from "./entities/index.js";
import { createRun, executeRun, recoverStaleRuns } from "./runner.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(args[i]);
    }
  }
  return { command: positional[0] ?? null, flags };
}

function buildOptions(flags) {
  const options = {};
  if (flags.limit) {
    options.limit = Number(flags.limit);
    if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error("--limit must be a positive integer");
  }
  if (flags.offset) {
    options.offset = Number(flags.offset);
    if (!Number.isInteger(options.offset) || options.offset < 0) throw new Error("--offset must be a non-negative integer");
  }
  if (flags.langs) options.langs = flags.langs.split(",").map((s) => s.trim()).filter(Boolean);
  if (flags.mode) options.mode = flags.mode;
  if (flags.full === "true") options.extract_full = true;
  options.include_dependencies = flags["include-dependencies"] !== "false";
  return options;
}

async function main() {
  const { command, flags } = parseArgs(process.argv);

  let cfg;
  try {
    cfg = loadConfig(resolveProjectName());
  } catch (e) {
    console.error(`Config error: ${e.message}`);
    process.exit(1);
  }

  getDb();
  recoverStaleRuns();

  if (!command) {
    const summary = configSummary(cfg);
    summary.db = tableCounts(cfg.project.name);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (["extract", "load", "full", "verify", "rebuild-map"].includes(command)) {
    let entities, options;
    try {
      entities = expandEntities(parseEntities(flags.entities), flags["include-dependencies"] !== "false");
      options = buildOptions(flags);
    } catch (e) {
      console.error(`Invalid arguments: ${e.message}`);
      process.exit(1);
    }
    const runId = createRun(cfg, command, entities, options);
    const { status, stats } = await executeRun(cfg, runId);
    console.log(JSON.stringify({ run: runId, status, stats }, null, 2));
    process.exit(status === "success" ? 0 : 1);
  }

  if (command === "wipe") {
    const { wipe } = await import("./wipe.js");
    const { createShopifyClient } = await import("./connectors/shopify.js");
    const { logEvent } = await import("./log.js");
    let entities;
    try {
      entities = parseEntities(flags.entities);
    } catch (e) {
      console.error(`Invalid arguments: ${e.message}`);
      process.exit(1);
    }
    const runId = createRun(cfg, "wipe", entities, { confirm: Boolean(flags.confirm) });
    getDb().prepare("UPDATE runs SET status = 'running', started_at = datetime('now') WHERE id = ?").run(runId);
    const ctx = {
      db: getDb(),
      project: cfg.project,
      shopify: createShopifyClient(cfg.env),
      log: (level, fields) => logEvent(runId, level, fields),
      isCancelled: () => false,
    };
    try {
      const stats = await wipe(ctx, entities, flags.confirm, flags.scope ?? "tracked");
      getDb().prepare("UPDATE runs SET status = 'success', stats = ?, finished_at = datetime('now') WHERE id = ?").run(JSON.stringify(stats), runId);
      console.log(JSON.stringify({ run: runId, stats }, null, 2));
      process.exit(0);
    } catch (e) {
      getDb().prepare("UPDATE runs SET status = 'failed', finished_at = datetime('now') WHERE id = ?").run(runId);
      console.error(e.message);
      process.exit(1);
    }
  }

  if (command === "mint-token") {
    const { mintTokenUrl, mintTokenExchange } = await import("./mint-token.js");
    const sub = process.argv.includes("url") ? "url" : process.argv.includes("exchange") ? "exchange" : null;
    try {
      if (sub === "url") {
        console.log(mintTokenUrl(cfg));
      } else if (sub === "exchange") {
        const arg = process.argv[process.argv.indexOf("exchange") + 1];
        if (!arg) throw new Error('Provide the code: mint-token exchange "<redirected-url-or-code>"');
        console.log(await mintTokenExchange(cfg, arg));
      } else {
        throw new Error("Usage: mint-token url | mint-token exchange <code-or-url>");
      }
      process.exit(0);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }

  console.error(`Unknown command '${command}'. Available: extract, load, full, verify, rebuild-map, wipe, mint-token.`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e.stack ?? String(e));
  process.exit(1);
});
