# migration-tool

Config-driven WooCommerce → Shopify data migration tool (DotAim). Requirements: `docs/migration-tool-prd.md`; build plan and milestone status: `docs/migration-tool-plan.md`; field mapping: `docs/data-mapping.md`.

## Setup (already done for lush-qatar)

```bash
cd shopify/migration_from_woocommerce/migration-tool
npm install                 # backend deps
npm --prefix ui install     # UI deps
npm run ui:build            # build the web UI (rerun after changing ui/)
```

Per-project config: `config/projects/<name>.json` (committed) + `config/projects/<name>.env` (secrets, gitignored — template in `.env.example`).

## Web UI

```bash
npm start                   # serves http://127.0.0.1:4780 (Ctrl+C to stop)
```

- Runs execute inside the server process — you can close the browser; the run keeps going. **Closing/stopping the server kills any running job** (completed work is kept; a `create_missing` re-run resumes).
- Stop: `Ctrl+C` in its terminal. If it was started detached/in the background: `pkill -f 'node src/server.js'`.
- Different port: `PORT=5000 npm start`.
- UI development with hot reload (server must also be running): `npm run ui:dev`.

## CLI (same runner as the UI, foreground)

```bash
node src/cli.js --project lush-qatar                      # config + counts summary
node src/cli.js --project lush-qatar extract --entities all            # incremental for products/orders; --full forces complete
node src/cli.js --project lush-qatar load    --entities products --limit 10 --mode create_missing
node src/cli.js --project lush-qatar full    --entities all            # extract + load + verify
node src/cli.js --project lush-qatar verify  --entities all
node src/cli.js --project lush-qatar rebuild-map                       # recover id_map from Shopify metafields
node src/cli.js --project lush-qatar wipe --entities all --confirm lush-qatar.myshopify.com
node src/cli.js --project lush-qatar wipe --entities all --scope all --confirm lush-qatar.myshopify.com   # ALL store data incl. demo/manual (backed up to var/ first)
node src/cli.js --project lush-qatar mint-token url                    # then: mint-token exchange "<redirected-url>"
node src/cli.js --project lush-qatar define-metafields                 # named metafield definitions for the migration namespace (idempotent)
node src/cli.js --project lush-qatar report [--out file.md]            # migration status report (markdown, read-only, safe mid-run)
```

Options: `--limit N`, `--offset N` (stable source-id ordering, chunks never overlap), `--mode create_missing|sync_changed|force_all`, `--include-dependencies false`, `--full` (extract).

## Bootstrapping a new project (reuse checklist)

For a new Woo→Shopify migration (WPML source supported out of the box), no code changes on the common path:

1. `config/projects/<name>.json` — copy `lush-qatar.json`, adjust store URLs, locales, currency, `source_label`. Keep `production: false` + `allow_wipe: true` while targeting a dev store.
2. `config/projects/<name>.env` — copy `.env.example`; add a **read-only** Woo REST key and the Shopify Dev Dashboard app credentials; mint the offline token (`mint-token url` / `exchange`).
3. `node src/cli.js --project <name>` — validates config and connectivity expectations.
4. `define-metafields` — create the migration-namespace definitions.
5. `extract --entities all --limit 10` then `load --entities all --limit 10` — smoke test, check results in the store admin.
6. `wipe --entities all --confirm <store-domain>` to clear the smoke test, then run the full migration (UI or CLI).

## Lush Qatar migration results (completed 2026-07-20)

Full migration into the dev store `lush-qatar.myshopify.com`, driven from the web UI.

| Entity | Source | Migrated | Live in store | Not migrated (reason) |
|---|---|---|---|---|
| Collections | 61 | 61 | 61 | — |
| Products | 538 (EN) / 526 (AR) | 537 | 537 | 1 — product 9026 has variations not linked to its Size attribute in WooCommerce (source defect; migrates automatically once fixed) |
| Customers | 1,954 accounts | 1,915 | 3,084 total (1,915 migrated + 1,169 auto-created from guest order history) | 39 — junk registrations with invalid emails from bot/scan traffic |
| Orders | 3,192 | 3,179 | 3,179 | 13 — orders with no line items and 0.00 total |

- 429 products and 53 collections carry Arabic translations (the rest have no Arabic content in the source).
- All products and collections are published to the Online Store channel.
- Total load time: products+collections 28m, customers 29m, orders ~11h across three sessions (dev-store cap of ~5 orders/min; lifts on a paid plan).
- Verify (run 12): counts reconciled per entity, 0 spot-check mismatches, 0 orphans.
- Full machine-generated detail: `node src/cli.js --project lush-qatar report`.

### PRD §20 acceptance criteria

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Full run completes with expected counts + verify passes | **PASS** | Run 9 (`full`, all entities, 9h 15m) + run 12 verify: 61 / 537 / 1,915 / 3,179, 0 mismatches, 0 orphans |
| 2 | Arabic content present on products/collections | **PASS** | Spot check: product "The Comforter" → `ذا كومفورتر` (title, body, SEO); collection "Bath Bombs" → `أملاح المغطس`; both locales published |
| 3 | Every migrated resource carries the migration metafields | **PASS** | Spot check order #2587 carries source, source_id, source_hash, synced_at, source_order_number, source_payment_method, source_line_semantics; 28 named definitions created |
| 4 | Repeat `create_missing` run creates nothing | **PASS** | Run 13: created 0 across all four entities (61 / 537 / 1,954 / 3,192 skipped) |
| 5 | `sync_changed` updates only edited records | **PASS** | M6 test: simulated source edit → exactly 1 product updated, 9 skipped; store restored from source afterwards |
| 6 | Chunked limit/offset runs do not overlap | **PASS** | M1/M2: limit 10 offset 0 then limit 10 offset 10 migrated records 1–20 in stable source-id order |
| 7 | Drivable from the web UI (browser closable) and the CLI | **PASS** | All four production loads run from the UI by the operator; cancel/resume exercised three times on orders; CLI used for verify/report/wipe |
| 8 | New project needs only config + env, no code changes | **PARTIAL** | Design and bootstrap checklist in place (see above); not yet exercised against a real second store — verify at the next project |

## Notes

- Modes: `create_missing` (default, resumes anything), `sync_changed` (pushes source edits; orders are immutable), `force_all` (re-push everything).
- Runtime state lives in `var/` (SQLite staging + id map, JSONL logs) — gitignored, regenerable; `rebuild-map` recovers the id map from the store itself.
- Dev stores cap order creation at ~5/min → the full 3,190-order load is an overnight run (cap lifts on a paid plan).
- Source data oddities found during migration are logged in `docs/client-data-quality-notes.md` for the client QA review.
- `legacy/` (old Python demo scripts) is reference-only; do not run or extend.
