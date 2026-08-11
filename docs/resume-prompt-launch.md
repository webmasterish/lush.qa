# Resume prompt — launch phase

Paste everything below the line into a new Claude Code session started from `repo/`. Written to be picked up cold, without asking questions first.

Rewritten 2026-08-12. The build finished on 08-08; since then the client reviewed the store, a call was held, and a round of changes went in. The project is now waiting on the client for two things and nothing else.

---

Lush Qatar Shopify migration, launch phase. The store is built and the client has reviewed it. What remains is their payment gateway, their DNS, and launch.

Read `docs/theme-phase.md` "Client call 2026-08-11" and then "Resume here" first, including the traps in both. Working model and guard rails are in the same doc. Use `shopify/themes/theme.sh`, never raw `shopify theme`.

## State

Storefront live and verified in English and Arabic on the published theme `Be Yours - Lush Qatar (by DotAim)` #152710447243, behind the store password (`lush2026`). Complete: theme, navigation, ingredients feature, product labels, blog, Branches, 457 redirects, Arabic throughout including checkout.

Added after the client call, all live and verified in both locales:

- **Homepage** reworked by Bassam to follow KSA as closely as Qatar's catalogue allows. Nine sections kept hidden rather than deleted, as alternatives to show the client.
- **WhatsApp button** — `sections/dotaim-whatsapp-button.liquid`, in the `custom.overlay` group, number `97466572759`.
- **Category label** under the product title, wired into **all nine** sections that render `card-product`, with **531 products** carrying `custom.category_label` in both languages (`shopify/themes/category-labels/`). Category label on and vendor off store-wide.
- **Branches** — five stores with photos, phone numbers and directions.

## Waiting on the client, and nothing else blocks

1. **Qatar payment gateway.** The only real blocker. Client finance plus their provider. Nothing on our side shortens it.
2. **DNS.** Lush UK holds it. Agreed approach: **we create a Cloudflare account in the client's name and Lush HQ points the nameservers at it**, exactly as done for KSA and Lebanon. The ask to Lush HQ is one nameserver change. Mail records (SPF, DKIM, DMARC) live in the same zone and must move with it.

Also outstanding, none blocking: **opening hours for the five branches** (Ann), the shipping figure confirmed with management (Ann; QAR 20 for all Qatar is set for now, free above QAR 250), and tax confirmed in writing by Finance.

The email covering all of this was **sent 2026-08-12** as a reply on the existing thread, cc Jeffrey Flores (finance) and Sibin. Text and reasoning: `docs/client-email-blockers-draft.md`. Do not chase the gateway again; it has now been raised three times.

## Waiting on Bassam

- **Stage 2 invoice, $675.** Issue in Stripe as LUSHQA-0003 referencing LUSHQA-0001, then send `docs/client-email-stage2-invoice-draft.md`. Reasoning in the handover plan.
- The visual QA pass against KSA, desktop and mobile, both locales. He does this himself, last.
- **The ingredient-library quote.** Offered verbally on the call with no price. Effort estimate: 15 to 20 minutes per product across the 127 products carrying an ingredient list, so roughly 32 to 42 hours.

## Dropped or parked, deliberately

- **Google Analytics** — dropped; the client will use Shopify's own reports.
- **Limited Edition collection** — parked; the client will say if they want it. Never a category, only a WooCommerce tag, and its 11 products are seasonal drafts.
- **Ingredient library content** — a paid offer, not a pending task.
- **Vegan labels** — built, unused, client never asked.

## Things that will bite

- **`pull-content` before any `push-content`.** The client's team and Bassam both edit in the theme editor, and a push without a pull silently overwrites them. `theme.sh` guards this and will refuse; do not reach for `--force`.
- **Theme files are CRLF.** Editing them with a script that reads with universal newlines and writes back rewrites the whole file. Use the editor tools, or read and write with `newline=''`.
- **A `product` or `collection` *setting* stores a bare handle**, not a `shopify://` URL. Get it wrong and the block renders text with no image and no error.
- **Be Yours ships lorem in some block defaults.** Set them explicitly or they publish.
- **Translations are capped at 3,400 keys per resource**; the theme locale resource has 4,458. Check `i18n/reclaim-translation-slots.py` before registering anything new.
- **`translationsRegister` is eventually consistent.** A dry run straight after an apply still lists the same keys as pending. They are written.
- **`lush.qa` is down** with a database error, so no further data sync is possible. Confirm the last sync date before cutover.
- The rest are in `theme-phase.md` under "Traps found this session".

## Standing rules

Confirm before any command that reads or writes either store, stating what it does, which store, and read or write. Translate anything untranslated you come across and say so. Log Saudi-site issues to `docs/ksa-improvements-backlog.md` rather than fixing them. Never delete without asking or backing up first. Client-facing output is drafted, never sent.
