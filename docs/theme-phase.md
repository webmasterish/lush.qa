# Theme phase — working model & plan

How we build the Lush Qatar storefront to mirror Lush KSA. Covers the three surfaces changes land on (theme code, theme editor, store settings), how each stays in sync with the repo, and the milestone order. Background: `lush-migration-project-context.md`; live checklist: `migration-runbook.md`; admin config tracking: `store-settings-ledger.md`.

## Where things stand (2026-08-03)

- Store is **client-owned** since the 2026-07-28 transfer, on a paid **Shopify (Grow)** plan — no longer a development store. Currency QAR, timezone Asia/Riyadh, locales `en` (primary) + `ar`, both published.
- **Be Yours purchased 2026-07-29.** A trial copy was installed 2026-07-13 for the demo. The full library is inventoried below.
- **Data migration is done for core entities** (collections, products, customers, orders). Still open from Phase 3 and now landing inside this phase: **CMS pages, blog, URL redirects**.
- **"Mirror the Saudi store" means the same style, not the same content** (clarified with Bassam 2026-08-04). Structure, colours and treatment follow KSA; catalogue, navigation and copy are Qatar's own, sourced from the existing WooCommerce site.
- **Assets stay selectable.** Logos, campaign and seasonal imagery live in Settings > Brand and Content > Files, chosen through theme-editor pickers — never bundled into the theme, because the client swaps them for Valentine's, Halloween and the like without touching code. The one exception is the brand font, which no editor UI can select.
- **Reference benchmark:** `lush.sa.com` runs **Be Yours 8.4.0** ("Updated copy of Be Yours"). Its storefront loads no third-party app extensions beyond Shopify's web-pixels-manager, and every asset filename is stock Be Yours. **KSA's customization is overwhelmingly theme settings and section configuration, not a code fork.** RTL is live on `/ar` (`<html lang="ar" dir="rtl">`).
- **Qatar is on Be Yours 9.2 — a major version ahead of KSA's 8.4.** This is the single most important constraint on the parity method below: settings and templates cannot be copied across that gap, they have to be transcribed against a schema comparison.

### Theme inventory (probed 2026-08-03)

| Store | Theme | ID | Version | State |
|---|---|---|---|---|
| Qatar | `Lush Qatar - Be Yours Theme` | 152566169739 | **9.2.0** | **live**, customized (64 settings) |
| Qatar | `Be Yours` | 152138383499 | **9.1.0** | unpublished, **verified untouched** (preset `Be Yours`) |
| Qatar | `Horizon` | 151660658827 | — | Shopify default, irrelevant |
| KSA | `Updated copy of Be Yours` | 184102060346 | **8.4.0** | **live — the parity target**, customized (88) |
| KSA | `Updated copy of Updated copy of Be Yours` | 184533385530 | 8.5.0 | unpublished update, never published (83) |
| KSA | `Be Yours` | 182010315066 | 8.3.3 | pre-update original, customized (84) |
| KSA | `Dawn` | 181461451066 | — | Shopify default, irrelevant |

Two consequences:

- **No pristine 8.x exists on KSA** — all three copies are customized, so a zero-noise 8.4-vs-8.4 diff is not obtainable from the store. Only an archived local copy from the original project could provide one.
- **Qatar's untouched 9.1.0 is a real vanilla baseline**, one *minor* version off the live 9.2.0. That is small, bounded noise, and it costs no writes to obtain.

Method note that softens the missing 8.4 vanilla: Shopify's theme-update flow **replaces theme code with the new version's stock code** while migrating settings across. KSA's live 8.4.0 was produced by that flow, so its code is largely stock 8.4 and its customization is concentrated in settings and templates — consistent with the storefront evidence (stock asset filenames, no `custom.css`, no app extensions). Any *file that exists on KSA-live but not in a vanilla copy* is an unambiguous customization regardless of version, which gives a reliable inventory without a matching-version baseline.
- KSA carries a custom `SAR` riyal-symbol font. That is KSA-only and must not be carried into Qatar.

## The three surfaces

Every change in this phase lands on exactly one of these. Knowing which one decides how it gets versioned.

| | Surface | What lives there | Source of truth | Sync |
|---|---|---|---|---|
| **A** | **Theme code** | `*.liquid`, `assets/*.css|js`, `config/settings_schema.json`, `locales/*.json` | **The repo** | `theme push` (code only) / `theme pull` to recover admin code-editor edits |
| **B** | **Theme content** | `config/settings_data.json`, `templates/*.json`, `templates/customers/*.json`, `sections/*.json` (section groups) | **The store** — the theme editor writes these | `theme pull` content into the repo as a versioned snapshot |
| **C** | **Store settings** | Markets, languages, payments, shipping, taxes, checkout, legal policies, navigation menus, metafield definitions, files, notifications, domains, apps, GA | **The store** — no file representation at all | Recorded by hand in `store-settings-ledger.md` |

The failure mode this guards against: a `theme push` of code silently overwriting a section the client rearranged in the editor, or an editor session overwriting code we wrote locally. Surface B is never pushed from the repo except in the deliberate porting steps of T2/T3.

**Watch out for `locales/*.json`.** They are surface A (we own them in git), but the theme editor's *"Edit default theme content"* writes to them too. Rule: we edit locales in the repo; nobody uses that editor screen. If it happens anyway, `pull-code` recovers it.

## Themes on the store

| Theme | Role | Purpose |
|---|---|---|
| `Be Yours - Lush Qatar (by DotAim)` (#152710447243) | **live** | Be Yours 9.2.0. The one theme we work on. All pushes and all theme-editor work happen here. |
| `Be Yours` 9.1.0 (#152138383499) | unpublished | Untouched vanilla reference. Never edited, never pushed to. Our diff baseline. |
| `development-*` | development | Ephemeral, created by `theme dev`. Local hot-reload only. |

**Pre-launch there is deliberately no separate build theme.** The storefront is password-protected, so a published theme shields nobody from unfinished work, and a library full of similarly named themes is harder for a non-technical brand team to read than one obvious theme. Rollback comes from the git baseline and the pre-push snapshots instead — see Reversibility. Strict published-theme protection returns at launch, when the stakes change.

Cleared out on 2026-08-04: `Horizon` (Shopify's unused default) and `Lush Qatar - Be Yours Theme` (the previous live theme, whose content survives in the git baseline commit and in `__reference/qatar-9.2.0-live/`).

## Auth

Shopify CLI auth is via the **Theme Access app** — a `shptka_…` password per store, scoped to themes only, independent of who owns the store. This survives the client ownership transfer that already killed our previous CLI session, and it lets the KSA store be wired as a **pull-only** environment.

Passwords go in `shopify/themes/.env` (gitignored), never in `shopify.theme.toml`. The wrapper script picks the right one per environment. **Installed on both stores and in place as of 2026-08-03**, generated against `dev@dotaim.com`.

The migration app's offline token is unaffected and stays as-is — it lacks `read_themes` and does not need it.

### Which account for logged-in CLI work

Theme work no longer needs a CLI login at all — Theme Access covers it. What still needs one is `shopify store execute` / `graphiql` and anything else hitting the Admin API interactively.

Use **`shopify.partner@dotaim.com` (collaborator)**, not `dev@dotaim.com`:

- A collaborator account consumes no staff seat, carries only the permissions the client grants it, and the client can revoke it cleanly at handover. That matches the independence-from-lock-in promise this project is sold on.
- `dev@dotaim.com` is a **full administrator** on a store the client now owns, and it is the account tied to the transfer and the recovery codes. Keeping it as a deliberate break-glass account — rather than the identity behind routine tooling — means the admin activity log stays readable and one compromised dev credential is not unrestricted access to the client's live store.
- If a collaborator permission turns out to be missing for a specific task, request that scoped permission rather than switching to the admin account.

The Theme Access passwords being registered to `dev@dotaim.com` is fine and unrelated: the password is a theme-scoped credential, not a login, and store-side actions are attributed to the Theme Access app.

## Repo layout

```
shopify/themes/
├── theme.sh                  workflow wrapper (enforces the surface rules)
├── .env                      Theme Access passwords (gitignored)
├── be-yours/                 the Qatar theme — git-tracked
│   ├── shopify.theme.toml    environments: build, live, vanilla
│   └── .shopifyignore
└── __reference/              gitignored, local only
    ├── ksa-8.4-live/         KSA live theme (read-only pull)
    ├── ksa-8.4-vanilla/      untouched Be Yours 8.4, if the KSA library has one
    ├── qatar-9.2-vanilla/    untouched Be Yours 9.2 as purchased
    └── snapshots/            pre-push snapshots of the remote theme, timestamped
```

`__reference/` is gitignored by the repo's existing `__*` rule. It holds a third-party paid theme and another store's build; it stays local, out of the Qatar repo. What gets committed is Qatar's own theme.

## Rules of engagement

1. **Code pushes never include surface B.** Always `theme.sh push-code`, which sets `--ignore` for `settings_data.json`, `templates/*.json`, `templates/customers/*.json`, `sections/*.json`.
2. **Back up before structural work.** Since pushes land on the published theme, run `./theme.sh backup` before header/footer or template changes. A broken push is fixed by restoring the pre-push snapshot, not by switching themes.
3. **Pull content before and after any theme-editor session** (`theme.sh pull-content`), and commit it. That commit is the record of what changed in the editor.
4. **Never push to KSA.** The `ksa` environment is pull-only and the wrapper refuses to push to it.
5. **Surface C changes get a ledger line the same day** — page, setting, value, date. If it is not in `store-settings-ledger.md`, it does not exist at handover.
6. **`theme check` clean before every commit of theme code.**
7. **Dee reviews the store itself**, which is password-protected until launch. No preview links to juggle — the theme she opens is the theme we are building.
8. **Translate on sight.** Whenever a string is encountered that has no Arabic, translate it there and then rather than filing it, and report what was translated. Standing instruction from Bassam, 2026-08-04. The 86 strings already added this way are in `locales/ar.json` and want a native review before launch.
9. **KSA findings go in the backlog, not into KSA.** Issues spotted on `lush.sa.com` while using it as reference are recorded in `ksa-improvements-backlog.md` for a separate future engagement. Only genuinely critical problems get raised immediately.
10. **Customizations never fork a stock theme file.** They live in `snippets/dotaim-custom-styles.liquid`, rendered from a single line in `layout/theme.liquid`, so a Be Yours update can only ever conflict on that one line. KSA edited stock files directly and pays for it at every update.
11. **Confirm before every store-touching command.** In force from 2026-08-03 at Bassam's request, until the setup has proven itself: no command that reads from or writes to either store runs without his explicit go-ahead, stated in advance as *what it does, which store, read or write*. Local commands (`check`, diffs, file edits) do not need it.

## Reversibility

Nothing in this phase should be a one-way door.

| What changed | How it is rolled back |
|---|---|
| Theme code (surface A) | Git. `git revert` + `push-code`. The baseline commit (`a6ea76d`) is the untouched starting state. |
| Theme editor content (surface B) | Git, provided `pull-content` was run after the editor session — that commit *is* the record. Without it there is no record, which is why rule 3 exists. |
| Any push, including drift that was never in git | The pre-push snapshot in `__reference/snapshots/<env>-<timestamp>/` holds the exact remote state from immediately before. Push it back to restore. |
| A larger change, or one spanning both surfaces | `./theme.sh backup` first — a server-side theme duplicate that is restorable independently of the local machine. Required before structural work, since pushes land on the published theme. |
| Individual Liquid files | Shopify's code-editor Timeline can revert a single file, but it is per-file and admin-only. Treat it as a convenience, never as the rollback plan. |
| Store settings (surface C) | **No mechanism exists.** The ledger records the previous value alongside the new one, and that is the only way back. |

The KSA store has no rollback story because it is never written to — `theme.sh` refuses every write verb against it, including with `--yes`, before the CLI is invoked.

## Parity method — how "identical to KSA" gets built

Qatar is on **9.2**, KSA on **8.4**. That gap rules out the obvious shortcut and shapes everything else.

**KSA's `settings_data.json` and template JSON are a specification to read, not a payload to push.** Across a major version, setting IDs get renamed or dropped, section types get restructured, and new settings appear with defaults. Pushing 8.4 content into a 9.2 theme yields a store that looks roughly right, carries silently-dead settings, and cannot be reasoned about later. So the port is transcribed key by key, against a comparison — not copied.

The comparison makes that tractable rather than tedious:

1. **`config/settings_schema.json`, 8.4 vanilla vs 9.2 vanilla** → three sets: IDs **in both** (transcribe KSA's value directly), **8.4-only** (dropped upstream — find the 9.2 equivalent or consciously drop), **9.2-only** (new — needs a decision, not a default).
2. **Section `{% schema %}` blocks, same comparison** → which section types survive, which settings within them moved. This is what tells us whether a KSA homepage section can be reproduced as-is or needs rebuilding.
3. Work from the resulting reviewed list. Every ported value is a deliberate decision with a reason.

**The customization diff.** No untouched 8.x exists on KSA, so the zero-noise 8.4-vs-8.4 diff is off the table unless an archived copy turns up locally. The working route is `diff -r qatar-9.1.0-vanilla/ ksa-8.4.0-live/`, read in two passes:

- **Files only on KSA-live** — unambiguous additions, regardless of version. This is the highest-signal output and needs no matching baseline.
- **Files in both** — a mix of DotAim's edits and the 8.4→9.1 upstream delta, triaged by hand. Cross-checking against `qatar-9.2.0-live` (stock 9.2 code plus demo-era settings) helps separate the two: anything present in both Qatar themes and absent from KSA is upstream evolution, not our work.

Then, regardless of route:

4. Re-apply each identified customization onto the 9.2 build theme as code, reviewed hunk by hunk. **Skip** the KSA-only ones: the `SAR` riyal font, KSA legal text, KSA contact details, KSA-specific handles.
5. Fix every store-specific reference by hand: collection/product handles, `shopify://` file URLs (**CDN files are per-store — every referenced image must be re-uploaded to Qatar's Files or it silently resolves to nothing**), menu handles, metafield namespaces, blocks referencing apps not installed on Qatar.
6. Everything else is done in the theme editor on the build theme, then pulled back with `pull-content` and committed.

**Set expectations with Dee accordingly:** "identical to KSA" means visually and functionally identical. The two stores will not be file-identical, and Qatar will have 9.2 capabilities KSA does not — which is the right side of that trade to be on.

## Milestones

### T0 — Access & inventory
- [x] Theme Access app installed on Qatar; password generated → `shopify/themes/.env` — 2026-08-03
- [x] Theme Access app installed on KSA; password generated (pull-only use) — 2026-08-03
- [x] Qatar is Be Yours **9.2**, KSA is **8.4**
- [x] `list` + `probe` on both stores — versions and customization state established (table above) — 2026-08-03
- [x] KSA store domain corrected to `ckdthc-qn.myshopify.com`; `lushsa.myshopify.com` was never real
- [x] Theme IDs recorded in `shopify.theme.toml`
- [ ] Pull `ksa-8.4.0-live`, `qatar-9.1.0-vanilla`, `qatar-9.2.0-live` into `__reference/`
- [ ] Check for an archived KSA theme copy from the original project (only route to an exact 8.4 baseline)
- [x] Create the `Be Yours - Lush Qatar (by DotAim)` theme (#152710447243) by duplicating the live 9.2.0 — 2026-08-03, first write to the Qatar store

### T1 — Customization inventory
**Done 2026-08-03 — output is `theme-porting-list.md`, which the build runs against.**
- [x] Schema comparison, 8.4 vs 9.2 → 98 of 101 settings shared; 81 of KSA's 86 set values transcribe directly
- [x] Section inventory → 56 of the 58 types KSA uses exist in 9.2; both gaps are DotAim's own code
- [x] Customization diff → 10 custom files identified, including the ingredients feature and a floating WhatsApp button
- [x] Arabic locale assessed → 413 valid keys to port, 86 new keys to translate, ~2,984 non-theme keys to drop
- [x] Metafields the theme reads → `custom.ingredients`, `custom.ingredient_benefits`, `custom.ingredients_cards`, `custom.ingredient_type`
- [ ] Inventory KSA's installed apps → cost and client approval if any are paid (storefront shows none, but the admin list is unchecked)

### T2 — Foundation parity
- [ ] Theme settings: colors, typography, buttons, spacing, layout
- [ ] Fonts, including the Arabic face (skip the `SAR` font)
- [ ] Logo, favicon, brand assets uploaded to Qatar Files
- [ ] RTL + `locales/ar.json` + `ar.schema.json`
- [ ] Header, footer, announcement bar section groups
- [ ] Navigation menus — surface C, mega menu structure mirroring KSA

### T3 — Templates & sections parity
**Started 2026-08-04.** Search, 404 and cart already matched KSA and needed no work.
- [x] Collection — `image_ratio` square and `show_vendor` off to match KSA; removed the 9.2 demo `multicolumn`
- [x] Product — removed Be Yours demo content that was live on the store: fabricated customer testimonials, a Dr. Barbara Sturm quote, and the `#ImwithBeYours` / `#summerMe` social sections. `content-scrollspy` disabled (9.2-only, not in KSA)
- [x] Home — rebuilt from the WooCommerce homepage's own structure. Six sections live (Popular Categories, three product carousels, Featured Products, newsletter); four await artwork
- [ ] Hero and the three campaign banners — configured and disabled pending images from the WooCommerce site
- [ ] Home, collection, product, cart, search, 404
- [ ] Page, blog, article — depends on the CMS pages + blog migration below
- [ ] Customer account templates
- [ ] Section-by-section visual pass against KSA, desktop + mobile, EN + AR

### T4 — Features
Per context doc §8: mega menu, smart search with suggestions, advanced filtering, product badges (vegan / bestseller / new / limited edition), back-in-stock, zoom galleries, related products, cart drawer with upsells, countdown timers, hero banners.
- [ ] **Ingredients feature** — promised to Dee in the 14 July session and referenced in the client report. **It already exists on KSA** as `sections/lush-ingredients-cards.liquid` + `snippets/lush-ingredients-list.liquid` + `templates/article.ingredient-blog-post.json`, so this is a port of working code, not a build from scratch. Needs the backing metafield definitions on Qatar.
- [ ] `locales/ar.json` — Be Yours ships no Arabic locale; KSA's was authored by DotAim and is a direct port

### T5 — Content & store settings
- [ ] CMS pages migration (open from Phase 3)
- [ ] Blog migration (open from Phase 3)
- [ ] URL redirects / 301 map (open from Phase 3)
- [ ] Legal policy pages — Settings > Policies
- [ ] Everything else per `store-settings-ledger.md`: payments (local Qatar gateway — Shopify Payments is unavailable in Qatar), shipping, taxes, checkout branding, notifications, Google Analytics

### T6 — QA & sign-off
- [ ] `theme check` clean; Lighthouse pass
- [ ] Full AR/RTL sweep, mobile + desktop, both locales
- [ ] Side-by-side parity review against KSA
- [ ] Dee's review on the password-protected storefront, then launch (DNS cutover, per the runbook's Phase 6)

## Open with Bassam

- Check whether an archived copy of the KSA theme from the original migration exists locally. If the KSA library no longer holds an untouched 8.4, this is the remaining route to an exact customization diff.
- Collaborator permissions for `shopify.partner@dotaim.com` may need widening for Admin API work; request scoped permissions rather than using the admin account.
