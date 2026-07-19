# Implementation plan — WooCommerce → Shopify Data Migration Tool

Executable build plan for the tool specified in `migration-tool-prd.md` (read the PRD **first**; this plan does not repeat its details — every "per PRD §N" reference is binding). Field mapping: `data-mapping.md`. Milestones M0–M8 are strictly ordered; do not start a milestone before the previous one's acceptance checks pass.

## Rules for the implementing agent

1. **Never write to WooCommerce.** All source access is GET with Basic auth + a browser-like User-Agent (PRD §7).
2. **All Shopify writes target the dev store** `lush-qatar.myshopify.com` using `SHOPIFY_ADMIN_API_TOKEN` from `config/projects/lush-qatar.env`.
3. Before coding each Shopify mutation/query, fetch its current `2026-01` input shape with the **context7** MCP tool (Shopify dev docs). Do not code GraphQL from memory. If a PRD-named mutation is superseded, use the current equivalent and note it in a code comment.
4. Stack is pinned (PRD §4): Node ≥20 ESM (dev machine has v24; latest package versions fine), express, better-sqlite3, dotenv, native fetch on the backend (no other backend deps, no TypeScript there); frontend is Vite + React (JSX) + Tailwind + shadcn/ui in `ui/`.
5. When something ambiguous comes up, pick the option that is **safer for the source data and reversible on the dev store**, log the decision as a code comment, and continue. Do not stop to ask.
6. Smoke tests use `--limit 10`. Clean up between iterations with the `wipe` CLI command (only ever deletes id_map-tracked records).
7. Commit at the end of each milestone with message `migration-tool: M<N> <short description>`. Never commit anything under `var/` or any `.env` file.
8. Do not touch `../lush.qa_notes.md` or anything in the repo's parent directory.
9. **Never delete anything — files, git-tracked content, or store data — without asking Bassam first or keeping a backup copy of what gets deleted.** Moving/renaming is fine. The only designed exception is the `wipe` command (dev-store records the tool itself created, guarded per PRD §17).

## M0 — Scaffold, config, DB, park old scripts as legacy

All paths below are relative to the tool root `shopify/migration_from_woocommerce/migration-tool/` unless stated otherwise.

**Tasks**

1. In `shopify/migration_from_woocommerce/`: `git mv scripts legacy` — **do not delete anything** (Rule 9). Leave `__pycache__/` in place (it moves along; ensure `__pycache__/` is gitignored rather than deleting it). Add `legacy/README.md`: one paragraph saying these are the retired Python scripts that seeded the 2026-07-14 demo session, kept for reference only, not to be run or extended, and to be deleted only after asking Bassam at project end.
2. Create `migration-tool/` with `package.json` (`"type": "module"`, npm scripts: `start` → `node src/server.js`, `cli` → `node src/cli.js`, `test` → `node --test`). Install the three backend deps.
3. Create the backend layout from PRD §5: `src/config.js`, `src/db.js`, `src/log.js`, empty stubs for the rest, `test/`. (`ui/` comes in M7.)
4. `config.js`: load `--project` arg → read `config/projects/<name>.json` + `<name>.env` (dotenv), validate every key from PRD §6, fail fast with a message naming what's missing.
5. Create `config/projects/lush-qatar.json` exactly as PRD §6.1. **Move** the existing `shopify/migration_from_woocommerce/.env` to `config/projects/lush-qatar.env` (plain `mv` — it's untracked). Move `.env.example` into `migration-tool/` and update it to describe the per-project env location.
6. `db.js`: open `var/migration-tool.sqlite` (create `var/` if missing), run the PRD §8 DDL, export prepared-statement helpers. Implement `stableStringify()` + `sha256()` here or in a small `src/util.js`.
7. Update repo `.gitignore` per PRD §5.

**Acceptance**

- `node src/cli.js --project lush-qatar` prints a config summary (no secrets) and exits 0; with a key removed from the env file it exits non-zero naming the key.
- `var/migration-tool.sqlite` exists with all four tables (`sqlite3 var/migration-tool.sqlite ".tables"`).
- `git status` shows no `.env`, no `var/`; `legacy/` contains the three Python scripts unchanged.

## M1 — Runner, logging, WooCommerce extraction

**Tasks**

1. `src/log.js`: `logEvent(runId, level, {entity, source_id, action, message, data})` → insert into `run_events`, mirror to console, append to `var/logs/run-<id>.jsonl`.
2. `src/runner.js`: `createRun(project, type, entities, options)` → row in `runs` (queued); worker loop (single concurrency) picks oldest queued run, sets `running`/`started_at`, dispatches by type, finalizes status + stats per PRD §14; cooperative cancel flag checked between records; on-startup recovery marks stale `running` runs `failed`.
3. `src/connectors/woocommerce.js`: `fetchAll(entityPath, params)` implementing pagination, UA header, Basic auth, retries per PRD §18. GET only.
4. Extraction stage per PRD §10.1 for all four entities, including per-lang passes, `en_id` linkage from `translations`, `_variations` embedding, and the orders `lang=all` fallback rule. Upsert into `staging`; respect `limit`/`langs` options.
5. Wire `extract` into `src/cli.js` (foreground: create run, execute, stream events, exit code per result).

**Acceptance**

- `node src/cli.js --project lush-qatar extract --entities categories,products --limit 10` → staging has 10 `en` + up to 10 `ar` rows per entity, every `ar` row has a correct `en_id`, run finishes `success`.
- Full extract (`--entities all`, no limit) matches PRD §7 volumes within normal drift: ~538 products ×2 langs, ~61 categories ×2, ~1,950 customers, ~3,184 orders. Record actual totals in the run stats. If orders come up short, confirm the `lang=all` fallback fired (event log).
- Re-running extract does not duplicate rows (PK upsert).

## M2 — Shopify client, metafields, collections + products load

**Tasks**

1. `src/connectors/shopify.js`: `gql(query, variables)` against `https://{store}/admin/api/{version}/graphql.json` with the offline token; throttling + retry per PRD §18; helper `metafieldsFor(record)` building the PRD §12 set.
2. `src/entities/index.js`: registry `{name, dependencies, extract, transform, load, verify}` per entity + dependency expansion (PRD §9.2).
3. `src/entities/categories.js`: transform + load per PRD §10.2; write `id_map`.
4. `src/entities/products.js`: transform + load per PRD §10.3 (variants, images, inventory at the primary location, SEO, status, collection membership via the M2.3 id_map, per-entity metafields incl. `dimensions`). Mode logic per PRD §13.
5. Pure transforms take a staged row (+ its AR sibling, + id_map lookups) and return the mutation payload — no I/O — so they're unit-testable. Add `test/transform.test.js` cases: simple product, variable product, sale-price product, product with unmapped category, category, decoded Arabic-slug handling.
6. Wire `load` into the CLI.

**Acceptance**

- `extract` then `load --entities categories,products --limit 10`: dev store admin shows 10 collections… (categories count may be fewer if <10 staged) and 10 products with correct titles, prices, variants, images, inventory, collection membership, and `dotaim_migration.*` metafields (check one product's metafields in admin).
- Immediate re-run of the same load: stats show `created:0, skipped:10`.
- `npm test` passes.

## M3 — Customers load

**Tasks**

1. `src/entities/customers.js` per PRD §10.4: email dedup, phone normalization exactly as specified, billing → default address, no marketing opt-in, metafields, retry-without-phone fallback, mode logic.
2. Unit tests: phone normalization table (8-digit local, `00974…`, `974…`, `+974…`, garbage), no-email skip.

**Acceptance**

- `load --entities customers --limit 10` → 10 customers in admin with correct emails/names/addresses; re-run skips 10; a record with an invalid phone still loads (phone dropped, `warn` logged).

## M4 — Orders load

**Tasks**

1. Verify via context7 how `orderCreate` in `2026-01` expresses: past `processedAt`, notification suppression, inventory bypass, financial status/transactions, order name/number override. Note findings in code comments.
2. `src/entities/orders.js` per PRD §10.5: status mapping table, customer link via id_map with unlinked-email fallback (guest orders are common), line linking by `variation_id`/`product_id` → SKU → custom line, fee/coupon lines, partial-refund metafield rule, tax/shipping/discount lines, QAR, order-number preservation (or metafield fallback), `source_invoice_number` metafield, immutability in all modes.
3. Unit tests: status mapping (every Woo status in the PRD table), an order with one mapped and one unmapped line, a guest order, an order with a partial refund.

**Acceptance**

- `load --entities orders --limit 10 --include-dependencies false` after M2/M3 test data exists: 10 orders in admin; totals equal the Woo totals (manually compare 3 in admin vs `staging` payloads — record the comparison in the run log via a `verify`-style event or milestone notes); statuses match the mapping; no customer received any email (dev store has no real notification targets, but confirm the suppression flag is set in the mutation payload).
- Re-run: `created:0`, all skipped as existing (orders immutable).

## M5 — Translations (Arabic)

**Tasks**

1. `src/translations.js` per PRD §11: `shopLocales` check + `shopLocaleEnable("ar")` (actionable error if `write_translations` scope is missing); `translatableResource` digest fetch; `translationsRegister` for products + collections (title, body/description, SEO where translatable); AR-slug metafield; missing-AR-sibling skip with `warn`.
2. Call the translation step from the product/collection load path (after create/update) and count `translated` in stats.
3. **Sales channel (added 2026-07-19 per Bassam):** publish every migrated product and collection to the Online Store publication (`publishablePublish`, PRD §10.2/§10.3), non-fatal per record, counted as `published` in stats.

**Acceptance**

- After a limit-10 products+categories load: switching admin/storefront locale to Arabic shows AR titles/descriptions for the migrated items; `stats.products.translated` ≈ created+updated; items with no AR sibling logged as `warn`, not failed.

## M6 — Verify stage, resync, rebuild-map

**Tasks**

1. `verify` run type per PRD §15 (counts, 5-record spot checks per entity, orphans list) persisted into `stats.verify`; CLI `verify` command prints the report.
1b. Incremental extraction per PRD §10.1 (`modified_after` from max staged `extracted_at` minus 1h; `--full` CLI flag / `extract_full` option to force complete re-fetch; categories always full; per-run `info` note about deletions being invisible to incremental runs). Test: incremental run after a full extract finishes in seconds and stages only recently-modified records.
2. Prove the PRD §13 mode matrix end-to-end (this is a test task, not new code beyond fixes it uncovers): edit one migrated product's title in WooCommerce admin **— exception to Rule 1, done manually by the operator; the agent instead simulates it by editing the staged payload's title and re-hashing —** then `load --mode sync_changed`: exactly that product updates. `--mode force_all`: all update. Orders untouched in both.
3. CLI `rebuild-map` per PRD §12: page each resource type reading namespace metafields → repopulate `id_map`; `warn` on the old-orders scope limitation. Test: delete `var/migration-tool.sqlite`, re-extract, `rebuild-map`, then `load --mode create_missing --limit 10` → all skipped (map correctly rebuilt).

**Acceptance**

- `verify` after the limit-10 dataset reports matching counts, 0 spot-check mismatches, 0 orphans; the three tests in task 2–3 behave exactly as stated.

## M7 — Web UI + wipe + mint-token

**Tasks**

1. Scaffold `ui/`: `npm create vite@latest ui -- --template react` (JSX, not TS), add Tailwind, then `npx shadcn@latest init` and add the components needed (button, card, table, badge, checkbox, radio-group, input, select, alert, progress). Verify current shadcn CLI usage via context7 if the commands fail.
2. Build the three views per PRD §16 (dashboard, new-run form, run page) as React routes, polling the JSON API every 2s with `fetch` + `setInterval`; dependency auto-check on the run form, "Test run (10 products)" preset, cancel button, "you can close this page" note. No state-management or data-fetching libraries.
3. `src/server.js`: JSON API per PRD §16 + serve `ui/dist/` statically with an SPA fallback to `index.html`. Add npm scripts: `ui:dev` (Vite dev server proxying `/api` to :4780) and `ui:build`.
4. `wipe` CLI command per PRD §17 (id_map-only deletion, `--confirm` domain match, `production`/`allow_wipe` guards, clears id_map rows). Verify deletion mutations via context7 (`productDelete`, `collectionDelete`, `customerDelete`, `orderDelete` or current equivalents).
5. `mint-token` CLI command: Node port of the OAuth-code-flow offline-token mint (Dev Dashboard app credentials from env; local callback listener; prints the `shpat_`/`shpca_` token for the operator to paste into the env file). Reference: `legacy/get_admin_token.py` (read for the flow, do not run).
6. Cancel path test: start a no-limit products load from the UI, cancel mid-run, confirm status `cancelled`, partial `id_map` kept, and a follow-up `create_missing` run resumes cleanly.

**Acceptance**

- Full loop from the browser: dashboard shows real counts → new run (test preset) → run page live-updates with the browser closable mid-run → verify report reachable. `wipe --entities products,categories,customers,orders --confirm lush-qatar.myshopify.com` returns the dev store to empty-of-migrated-data and empties `id_map`.

## M8 — Full migration rehearsal + docs

Note (2026-07-19): the store was reset with `wipe --scope all` (demo data included) and the run history cleared; **Bassam drives the M8 runs himself from the web UI** in the order products → customers → orders (orders via cancel/resume around the dev-store 5/min cap). The agent's M8 work is the support tasks below plus fixing whatever the full runs surface.

**Tasks**

0. Before the full product load: create **metafield definitions** for the `dotaim_migration` namespace keys on each owner type (`metafieldDefinitionCreate` — verify shape via context7), so migration metafields appear structured (with descriptions) in the admin instead of "unstructured". Idempotent: skip existing definitions.
0b. `report` CLI command: generates a client-facing migration report (markdown) from the latest verify snapshot per entity + run stats — counts per entity and language, spot-check results, failures with reasons, durations. This feeds the report for Dee (see M8 task 4).
1. `full --entities all` (no limit) on the dev store. Watch for: variant-limit failures, image fetch failures, throttling behavior, order-total mismatches. Fix and re-run (Create missing resumes) until the PRD §20 acceptance list passes end-to-end.
2. Write `shopify/migration_from_woocommerce/migration-tool/README.md`: setup (nvm/node, npm i in both packages, ui:build, project config), CLI reference, UI walkthrough, "new project bootstrap" section (PRD §20.8), known limitations (guest customers, order immutability, partial refunds, no pages/blog/redirects yet).
3. Update `docs/migration-runbook.md`: check off the Phase 3 entities covered by the rehearsal, and add a line pointing Phase 3 execution at this tool + README.
4. Record final rehearsal stats (counts, failures + reasons, duration) in the README under "Lush Qatar rehearsal results".
5. **Client report for Dee**: from the `report` command output + `client-data-quality-notes.md`, draft the client-facing migration report (client conventions: warm professional tone, no em-dashes, no internal jargon): what was migrated (counts per entity, both languages), what was verified and how, known source-data notes with suggested handling, and what happens next (ongoing sync until launch). Deliver via the usual channel (email/Drive) after Bassam reviews.

**Acceptance**

- All eight PRD §20 criteria pass and are individually noted (pass/fail + evidence) in the M8 commit message or README section. The tool is then ready for the real Phase 3 sign-off migration runs.

## Explicitly deferred (do not build now)

- CMS pages, blog, URL-redirect entity modules (redirects will use the preserved handles + `source_ar_slug` metafields).
- Guest-order → customer creation; customer account invites.
- Multi-run concurrency; remote hosting/auth; non-Woo sources (the connector seam in `src/connectors/` is the extension point).
