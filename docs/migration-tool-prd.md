# PRD — WooCommerce → Shopify Data Migration Tool ("migration-tool")

Product requirements for the in-house data migration tool. The implementation plan that executes this PRD is `migration-tool-plan.md`. Field-level mapping remains in `data-mapping.md`; this document adds everything needed to build the tool. Project background is in `lush-migration-project-context.md`.

**This document is written to be executed by an implementing agent without asking questions.** Where an exact Shopify/WooCommerce API field shape may have drifted, the requirement states the *intent* and instructs the implementer to verify the current shape with the **context7** MCP tool before coding. Everything else is prescriptive: follow it as written.

---

## 1. Purpose

Build a reusable, locally run tool that migrates store data from WooCommerce to Shopify:

- First consumer: **Lush Qatar** (`lush.qa` → `lush-qatar.myshopify.com`), bilingual English/Arabic (WPML on the source).
- Designed generic and config-driven so it can be reused for future projects (other stores, other locale pairs) by adding a project config, without code changes for the common path.
- Replaces the throwaway Python scripts in `shopify/migration_from_woocommerce/scripts/` (rushed test tooling; do not reuse or extend them). **Do not delete them**: move them to `shopify/migration_from_woocommerce/legacy/` as reference-only (they produced data for the 2026-07-14 demo session). Deletion only at project end and only after asking Bassam.

Reference for feature parity: LitExtension's WooCommerce→Shopify service (used on DotAim's previous KSA/Lebanon migrations). This tool reproduces the parts we need: entity selection, demo-sized test runs, background execution, 301-safe handle preservation, recent-data resync, and re-migration.

## 2. Goals

1. Migrate the four core entities: **product categories, products, customers, orders** (v1 scope).
2. Bilingual migration: English content as primary Shopify locale, Arabic registered as Shopify translations.
3. Web interface to configure, start, monitor, and cancel migration runs, with runs executing in the background (browser can be closed; the server process keeps running the job).
4. Every migrated Shopify resource is identifiable as migrated (metafields) and re-linkable to its WooCommerce source record.
5. Resync: re-running picks up new source records and (except orders) source-side edits.
6. Partial runs: select entities, limit counts (e.g. 10 for a test), chunked imports with a stable offset, or everything.
7. Full action/result logging, persisted and viewable in the UI.
8. Config-driven multi-project support (one project active per server instance is acceptable in v1).

## 3. Non-goals (v1)

- CMS pages, blog posts, coupons, URL redirects (architecture must allow adding them as entity modules later; redirects will consume the handle/slug data this tool preserves).
- Customer passwords (impossible cross-platform; account invites are a cutover decision outside this tool).
- Deleting/archiving Shopify records that disappeared from the source (report only, never delete automatically).
- Creating customer records from guest orders (guest orders import with email only, unlinked).
- Embedding in Shopify admin, multi-user auth, remote hosting. This is a local, single-operator tool.
- Writing anything to the WooCommerce site. **The source is strictly read-only, always.**

## 4. Tech stack (pinned — do not substitute)

| Concern | Choice |
|---|---|
| Runtime | Node.js ≥ 20 (dev machine has v24.15.0 — target that; latest package versions are fine), ES modules (`"type": "module"`) |
| Backend language | Plain JavaScript, no TypeScript on the backend |
| Web server | `express` (latest) |
| Database | `better-sqlite3` (single file DB in `var/`) |
| HTTP client | Native `fetch` — no axios |
| Env/config | `dotenv` + JSON project files |
| Frontend | **Vite + React (JSX) + Tailwind CSS + shadcn/ui** in `ui/`; production build (`ui/dist/`) served statically by express; data via fetch polling of the JSON API (no websockets) |
| Tests | `node:test` built-in runner (backend transform tests) |

Backend npm dependencies: `express`, `better-sqlite3`, `dotenv` — nothing else without a reason recorded in the plan. Frontend dependencies are whatever Vite/Tailwind/shadcn scaffolding brings in (kept inside `ui/package.json`); do not add state-management or data-fetching libraries — component state + `setInterval` polling is enough.

## 5. Location and layout

The tool lives in its own subdirectory `shopify/migration_from_woocommerce/migration-tool/`; the old Python scripts move (not delete) to a `legacy/` sibling:

```
shopify/migration_from_woocommerce/
├── legacy/                       # old Python demo scripts — reference only, do not run or extend
│   └── README.md                 # one paragraph: what these were (2026-07-14 demo seed), why kept
├── __/                           # existing private screenshots/data snapshots (unchanged)
└── migration-tool/
    ├── package.json              # backend package
    ├── .env.example              # template for per-project env files
    ├── config/
    │   └── projects/
    │       ├── lush-qatar.json   # non-secret project config (committed)
    │       └── lush-qatar.env    # secrets (gitignored)
    ├── src/
    │   ├── server.js             # express app: serves ui/dist + JSON API
    │   ├── cli.js                # CLI entry (same runner as the UI)
    │   ├── config.js             # project config + env loading/validation
    │   ├── db.js                 # sqlite open + schema migrations
    │   ├── log.js                # run_events writer + console mirror
    │   ├── runner.js             # job queue, worker loop, cancellation
    │   ├── connectors/
    │   │   ├── woocommerce.js    # REST extraction, pagination, retries
    │   │   └── shopify.js        # Admin GraphQL client, throttling, retries
    │   ├── entities/
    │   │   ├── index.js          # entity registry + dependency graph
    │   │   ├── categories.js
    │   │   ├── products.js
    │   │   ├── customers.js
    │   │   └── orders.js
    │   └── translations.js       # ar locale enablement + translationsRegister
    ├── ui/                       # Vite + React + Tailwind + shadcn/ui app (own package.json)
    │   └── dist/                 # build output served by express (gitignored)
    ├── var/                      # gitignored: migration-tool.sqlite, logs/
    └── test/
        └── transform.test.js     # pure transform unit tests
```

`.gitignore` additions: `shopify/migration_from_woocommerce/migration-tool/var/`, `.../migration-tool/config/projects/*.env`, `.../migration-tool/ui/dist/`, `node_modules/`.

## 6. Configuration

### 6.1 Project JSON — `config/projects/<name>.json` (committed, no secrets)

```json
{
  "name": "lush-qatar",
  "source": {
    "platform": "woocommerce",
    "url": "https://lush.qa",
    "primary_lang": "en",
    "secondary_langs": ["ar"],
    "multilingual_plugin": "wpml"
  },
  "target": {
    "platform": "shopify",
    "store_domain": "lush-qatar.myshopify.com",
    "api_version": "2026-01",
    "primary_locale": "en",
    "secondary_locales": ["ar"],
    "currency": "QAR",
    "production": false,
    "allow_wipe": true
  },
  "phone_default_country": "+974",
  "metafield_namespace": "dotaim_migration",
  "source_label": "woocommerce:lush.qa"
}
```

`production: true` disables the wipe command regardless of `allow_wipe`. Validation: on startup, fail fast with a clear message listing any missing/invalid config or env key.

### 6.2 Per-project env — `config/projects/<name>.env` (gitignored)

Same variable names as the existing `.env.example` for continuity: `WOO_STORE_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET`, `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_API_VERSION`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_ADMIN_API_TOKEN`. The existing `shopify/migration_from_woocommerce/.env` (real Lush Qatar credentials, including the already-minted offline `SHOPIFY_ADMIN_API_TOKEN`) is **moved** to `migration-tool/config/projects/lush-qatar.env`.

Server selects the project via `--project <name>` argument (default: the only project file present; error if several and none specified).

## 7. Verified source facts (Lush Qatar — do not re-derive)

These were verified against the live store on 2026-07-19 and 2026-07-12; build on them:

- Multilingual plugin is **WPML**. Arabic site at `https://lush.qa/ar/`.
- The WooCommerce REST API (`/wp-json/wc/v3/`) honors a **`lang` query parameter** (`lang=en`, `lang=ar`) and every record carries a **`translations` object** mapping locale → source ID of the sibling translation (e.g. `{"ar":"18796","en":"18788"}`). This is the linkage key between EN and AR records. No DB/SSH access is required for bilingual extraction.
- Requests must send a browser-like `User-Agent` header (the host blocks default library UAs).
- Auth: Basic auth with consumer key/secret over HTTPS. The key is **read-only** — never attempt a write.
- Volumes (2026-07-12): 538 products (407 simple, 131 variable), 61 categories, 1,950 registered customers, 3,184 orders, 0 coupons. Currency QAR.
- **Product statuses (2026-07-19): 319 published, 219 draft, 0 pending/private, 4 trashed.** Drafts are 40% of the catalog and must migrate (as Shopify DRAFT) so historical orders link to real variants.
- **No SEO plugin** on the source (theme is XStore + Elementor) — SEO fields always come from the fallback rule (§10.3).
- **Category hierarchy in use**: 44 of 61 categories have a parent (§10.2 flattening rule).
- **SKU coverage is 86%** — order line items link by `product_id`/`variation_id` first, SKU second.
- **Guest orders are common** (`customer_id: 0`); a PDF-invoice plugin keeps a separate invoice number (`wpo_wcpdf_invoice_number`) on orders.
- Full field-level findings: `data-mapping.md` → "Source-verified facts".
- Shopify target: dev store `lush-qatar.myshopify.com`, offline Admin API token already minted (Dev Dashboard app "DotAim - Lush Qatar Store Ops"). `orderCreate` requires this offline token — the CLI's online token does not work for order writes.

## 8. Data model (SQLite)

One database `var/migration-tool.sqlite`. Create via idempotent migrations in `db.js` (`CREATE TABLE IF NOT EXISTS`). All timestamps are ISO-8601 UTC strings.

```sql
CREATE TABLE IF NOT EXISTS staging (
  project     TEXT NOT NULL,
  entity      TEXT NOT NULL,          -- categories|products|customers|orders
  lang        TEXT NOT NULL,          -- 'en','ar'; '-' for language-neutral (customers, orders)
  source_id   INTEGER NOT NULL,       -- WooCommerce ID in that language
  en_id       INTEGER NOT NULL,       -- canonical EN record id (equals source_id for en/'-' rows)
  payload     TEXT NOT NULL,          -- raw JSON from the source API
  hash        TEXT NOT NULL,          -- sha256 of payload
  extracted_at TEXT NOT NULL,
  PRIMARY KEY (project, entity, lang, source_id)
);

CREATE TABLE IF NOT EXISTS id_map (
  project      TEXT NOT NULL,
  entity       TEXT NOT NULL,
  source_id    INTEGER NOT NULL,      -- canonical EN source id
  target_id    TEXT NOT NULL,         -- Shopify GID
  target_handle TEXT,
  hash_at_sync TEXT NOT NULL,         -- transform hash at last successful load
  synced_at    TEXT NOT NULL,
  PRIMARY KEY (project, entity, source_id)
);

CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project     TEXT NOT NULL,
  type        TEXT NOT NULL,          -- extract|load|verify|full|wipe
  entities    TEXT NOT NULL,          -- JSON array
  options     TEXT NOT NULL,          -- JSON (mode, limit, offset, langs, include_dependencies)
  status      TEXT NOT NULL,          -- queued|running|success|failed|cancelled
  stats       TEXT,                   -- JSON, see §14
  created_at  TEXT NOT NULL,
  started_at  TEXT,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS run_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id    INTEGER NOT NULL,
  ts        TEXT NOT NULL,
  level     TEXT NOT NULL,            -- debug|info|warn|error
  entity    TEXT,
  source_id INTEGER,
  action    TEXT,                     -- extract|create|update|skip|fail|verify|wipe|system
  message   TEXT NOT NULL,
  data      TEXT                      -- JSON detail (request summary, userErrors, ids)
);
CREATE INDEX IF NOT EXISTS idx_events_run ON run_events (run_id, id);
```

Hashing: `sha256` hex over a **stable stringify** (recursively key-sorted JSON) of the object. Implement one `stableStringify()` helper and use it for both staging payload hashes and transform hashes.

## 9. Pipeline

A **run** executes stages per entity in dependency order. Run types:

- `extract` — source → `staging` (all selected langs).
- `load` — `staging` → Shopify (+ translations) → `id_map`.
- `verify` — counts + spot checks, produces a report (§15).
- `full` — extract, then load, then verify.
- `wipe` — CLI-only (§17), deletes only id_map-tracked resources.

### 9.1 Run options

| Option | Values | Meaning |
|---|---|---|
| `entities` | subset of `categories, products, customers, orders` | what to process |
| `include_dependencies` | bool, default `true` | auto-add dependencies (§9.2) to the run |
| `mode` | `create_missing` (default) \| `sync_changed` \| `force_all` | load behavior (§13) |
| `limit` | int or empty | max records per entity this run (empty = all) |
| `offset` | int, default 0 | skip the first N staged records |
| `langs` | default `["en","ar"]` | which languages to extract/translate |

Chunk semantics: at the load stage, staged records are ordered by `en_id` ascending; `offset`/`limit` slice that ordering. Because ordering is stable, "chunks of 100" = successive runs with offset 0, 100, 200… A limit-10 run is the standard smoke test. `create_missing` also makes plain re-runs resume naturally after a failure or cancellation (already-mapped records are skipped), so offset is a convenience, not a requirement, for resuming.

### 9.2 Entity dependency graph

```
categories  → (none)
products    → categories        (collection membership)
customers   → (none)
orders      → customers, products   (soft links, see below)
```

With `include_dependencies=true` (default): selected entities are expanded with their dependencies and processed in dependency order. With `false`: run exactly what was selected, and apply these soft-link rules at order load:

- Order's customer email not in `id_map` → create the order **unlinked**, with the billing email set on the order; log `warn`.
- Order line's SKU/product not in `id_map` → create a **custom line item** (title + price + quantity from source); log `warn`.

These same rules also apply when dependencies are included but an individual record failed to load.

### 9.3 Background execution & cancellation

Runs are queued in `runs` (status `queued`); a single in-process worker loop executes one run at a time (concurrency 1). The HTTP request that creates a run returns immediately with the run id — the browser is not needed thereafter. Cancellation is cooperative: `POST /api/runs/:id/cancel` sets a flag; the worker checks it between records and finishes with status `cancelled`, keeping all completed work. On server restart, any run stuck in `running` is marked `failed` with an event noting the restart.

## 10. Entity specifications

For every Shopify mutation used, first pull the current input shape for API version `2026-01` via **context7** (`/websites/shopify_dev` or the GraphQL Admin API reference). Mutation names below are the intended ones; if a name has been superseded in `2026-01`, use the current equivalent and note it in code comments.

### 10.1 Extraction (all entities)

- Endpoints: `GET {WOO_STORE_URL}/wp-json/wc/v3/{products|products/categories|customers|orders}` with `per_page=100&page=N`, Basic auth, browser UA.
- Products: pass `status=any` **explicitly** — drafts must be extracted (they become Shopify DRAFT products, invisible on the storefront but linkable from historical orders; 219 of lush.qa's 538 products are drafts). Trashed products (`status=trash`, 4 on lush.qa) are intentionally **not** extracted; order lines referencing them fall back to custom line items (§10.5).
- Paginate until the `X-WP-TotalPages` header is exhausted. Record totals from `X-WP-Total`.
- Language-bearing entities (`products`, `categories`): extract once per lang (`lang=en`, then `lang=ar`); store each row with its `lang` and set `en_id` from the record's `translations.en`. Rows missing a `translations.en` value: store with `en_id = source_id` and log `warn` (orphan translation).
- **Discard WPML language-fallback records**: a `lang=<secondary>` request also returns untranslated originals whose payload `lang` field is the primary language — skip any record whose payload `lang` mismatches the requested language (verified on lush.qa: 217 products + 8 categories). Duplicate secondary-language translations exist in the source; the load-stage sibling lookup must be deterministic (newest source_id wins).
- Variations: for each variable product (`type == "variable"`), also fetch `GET /products/{id}/variations?per_page=100` and embed the result into the staged product payload as `_variations`.
- `customers`: `lang='-'`, paginate `role=all` default ordering.
- `orders`: `lang='-'`. Extract **without** a `lang` param first; if the fetched total is materially below the known count (3,184 for Lush Qatar), retry with `lang=all` and use whichever returns more. (WPML sometimes filters order endpoints by language.)
- Extract is a full upsert into `staging` (replace payload/hash per PK). `limit` applies per entity per lang.
- **Incremental refresh** (the source server is very slow — full pulls take 30+ min): once an entity has a completed full extract, subsequent extract runs default to passing `modified_after=<max(extracted_at) for that entity minus 1h overlap>&dates_are_gmt=true` for **products and orders** (verified working live). **Categories and customers always re-fetch in full** — taxonomy terms have no modified filter, and the customers endpoint ignores `modified_after` (verified: returns the full set). An `extract_full: true` run option (CLI `--full`) forces a complete re-fetch. Caveat (log as `info` on every incremental run): incremental extracts cannot detect source-side deletions — run one full extract before the final pre-cutover verify.

### 10.2 Categories → Collections

- Transform per `data-mapping.md`: manual (custom) collections; title, `descriptionHtml`, handle from decoded EN slug, image, SEO title/description (fallback rule — no SEO plugin on source).
- Hierarchy flattening: every category becomes a flat collection; the parent category's **handle** is stored as metafield `parent_category` (empty for roots). The theme-phase navigation menus consume this; the tool itself builds no menus.
- Load: `collectionCreate` / `collectionUpdate`. Membership is set from the product side (§10.3).
- **Sales channel:** publish every migrated collection to the **Online Store** publication (`publishablePublish`; resolve the publication id once via the `publications` query). API-created resources are not automatically visible on the storefront.
- Metafields (§12) + AR translation (§11).

### 10.3 Products

- Transform per `data-mapping.md`. Key rules:
  - Handle = URL-decoded EN slug. Decode `%`-encoded slugs before use.
  - Simple product → single default variant (price, compare-at from regular/sale, SKU, weight, inventory).
  - Variable product → options from Woo attributes used for variations (max 3 options); variants from `_variations` (price, SKU, weight, image link, inventory). If the variant count exceeds Shopify's per-product limit for the chosen mutation (verify the current limit via context7), fail that product with a clear `error` event and continue the run.
  - Sale price → `price`, regular price → `compareAtPrice` (only when sale is active/lower).
  - Images: use source URLs (publicly reachable; geo-lock is removed) so Shopify fetches them; preserve alt text; dedupe by URL; featured image first.
  - Status: Woo `publish` → `ACTIVE`, anything else (`draft`, `pending`, `private`) → `DRAFT`.
  - SEO: no SEO plugin on the source (verified) — always generate: SEO title = product name; SEO description = stripped `description` excerpt truncated to 320 chars.
  - Tags → tags. Vendor = `brands[0].name` when present (lush.qa: "Lush"); empty otherwise.
  - Barcode = `global_unique_id` when present. Inventory policy: `backorders != "no"` → CONTINUE, else DENY. Sale price applies only if `date_on_sale_from/to` make it currently active.
  - Dimensions (L/W/H) → metafields `dotaim_migration.dimensions` (JSON string), since Shopify has no native fields.
- Load: `productSet` (preferred — idempotent create-or-update by id, covers options/variants; verify whether it accepts media/files and collection memberships in `2026-01` via context7; if not, use `productCreateMedia` for images and `collectionAddProductsV2` for membership as follow-up calls in the same record's load step).
- Inventory: resolve the store's primary location GID once (query `locations(first:1)`), cache it in memory, set quantities via `inventorySetQuantities` (or the current equivalent).
- Collection membership from the product's Woo category IDs → mapped collection GIDs; unmapped category → `warn`, continue.
- **Sales channel:** publish every migrated product to the **Online Store** publication (same mechanism as collections, §10.2). DRAFT products are published too — the channel assignment applies once they go active.

### 10.4 Customers

- Transform per `data-mapping.md`. Dedup key: lowercased email; skip records without email (log `warn`).
- Phone normalization: strip all non-digits; `00` prefix → drop; if the result starts with the digits of `phone_default_country` (e.g. `974`) → prepend `+`; if it is 8 digits (Qatar local length) → prepend `phone_default_country`; otherwise prepend `+` and pass through. If Shopify rejects the phone, retry the same mutation once **without** the phone field and log `warn`.
- Load: `customerCreate` / `customerUpdate` (verify current names/shapes via context7). Default address from Woo billing address; add the Woo shipping address as a second address only when it differs from billing. Do not send marketing-consent opt-ins (historical customers must not be opted in by this tool).

### 10.5 Orders

- Historical orders: import as-is, no notifications to customers, no inventory movements. Verify via context7 how `orderCreate` (offline token required) expresses: processed-at date in the past, suppression of receipts/notifications, inventory bypass, financial status, and transactions — then implement accordingly.
- Order number: preserve the Woo order number (LitExtension parity "preserve order IDs") — set the order name/number if the API allows; otherwise store the Woo number as metafield `dotaim_migration.source_order_number` and log once per run (`info`) that native numbers could not be preserved.
- Customer link by billing-email lookup in `id_map`; soft-link rules per §9.2. Guest orders (`customer_id: 0`, common on lush.qa) always import unlinked with the billing email.
- Line items: link by `variation_id`/`product_id` against `id_map` **first** (14% of products have no SKU), then by SKU, else a custom line item. Line price = line `total` / quantity (post-discount; `subtotal` differs when line discounts applied).
- `fee_lines` → additional custom line items; `coupon_lines` → discount code/line preserving the code text (0 coupons on lush.qa, map anyway for reuse).
- Refunds: Woo status `refunded` → financial status refunded. Orders with a non-empty `refunds` array but a non-refunded status (partial refunds): import as-is, add metafield `dotaim_migration.source_refunds` (JSON of the refunds array), log `warn` — v1 does not reconstruct partial-refund transactions.
- `customer_note` → order note. Additional metafields: `source_invoice_number` (`wpo_wcpdf_invoice_number`), `source_payment_method` (+ `transaction_id` when present).
- Totals fidelity: line prices, tax lines, shipping lines, and discount totals must reproduce the Woo totals; the imported order total in Shopify admin must equal the Woo total (verify in the verify stage on a sample). Check the source `prices_include_tax` setting during build and mirror its effect. Currency from project config (QAR).
- Status mapping (Woo → Shopify financial / fulfillment):

| Woo status | Financial | Fulfillment | Notes |
|---|---|---|---|
| `pending` | pending | unfulfilled | |
| `on-hold` | pending | unfulfilled | |
| `processing` | paid | unfulfilled | |
| `completed` | paid | fulfilled | |
| `refunded` | refunded | unfulfilled | full refund; amounts from Woo |
| `cancelled` | voided | unfulfilled | mark order cancelled if the API supports it |
| `failed` | voided | unfulfilled | tag `source-status:failed` |
| anything else | pending | unfulfilled | tag `source-status:<status>`, log `warn` |

- Orders are **immutable after load**: `sync_changed`/`force_all` never update an existing mapped order; they only create missing ones (skip + `debug` event for existing).
- Payment method: store Woo `payment_method_title` as metafield `dotaim_migration.source_payment_method` (reference only).

## 11. Bilingual handling

1. English is the store's primary locale; all §10 loads use EN content.
2. One-time per project: ensure the secondary locale exists — query `shopLocales`; if `ar` is missing, run `shopLocaleEnable(locale: "ar")`. Requires the `write_translations` scope on the app token; if the scope is missing, stop with an actionable error telling the operator to re-install/re-auth the Dev Dashboard app with `write_translations` added.
3. After a product/collection is created or updated, register AR translations: query `translatableResource(resourceId:)` for translatable keys + digests, then `translationsRegister` for locale `ar` with, at minimum: `title`, `body_html`/`descriptionHtml`, and SEO title/description where translatable. AR values come from the staged AR sibling row (via `translations.en` linkage). Missing AR sibling → skip translation, log `warn`.
4. AR slug: do **not** translate handles. Store the decoded AR slug as metafield `dotaim_migration.source_ar_slug` (products, collections) — the future redirects module consumes it.
5. Customers and orders are language-neutral: no translation step.

## 12. Migrated-data identification (metafields + id_map)

Every resource this tool creates gets metafields in the project's namespace (default `dotaim_migration`), set in the same load step (`metafieldsSet` or inline on the create mutation):

| Key | Type | Value |
|---|---|---|
| `source` | `single_line_text_field` | project `source_label`, e.g. `woocommerce:lush.qa` |
| `source_id` | `single_line_text_field` | canonical EN WooCommerce ID |
| `source_hash` | `single_line_text_field` | transform hash at last sync (same value as `id_map.hash_at_sync`) |
| `synced_at` | `date_time` | last sync time |

Plus the per-entity extras defined in §10 (`dimensions`, `source_ar_slug`, `parent_category`, `source_order_number`, `source_invoice_number`, `source_payment_method`, `source_refunds`).

The local `id_map` is the fast path; metafields are the durable in-Shopify marker. Provide a CLI command `rebuild-map` that repopulates `id_map` by paging through each Shopify resource type reading the namespace metafields (recovery path if `var/` is lost). Note: reading orders older than 60 days requires the protected `read_all_orders` scope — **already granted** on the "DotAim - Lush Qatar Store Ops" app (approved during the July test imports). Still check at runtime for generic reuse: if a project's token lacks it, `rebuild-map` logs a `warn` that old orders were not scanned.

## 13. Resync semantics (mode behavior at load)

For each staged record (after offset/limit slicing), compare against `id_map`:

| Case | `create_missing` | `sync_changed` | `force_all` |
|---|---|---|---|
| Not in id_map | create | create | create |
| In id_map, transform hash == `hash_at_sync` | skip (`debug`) | skip (`debug`) | update |
| In id_map, hash differs | skip (`info`, "changed but mode=create_missing") | update | update |

Orders: never updated in any mode (§10.5). Records present in `id_map` but missing from fresh staging (deleted at source) are **reported** in the verify stage, never deleted. A typical "resync before go-live" = `full` run with `sync_changed` (LitExtension parity: Recent Data Migration + Smart Update; `force_all` covers Re-Migration).

## 14. Logging

- Every action writes a `run_events` row: extraction page fetches (`debug`), every Shopify write with outcome + target id + duration + any `userErrors` (`info`/`error`), every skip with reason, every soft-link fallback (`warn`).
- Events mirror to the console and to `var/logs/run-<id>.jsonl` (one JSON object per line — belt-and-braces if the DB is lost).
- Run `stats` JSON, updated as the run progresses and finalized at the end:

```json
{ "products": { "extracted": 538, "created": 10, "updated": 0, "skipped": 0, "failed": 1, "translated": 10 }, "...": {} }
```

- A run with any `failed` record finishes as `success` with failures listed (visible in stats + events); it finishes `failed` only on a run-level error (config, auth, crash). Failed records are retried naturally on the next `create_missing` run.

## 15. Verify stage

Per entity, produce and persist (in `stats.verify`) a report:

1. **Counts**: staged count **per language** vs `id_map` count vs live Shopify count (`productsCount`, `customersCount`, `ordersCount`, collections count — verify query names via context7). Live counts may legitimately exceed id_map counts if the store has non-migrated data; flag only `id_map > live`. Note: wp-admin shows combined-language totals (WPML) — per-language REST counts are the comparable numbers.
   The latest verify snapshot per project is kept as the authoritative "final migrated numbers" record (used for client sign-off at Stage 2).
2. **Spot checks**: 5 random mapped records per entity — fetch from Shopify and compare: product title/price/variant count, customer email/name, order total/financial status, collection title. Report field-level mismatches.
3. **Orphans**: id_map entries whose source record is gone from staging (source deletions) — list, don't touch.

## 16. HTTP API and UI

Server binds `127.0.0.1`, port from `PORT` env (default `4780`). No auth (local tool). JSON API:

| Method & path | Purpose |
|---|---|
| `GET /api/status` | active project, config summary (no secrets), source/staged/mapped counts per entity, worker state |
| `POST /api/runs` | body: `{type, entities, options}` (§9.1) → `{id}`; validates and queues |
| `GET /api/runs` | recent runs, newest first |
| `GET /api/runs/:id` | run row incl. live stats |
| `GET /api/runs/:id/events?after_id=&level=&limit=` | incremental event tail for polling |
| `POST /api/runs/:id/cancel` | request cooperative cancel |

UI (React + shadcn/ui app in `ui/`, served from its build output; poll every 2s):

- **Dashboard `/`** — project name + store domains; per-entity tiles: source total (from last extract), staged, mapped/migrated; recent runs table with status badges; "New run" button.
- **New run form** — run type; entity checkboxes (checking `orders` with include_dependencies on visually auto-checks its dependencies); mode radio with one-line explanations; limit, offset, langs; submit → redirects to the run page. Preset button: **"Test run (10 products)"**.
- **Run page `/runs/:id`** — status, per-entity progress (`processed/total`), live stats table, event log tail with level filter (default hides `debug`), cancel button, link to verify report when present.

The UI must state clearly on the run page: "This run executes on the server — you can close this page."

## 17. CLI

Every operation is also available headless via `node src/cli.js` (npm scripts) using the same runner — this is how the implementing agent smoke-tests without a browser:

```
node src/cli.js --project lush-qatar extract --entities products,categories --limit 10
node src/cli.js --project lush-qatar load    --entities products --mode create_missing --limit 10
node src/cli.js --project lush-qatar full    --entities all
node src/cli.js --project lush-qatar verify
node src/cli.js --project lush-qatar rebuild-map
node src/cli.js --project lush-qatar wipe    --entities products --confirm lush-qatar.myshopify.com
node src/cli.js --project lush-qatar mint-token          # OAuth code flow → offline token (port of get_admin_token.py)
```

CLI runs execute in the foreground, stream events to stdout, and exit non-zero on run failure. `wipe` deletes **only** resources listed in `id_map` (our own creations), requires `--confirm <store domain>` to match the config, and refuses when `production: true` or `allow_wipe: false`. Wipe exists for dev-store iteration (e.g. clearing a 10-product test), and also clears the corresponding `id_map` rows.

`wipe --scope all` (added 2026-07-19, LitExtension "clear current data" parity): deletes **every** resource of the selected types on the store regardless of origin (demo/manual data included) — same guards, and the ids/names of everything deleted are backed up to `var/backup-wipe-all-<entity>-<date>.json` first. Used to reset a dev store to a clean slate before a full migration.

## 18. Error handling and rate limits

- **WooCommerce**: sequential page fetches; on HTTP 429/5xx/network error retry ×3 with backoff 1s/2s/4s; then fail the run (extraction is all-or-nothing per entity).
- **Shopify GraphQL**: single in-flight mutation at a time. Read `extensions.cost` on every response and pre-emptively sleep when `currentlyAvailable` falls under the next query's likely cost; on `THROTTLED` retry with backoff up to 5×; on other `userErrors` mark the record failed (`error` event with the full userErrors payload) and continue; on network/5xx retry ×3 then mark failed.
- Never let one bad record kill a load run; never retry a mutation that returned `userErrors` unchanged.

## 19. Security & safety rules

- WooCommerce is read-only: the connector must contain no non-GET request path.
- Secrets only in `config/projects/*.env` (gitignored); never logged, never in `run_events.data`, never sent to the UI.
- Order loads must never trigger customer notifications; customer loads must never set marketing opt-in.
- No destructive Shopify operation outside `wipe` (guarded per §17).
- Server binds localhost only.

## 20. Acceptance criteria (v1 done)

1. `full` run with `entities=all`, no limit, completes on the Lush Qatar dev store: ~61 collections, ~538 products (minus explicitly-failed records, each visible in the log), ~1,950 customers, ~3,184 orders; verify stage passes counts and spot checks.
2. Products/collections show Arabic content when the storefront/admin locale is `ar`.
3. Every migrated resource carries the `dotaim_migration` metafields.
4. A repeat `create_missing` run reports ~100% skips and creates nothing.
5. Editing a product title in WooCommerce, then `full` + `sync_changed`, updates that one product and skips the rest.
6. A limit-10 offset-0 products run, then limit-10 offset-10, migrates records 1–20 by `en_id` order with no overlap.
7. The whole flow is drivable from the web UI with the browser closed mid-run, and equally from the CLI.
8. Standing up a hypothetical second project requires only a new `config/projects/<name>.json` + `.env` (no code edits) for a Woo/WPML source.
