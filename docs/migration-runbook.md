# Migration runbook

Living checklist for the Lush Qatar WooCommerce → Shopify migration. Update statuses as work proceeds. Full background is in `lush-migration-project-context.md`; field-level detail is in `data-mapping.md`.

## Access status

- [x] IP geo-lock on lush.qa (was Qatar/UAE/UK) — removed
- [x] WooCommerce admin access — provided
- [ ] Server SSH (preferred) / FTP access — pending from Sibin (needed for steps that can't run from wp-admin)
- [ ] DNS management — coordinate with Nirmal / Al Mana IT at cutover

Store references:
- Source: WooCommerce (WordPress) at `lush.qa`
- Target dev store: `https://admin.shopify.com/store/lush-qatar` · `https://lush-qatar.myshopify.com/`
- Theme: Be Yours by RoarTheme (client buys the $350 license, tied to lush.qa domain)
- Design/functionality benchmark: Lush KSA `lush.sa.com` (client wants Qatar to mirror it)

## Phase 1 — Discovery & planning

- [ ] Confirm all access (esp. server SSH/FTP)
- [ ] Export and document current data structure
- [ ] Assess data volumes vs. scope (500 products / 5,000 customers / 5,000 orders); flag if the data-migration cost needs revising
- [ ] Document current DNS (registrar, Cloudflare zone, records)
- [ ] Finalize the migration checklist and URL/redirect map plan

## Phase 2 — Shopify store setup

- [ ] Shopify Grow plan active (MENA pricing ~$54/$72; client's card on file)
- [ ] Be Yours theme purchased & installed
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
