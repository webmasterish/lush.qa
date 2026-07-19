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
```

Options: `--limit N`, `--offset N` (stable source-id ordering, chunks never overlap), `--mode create_missing|sync_changed|force_all`, `--include-dependencies false`, `--full` (extract).

## Notes

- Modes: `create_missing` (default, resumes anything), `sync_changed` (pushes source edits; orders are immutable), `force_all` (re-push everything).
- Runtime state lives in `var/` (SQLite staging + id map, JSONL logs) — gitignored, regenerable; `rebuild-map` recovers the id map from the store itself.
- Dev stores cap order creation at ~5/min → the full 3,190-order load is an overnight run (cap lifts on a paid plan).
- Source data oddities found during migration are logged in `docs/client-data-quality-notes.md` for the client QA review.
- `legacy/` (old Python demo scripts) is reference-only; do not run or extend.
