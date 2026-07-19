# Migration runbook

Living checklist for the Lush Qatar WooCommerce → Shopify migration. Update statuses as work proceeds. Full background is in `lush-migration-project-context.md`; field-level detail is in `data-mapping.md`.

## Access status

- [x] IP geo-lock on lush.qa (was Qatar/UAE/UK) — removed
- [x] WooCommerce admin access — provided
- [x] WooCommerce REST API (read-only) — key "DotAim read access for migration" created & verified 2026-07-12 (read-only; we do not write to the WP site)
- [ ] Server SSH (preferred) / FTP access — pending from Sibin (needed for steps that can't run from wp-admin)
- [ ] DNS management — coordinate with Nirmal / Al Mana IT at cutover
- [x] Shopify dev store — CLI authenticated 2026-07-12 (see Environment & tooling below)

Store references:
- Source: WooCommerce (WordPress) at `lush.qa`
- Target dev store: `https://admin.shopify.com/store/lush-qatar` · `https://lush-qatar.myshopify.com/`
- Theme: Be Yours by RoarTheme (client buys the $350 license, tied to lush.qa domain)
- Design/functionality benchmark: Lush KSA `lush.sa.com` (client wants Qatar to mirror it)

## Environment & tooling (set up 2026-07-12)

Working setup lives in the git repo `repo/` (private GitHub `webmasterish/lush.qa`); run Claude Code from `repo/`. Private material (journal, invoices, meetings, proposals, screenshots) stays in the parent dir, outside the repo.

- **Skills:** `shopify-onboarding-merchant` and `shopify-use-shopify-cli` vendored into `.claude/skills/` with Shopify telemetry stripped (see `.claude/skills/README.md`). Add `shopify-liquid` at the theme phase; `shopify-admin` only if we need offline Admin GraphQL schema search/validation.
- **Shopify CLI:** `@shopify/cli` v4.4.0 installed globally via nvm (no sudo). Store interaction is via `shopify store execute` / `shopify store graphiql`.
- **Dev store connection:** authenticated 2026-07-12 as `shopify.partner@dotaim.com` against `lush-qatar.myshopify.com` via `shopify store auth`. Scopes granted: read/write for products, customers, orders, content, themes. The online access token is stored in the CLI's own config, not the repo. Verified: shop "Lush Qatar", currency QAR, Development plan.
  - Re-run `shopify store auth` to add scopes later (e.g. URL redirects, discounts). Orders older than 60 days need the protected `read_all_orders` scope (requires app approval).
  - **Online vs offline token:** `shopify store auth` issues an **online** token, which is fine for products/collections/customers but **`orderCreate` (and bulk order import) require an offline token**. Legacy "Develop apps" custom apps were deprecated 2026-01-01; the current path is a **Dev Dashboard app**. **Done:** app **"DotAim - Lush Qatar Store Ops"** created (single-store, "exclusive to your store"); offline token minted via OAuth code flow with `scripts/get_admin_token.py` and stored as `SHOPIFY_ADMIN_API_TOKEN` in `.env`. The token is a `shpca_…` app token; `push_demo_seed.py` and future migration scripts call the Admin GraphQL endpoint with it. Note: `read_all_orders` is a protected scope (needs Shopify approval) for migrating orders older than 60 days.
- **Timezone:** set to (GMT+3) Riyadh on 2026-07-12 in Settings → General (the list has no Qatar entry; Riyadh is the GMT+3 equivalent, no DST). Not API-settable.
- **Reference store (KSA):** `lushsa.myshopify.com` — DotAim has access. Connect **read-only** (`read_products,read_themes,read_content,read_publications`) when mirroring settings/theme; deferred to the store-setup/theme phase.
- **Source (WooCommerce):** read-only REST API key in `shopify/migration_from_woocommerce/.env`; verified reachable 2026-07-12. We do not write to the WP site.
- **Demo / getting-started session:** delivered **2026-07-14** (ran ~2h vs. the scheduled 1h; a lot to cover, went well). Walkthrough of the Shopify admin against the seeded dev store (see `demo-plan.md` for the seed). The client-facing handout used was a slide deck, "Lush Qatar - Shopify Admin - Getting Started" (shared with attendees via Google Drive at the start; local copy in the private `../meetings/2026-07-14/`). Not committed — it is a one-off deliverable, kept in the private meetings dir + Drive.

## Phase 1 — Discovery & planning

- [ ] Confirm all access (esp. server SSH/FTP)
- [ ] Export and document current data structure
- [x] Assess data volumes vs. scope — done 2026-07-12 via WooCommerce REST API. See **Source data assessment** below.
- [ ] Document current DNS (registrar, Cloudflare zone, records)
- [ ] Arrange full-site backup (files + DB) with a restore point via Sibin/IT before cutover — **no backup plugins** (WP site is already plugin-heavy)
- [ ] Save read-only content snapshot (REST exports + media) to `shopify/migration_from_woocommerce/__/wp/data/` (gitignored) — doubles as a data backup layer
- [ ] Finalize the migration checklist and URL/redirect map plan

### Source data assessment (2026-07-12, via WooCommerce REST API)

| Entity | Count | Notes |
|---|---|---|
| Products | 538 | 407 simple + 131 variable (variations expand into Shopify variants); **over the 500 baseline** |
| Product categories | 61 | → Shopify collections |
| Product tags | 584 | |
| Orders | 3,184 | under the 5,000 baseline; orders older than 60 days need the protected `read_all_orders` scope to export |
| Customers (with accounts) | 1,950 | under 5,000; guest-order customers are additional (not in this count) |
| Coupons | 0 | |
| Blog posts | 3 | WP `wp/v2/posts` |
| Pages | 16 | WP `wp/v2/pages` |

Scope note: products (538) slightly exceed the 500 baseline in the preliminary $500 data-migration line. Otherwise within scope. Flag the marginal overage to the client when confirming the final data-migration figure.

## Phase 2 — Shopify store setup

- [ ] Shopify Grow plan active (MENA pricing ~$54/$72; client's card on file)
- [ ] Be Yours theme purchased & installed
- [x] Store timezone set to (GMT+3) Riyadh — 2026-07-12, Settings → General (Qatar not in the list; Riyadh is the GMT+3 equivalent)
- [ ] Base store config: markets, currency (QAR), languages (AR/EN), local Qatar payment gateway (Shopify Payments is NOT available in Qatar), shipping, taxes

## Phase 3 — Data migration

Per `data-mapping.md`, in dependency order:
- [ ] Products (+ variants, images, SEO)
- [ ] Categories → collections
- [ ] Customers
- [ ] Orders (+ line items)
- [ ] CMS pages
- [ ] Blog
- [ ] URL redirects (301s for all changed paths)

## Phase 4 — Features & functionality

Detailed feature list is in `lush-migration-project-context.md` (§8). Highlights:
- [ ] Navigation: mega menu, smart search, advanced filtering, mobile nav
- [ ] Homepage/campaigns: hero banners (image/video), landing pages, featured collections, countdown timers
- [ ] Product display: custom badges (vegan/bestseller/new/limited), back-in-stock, zoom galleries, related products
- [ ] Cart & checkout: slide-out cart with upsells, cards, COD, Apple/Google Pay, local gateway, gift cards
- [ ] WhatsApp integration: order confirmations, shipping updates, optional abandoned-cart (deferrable)
- [ ] Email automation: welcome, abandoned cart, post-purchase, back-in-stock, order/shipping, branded templates
- [ ] Blog & content, Google Analytics
- [ ] Bilingual AR/EN throughout

## Phase 5 — Testing & QA

- [ ] Internal (DotAim) verification of each migrated entity against source counts and spot-checks
- [ ] Redirect verification (sample of old URLs resolve/301 correctly)
- [ ] Client verification pass (they confirm data + features)
- [ ] Checkout / payment / order flow end-to-end test

## Phase 6 — Training & launch

- [ ] 2-hour training session (recorded)
- [ ] Pre-cutover DNS plan confirmed with IT
- [ ] DNS cutover via Cloudflare (zero-downtime)
- [ ] 72-hour post-launch monitoring
- [ ] Stage 3 invoice on launch

## Payment milestones

- [x] Stage 1 — 50% deposit ($1,350) — PAID
- [ ] Stage 2 — 25% ($675) — on data migration & store setup
- [ ] Stage 3 — 25% ($675) — on launch
