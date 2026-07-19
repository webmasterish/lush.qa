# Resume prompt — M8 wrap-up (final verify + client report)

Paste everything below the line into a new Claude Code session (started from `repo/`) to finish milestone M8. It is written to be executed by a less capable model without asking questions.

---

Continue the Lush Qatar migration at milestone M8 wrap-up. Work step by step and do not skip the reading in step 0.

## 0. Read first (in this order)

1. `docs/migration-tool-prd.md` — especially §20 (acceptance criteria).
2. `docs/migration-tool-plan.md` — the M8 section (tasks 1–5 and the note that Bassam drives the runs).
3. `docs/client-data-quality-notes.md` — all 11 findings; the client report is built from these.
4. `shopify/migration_from_woocommerce/migration-tool/README.md` — commands.

## 1. Hard rules

- NEVER write to WooCommerce. All source access is read-only GET.
- NEVER delete files or data without asking Bassam or writing a backup copy to `migration-tool/var/` first.
- Run all CLI commands from `shopify/migration_from_woocommerce/migration-tool/` (they fail from the repo root — `cd` there first, and re-`cd` after any `git` command that changed directory).
- Do NOT start, cancel, or modify migration runs — Bassam runs those from the web UI. You may run only read-only commands (`report`, plain `node src/cli.js --project lush-qatar`) at any time, and `verify` ONLY when no run is active.
- Commit at each completed step with message prefix `migration-tool:` or `docs:`, ending with the Co-Authored-By/Claude-Session trailer used in recent commits (`git log -3` to see the format). Push with `git push origin main`.
- Client-facing text (the Dee report): warm professional tone, **no em-dashes**, no internal jargon (never mention "id_map", "staging", "CLI", "metafields" — say "migration records/markers" if needed).

## 2. Check state

```bash
cd shopify/migration_from_woocommerce/migration-tool
node -e "import('better-sqlite3').then(m=>{const d=new m.default('var/migration-tool.sqlite');d.pragma('busy_timeout=5000');console.log(d.prepare(\"SELECT id,type,status,stats FROM runs ORDER BY id DESC LIMIT 5\").all())})"
```

- If an orders run (`type: full` or `load` with orders) is `running`: do only read-only work, report progress to Bassam (orders `processed`/`total` from stats), and stop. The dev store allows ~5 orders/minute; the full order load takes ~11h of running time across Bassam's cancel/resume sessions.
- If the latest orders run is `cancelled`: tell Bassam to resume it from the UI (full · orders · Create missing · no limit) and stop.
- If orders are complete (`success`, orders `processed` == `total`): continue.

## 3. When orders are complete — final verification

1. Confirm no run is active, then:
   `node src/cli.js --project lush-qatar verify --entities all`
   Expected: staged ≈ mapped ≈ live for every entity (small gaps are explained below). Verify auto-deep-checks lagging Shopify counts by paging ids — trust its output, not the raw count.
2. `node src/cli.js --project lush-qatar report --out var/report-final.md` (read-only, safe).
3. Expected final numbers and the known explanations (as of 2026-07-19):
   - categories: 61 migrated of 61.
   - products: 537 of 538 — #9026 "No Way to Say Goodbye" fails until its variations are fixed in WooCommerce (finding #10). This 1 failure is expected, not a defect.
   - customers: 1,915 of 1,954 staged — 39 junk registrations with invalid emails are skipped by design (finding #9).
   - orders: staged count (~3,190+, grows as the store sells) minus ~1 empty order skipped by design. Many order lines are text-only line items (products deleted from the source years ago) — expected, totals still exact.
   - The store's own counts can lag briefly after bulk loads; verify's deep check handles this.

## 4. PRD §20 acceptance sweep

Go through the 8 criteria in `migration-tool-prd.md` §20 one by one. For each, record pass/fail + one line of evidence in `migration-tool/README.md` under a new section `## Lush Qatar rehearsal results` (also include: final counts per entity, total durations from the report's Runs table, failures with reasons). Check off the migrated entities in `docs/migration-runbook.md` Phase 3 (products, categories, customers, orders — leave pages/blog/redirects unchecked). Commit.

## 5. Draft the client report for Dee

Write `docs/client-report-dee-draft.md` (a DRAFT for Bassam to review — do not send anything anywhere). Structure:

1. **Summary** — migration of catalog, customers, and full order history to the new store is complete; verified record by record against the current site.
2. **What was migrated** — friendly table: collections 61, products 537 (with Arabic content for ~429; note ~217 products have no Arabic translation on the current site, list available on request), customers 1,915, orders ~3,190 with exact totals and original order numbers. Mention both languages and that everything is already published to the Online Store.
3. **How it was verified** — counts reconciled between the current site and the new store per data type, plus record-level spot checks (titles, prices, totals, statuses) and a permanent migration marker on every record for full traceability.
4. **Findings from your data** — from `client-data-quality-notes.md`, client-facing wording. Give the junk-registrations finding (#9) real detail per Bassam: 39 fake accounts created by automated attack traffic (the kind of probing that likely led to the old site's country restriction), not migrated, recommend deleting them in WooCommerce, and note the new store runs on Shopify's managed platform security. Then: product "No Way to Say Goodbye" needs a small fix in WooCommerce (offer to do it with their OK — finding #10), untranslated Arabic content summary (#2/#5), and the informational items briefly.
5. **Keeping data in sync until launch** — the new store is refreshed from the current site on demand: catalog and customer changes sync over, new orders are added automatically, nothing is duplicated, and a final synchronization runs right before the switch so nothing is lost.
6. **Next steps** — Dee's admin access (already invited), company card in Settings > Billing, theme purchase, Grow plan activation when ready, then design phase mirroring the Saudi store.

Commit the draft. Tell Bassam it is ready for his review and where it is. Do NOT email it, upload it, or share it anywhere.

## 6. Update memory

Update the `migration-tool-progress` memory file: M8 status, final counts, that the client report draft awaits Bassam's review, and anything newly learned. Keep `MEMORY.md` index lines in sync.

## Context that answers likely questions

- Orders show sales channel "DotAim - Lush Qatar Store Ops" because API-created orders are attributed to the creating app. This is intentional and useful: it permanently distinguishes imported historical orders from real storefront orders after launch.
- Metafield definitions are named with a "DotAim · " prefix to group them and distinguish from future theme/app fields.
- The `full` run re-runs dependencies; #9026 failing once per products pass and 39 customer skips per customers pass are expected noise in every run's stats.
- Woo source is slow (~15–25s per API page); extraction of products/orders is incremental after the first pull; categories/customers always re-fetch fully.
- If Bassam asks for the redirects module, pages, or blog: those are planned post-M8 modules (PRD §3); the data they need (handles + `source_ar_slug` metafields) is already captured.
