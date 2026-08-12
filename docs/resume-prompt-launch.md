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
2. **DNS.** Approach: **DotAim creates a Cloudflare account in the client's name (`almanadev@gmail.com`, handed over with its mailbox) and the registrar points the nameservers at it**, as done for KSA and Lebanon.

   Verified from public DNS on 2026-08-12, so do not re-derive: **lush.qa is already on Cloudflare** (`terin.ns.cloudflare.com` / `tia.ns.cloudflare.com`), registrar **ROUTEDGE**, DNSSEC **off** (no DS or DNSKEY), **no apex SPF and no `_dmarc`**, and MX is `10 mail.lush.qa` which **resolves to nothing**, so the domain receives no mail today. Staff email is on `almana.com` (Rackspace) and is untouched by any of this. An earlier client email warned that SPF/DKIM/DMARC would break; that overstated it, and the Cloudflare draft deliberately does not repeat it.

   **Who holds the existing Cloudflare account is unknown.** The only basis for "Lush UK" is Ann's line "Lush UK Controls DNS", which names DNS rather than a Cloudflare account. Could equally be ROUTEDGE or whoever built the WooCommerce site. Ask, do not assume.

   **State as of 2026-08-12: the new account exists and lush.qa is already added to it, Pending.** Cloudflare assigned **`arely.ns.cloudflare.com`** and **`fonzie.ns.cloudflare.com`**. No zone hold blocked the add, so that worry is closed. **The imported records are wrong and must not go live as they are**: Cloudflare's scan pulled in 10 A and 6 AAAA records all pointing at Cloudflare's own proxy IPs (`104.21.58.148`, `172.67.204.127`, `2606:4700:…`) across `lush.qa`, `www`, `ftp`, `ipv4` and `server`. Switch the nameservers with those in place and the site returns **Error 1000**. The apex and `www` get replaced by Shopify's records anyway; `ftp`, `ipv4` and `server` need either the export or a decision that they can be dropped. Details sent to Sibin 2026-08-12, draft at `docs/client-email-cloudflare-sibin-draft.md`.

   **The move procedure, per Cloudflare's own move-domain guide:** add the domain to the *new* account first (it sits Pending and changes nothing), update nameservers at the registrar, then Overview > Re-check now. The old account then shows it as "Moved Away" and clears automatically after fourteen days. **Nobody deletes anything by hand** — an earlier draft claimed the zone had to be released first and that was wrong. Still required: get the **DNS record export** from the current account before the nameservers change (Cloudflare's scan imports the proxied records and causes a 1000 error), confirm **no zone hold** (only the holder can lift one, and it is the one true blocker), confirm no paid add-ons, and note that **SSL certificates do not transfer** and are reissued in the new account.

**Shipping and tax are settled** (2026-08-12): free delivery on orders **QAR 300 and up**, **QAR 20** below that, one rate for all of Qatar, 1 to 2 business days, approved by Ann. Tax confirmed as not applicable and switched off. Policies corrected to match, in both languages.

**Cash on delivery is the live question.** Bassam proposed it as a way to launch without waiting for the gateway; Kyaw confirmed they already do cash and card on delivery. **Ann asked to confirm internally and has not replied**, so it stays off the group email until she does. If it is approved it removes the only hard blocker and DNS becomes the last one.

Also outstanding, none blocking: **opening hours for the five branches** (Ann), and tax confirmed in writing by Finance.

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
