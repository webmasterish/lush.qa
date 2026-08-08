# Resume prompt — launch phase

Paste everything below the line into a new Claude Code session started from `repo/`. Written to be picked up cold, without asking questions first.

Two things changed shape at the end of the 2026-08-07/08 session and the prompt reflects them: the **build is finished**, so the work is now launch mechanics and client chasing rather than features, and the **store build report has gone to the client**, so the project is now waiting on them.

---

Lush Qatar Shopify migration, launch phase. The store build is complete; what remains is QA, client decisions, and the launch itself.

Read `docs/theme-phase.md` "Resume here" first, including the traps listed there. Working model and guard rails are in the same doc. Use `shopify/themes/theme.sh`, never raw `shopify theme`.

## State

The storefront is built and verified live in English and Arabic on the published theme `Be Yours - Lush Qatar (by DotAim)` #152710447243, behind the store password (`lush2026`). Complete: theme and navigation, ingredients feature, product labels, blog, Branches and contact pages, 457 URL redirects, and Arabic throughout including the checkout.

Nothing on the remaining list is build work of any size. The critical path runs through the client's payment gateway.

## Waiting on Bassam

- **Stage 2 invoice, $675.** Issue it in Stripe as LUSHQA-0003 referencing LUSHQA-0001, then send the email drafted at `docs/client-email-stage2-invoice-draft.md`, pasting in the card link and attaching the PDF. Reasoning in the handover plan.
- The visual QA pass against KSA, desktop and mobile, both locales. He said he would do this himself, last.
- Whether to ask Dee for the Vegan product list, which was cut from the report. The label is built and unused.

**The Gmail connector here has read scope only**, so drafts cannot be created for him. Client emails get written into `docs/` instead, and he pastes them. Worth re-authorising the connector with compose scope if that becomes annoying.

## Already sent

`docs/client-report-store-build-draft.md` went to Dee on 2026-08-08, with Bassam's edits recorded in its header. `docs/handover-and-launch-plan.md` is internal and stays internal.

## Waiting on the client

Gateway, shipping rates, tax treatment, DNS window, Vegan product list, notification email Arabic, Google Analytics property. (The ingredient library is deliberately not an ask: it is a post-launch paid offer.) The full table with owners and whether each blocks launch is in `docs/handover-and-launch-plan.md`.

## Open work if asked

- Extend the 14 July demo reference document with the Qatar-specific features, as training material.
- Free-shipping threshold: currently cleared. Set `QAR:<amount>` in theme settings once Dee gives the number, then `push-content`.
- Limited Edition labels: run `shopify/themes/labels/product-labels.py backfill --include-drafts` when those 11 seasonal products go live.
- Ingredient library: `shopify/themes/ingredients/` is built and proven on 3 ingredients. The other 450 are **not** pending client approval; populating the library is a paid piece of work to offer after launch, and the report deliberately says only that the feature is built and demonstrated.
- Notification email Arabic, only if the client hands it back to us. 30 templates, zero Arabic today.

## Things that will bite

- **Translations are capped at 3,400 keys per resource.** The theme locale resource has 4,458. There is roughly 140 slots of headroom. Check with `shopify/themes/i18n/reclaim-translation-slots.py` before registering anything new. 449 translations were reclaimed from the account screens and backed up to `i18n/reclaimed-ar.json`.
- **`translationsRegister` is eventually consistent.** A dry run straight after an apply still lists the same keys as pending. They are written.
- **`lush.qa` is down** with a database error, so no further data sync from it is possible. Confirm the last sync date before cutover.
- The rest are in `theme-phase.md` under "Traps found this session".

## Standing rules

Confirm before any command that reads or writes either store, stating what it does, which store, and read or write. Translate anything untranslated you come across and say so. Log Saudi-site issues to `docs/ksa-improvements-backlog.md` rather than fixing them. Never delete without asking or backing up first. Client-facing output is drafted, never sent.
