# Lush Qatar — Shopify demo plan

Working document for the demo/training walkthrough. Two purposes:
1. **Internal reference** for Bassam to run the session smoothly.
2. A **client-facing reference document** to share with attendees at the start of the meeting, conveying a professional, structured process. Time is reserved at the end for questions.

Status: draft — details to be filled in together before the session. The demo is currently targeted for **July 14** (per project calendar).

## Audience

Brand + IT + one representative per store (from the July 14 invite: Dee, Ann, Nirmal (IT), and store reps — DFC, Landmark, Villaggio, MOQ, Vendome). Non-technical audience: keep language plain, avoid developer jargon.

## Goals of the session

- Show the new Shopify admin/dashboard and how the team will run the store day to day (frontend is already proven via the live KSA/Lebanon sites).
- Build confidence and de-risk the migration.
- Cover the practical setup items the client must action (below).

## Demo data (disposable seed — deleted before the full migration)

- **Products:** the store's actual **top sellers by all-history units** (MTD is too sparse — 16 orders, everything tied at 2 units, so not representative). e.g. Scrubee, Oval Tin, Super Milk, Sticky Dates, Let The Good Times Roll, Ro's Argan, Big Shampoo, Rose Jam — ~15–20 spanning the top real categories (Bath and Shower, Body, Hair, Bath Bombs, Fragrances, Shower Moisturisers), with images.
- **Collections:** a few top categories / merchandising collections (Bath and Shower, Best Sellers, Trending Now, New Products).
- **Customers/orders:** a couple of the **most recent real orders + their customers** (client's own data, their own staff viewing — not a privacy issue; kept small and disposable). Recent = easier to compare against source.
- **How loaded:** pulled from Woo via read-only REST, pushed to the dev store via the Admin API (`shopify store execute`). Raw pull saved to `shopify/migration_from_woocommerce/__/wp/data/` (gitignored) as the first read-only data snapshot / backup layer.
- **Payments:** Shopify **Bogus Gateway** enabled for any live checkout (test card `1` = success); API-created orders need no gateway.

### Seed build status (2026-07-13)

Loaded into the dev store via `scripts/pull_demo_source.py` (read-only Woo pull → `__/wp/data/`) + `scripts/push_demo_seed.py` (Admin API):
- ✅ 14 top-seller products (ACTIVE, variants + gallery images imported)
- ✅ 6 collections populated (Bath and Shower 9, 5 Star Reviews 8, Best Sellers 7, Hair 2, Bath Bombs 2, Body 2)
- ✅ 3 customers
- ✅ 3 orders (paid) — real seeded customers buying real seeded products (variant-linked, customer-associated), via the offline Admin API token from `scripts/get_admin_token.py`. Note: the live recent Woo orders are guest checkouts with empty billing and off-catalog items, so orders were composed from the seeded catalog + customers rather than copied 1:1.

All seed objects are tagged `demo-seed`; `push_demo_seed.py wipe` (or filtering by tag) removes them before the real migration.

## Client action items to cover during the demo

- **Staff/user access during development** — decide who gets access to the dev store and with which roles. In particular, get **Dee** added with sufficient permissions, because **she needs to add the store's credit card details to purchase the Be Yours theme** and activate the plan/apps. (Open question: dev-store limitations around billing/staff — confirm the mechanics; may require selecting a plan / store transfer first.)
- Theme purchase (Be Yours, $350) and Shopify plan selection (Grow, MENA pricing) — billed directly to the client via Shopify.
- **Backups** — ask Sibin/IT to take, or confirm the host already runs, a full-site backup (files + DB) with a known restore point before cutover. No backup plugins (the WP site is already plugin-heavy).
- What the team needs to provide next.

## Proposed agenda (to refine)

1. Welcome + what this session covers (share this document).
2. Where we are: access granted, data assessed (538 products, 3,184 orders, 1,950 customers), dev store connected.
3. Admin walkthrough: products, collections, an order, customers, reports, navigation.
4. How the storefront will look (reference KSA) and the theme.
5. Practical setup: plan, theme purchase, staff access (Dee + billing), timeline.
6. Q&A.

## Open questions / to decide

- Demo customers/orders: resolved — a couple of recent real ones.
- Dev-store billing/staff mechanics for Dee to purchase the theme.
- Final date/time confirmation and who presents which part.
- Anything else the team specifically wants to see.

## Notes to expand later

Bassam considers this document important as a signal of professionalism. Build it out into a polished, shareable reference (clear sections, timings, and a clean summary) closer to the session.
