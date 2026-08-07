# Resume prompt — launch phase

Paste everything below the line into a new Claude Code session started from `repo/`. Written to be picked up cold, without asking questions first.

Two things changed shape at the end of the 2026-08-07/08 session and the prompt reflects them: the **build is finished**, so the work is now launch mechanics and client chasing rather than features, and **two client-facing drafts are waiting on Bassam's review** rather than on any further writing.

---

Lush Qatar Shopify migration, launch phase. The store build is complete; what remains is QA, client decisions, and the launch itself.

Read `docs/theme-phase.md` "Resume here" first, including the traps listed there. Working model and guard rails are in the same doc. Use `shopify/themes/theme.sh`, never raw `shopify theme`.

## State

The storefront is built and verified live in English and Arabic on the published theme `Be Yours - Lush Qatar (by DotAim)` #152710447243, behind the store password (`lush2026`). Complete: theme and navigation, ingredients feature, product labels, blog, Branches and contact pages, 457 URL redirects, and Arabic throughout including the checkout.

Nothing on the remaining list is build work of any size. The critical path runs through the client's payment gateway.

## Waiting on Bassam

- Review of `docs/client-report-store-build-draft.md` (report to Dee) and `docs/handover-and-launch-plan.md`. **Neither has been sent.** If he approves the report, offer to create it as a Gmail draft. Never send.
- Stage 2 invoice, $675, Stripe sequence 0003 referencing LUSHQA-0001. The reasoning is in the handover plan.
- The visual QA pass against KSA, desktop and mobile, both locales. He said he would do this himself, last.

## Waiting on the client

Gateway, shipping rates, tax treatment, DNS window, Vegan product list, Lush HQ sign off on the ingredient library, notification email Arabic, Google Analytics property. The full table with owners and whether each blocks launch is in `docs/handover-and-launch-plan.md`.

## Open work if asked

- Extend the 14 July demo reference document with the Qatar-specific features, as training material.
- Free-shipping threshold: currently cleared. Set `QAR:<amount>` in theme settings once Dee gives the number, then `push-content`.
- Limited Edition labels: run `shopify/themes/labels/product-labels.py backfill --include-drafts` when those 11 seasonal products go live.
- Ingredient library: `shopify/themes/ingredients/` is built and proven on 3 ingredients, waiting on HQ approval for the remaining 450.
- Notification email Arabic, only if the client hands it back to us. 30 templates, zero Arabic today.

## Things that will bite

- **Translations are capped at 3,400 keys per resource.** The theme locale resource has 4,458. There is roughly 140 slots of headroom. Check with `shopify/themes/i18n/reclaim-translation-slots.py` before registering anything new. 449 translations were reclaimed from the account screens and backed up to `i18n/reclaimed-ar.json`.
- **`translationsRegister` is eventually consistent.** A dry run straight after an apply still lists the same keys as pending. They are written.
- **`lush.qa` is down** with a database error, so no further data sync from it is possible. Confirm the last sync date before cutover.
- The rest are in `theme-phase.md` under "Traps found this session".

## Standing rules

Confirm before any command that reads or writes either store, stating what it does, which store, and read or write. Translate anything untranslated you come across and say so. Log Saudi-site issues to `docs/ksa-improvements-backlog.md` rather than fixing them. Never delete without asking or backing up first. Client-facing output is drafted, never sent.
