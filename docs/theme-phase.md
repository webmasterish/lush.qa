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

## Resume here (state at 2026-08-07)

**T4 is under way. Two features are code-complete and verified live in both locales: ingredients and product tile labels.**

Added 2026-08-07:

- **Bassam's editor session is pulled and committed** (`1e99ff6`): mega menus disabled on all six families, per-locale logo files, hero slides bottom-left, date/author/comments off on blog and article, a titled blog section on the home page, the contact page reworked, and two new templates — `blog.ingredients-blog` and `page.branches`.
- **Ingredient imagery fits rather than crops.** `lush-ingredient-article` has `image_fit` (contain by default) and `vertical_alignment` (top by default); article cards on the ingredients blog get the same from **Theme settings > Lush (DotAim)**, applied in `dotaim-custom-styles.liquid` scoped to `blog.handle == 'ingredients'`. Stock `card-article.liquid` stays unforked. Verified live, EN + AR.
- **The product template now reads `custom.category_label` and `custom.subtitle`** through `text` blocks, which do evaluate Liquid (trap 2, corrected below). It renders nothing today because **no product carries either metafield** — 0 of 309 active, checked. That is a data gap, not a code gap.
- **The collection filter sidebar was never audited.** `audit-translations.py` now covers `FILTER`, `PRODUCT_OPTION` and `PRODUCT_OPTION_VALUE`. Both filter labels are translated; the option names that matter are four strings (`Size` ×105, `Gram` ×23, `Color`, `Guests`) since `Title` / `Default Title` never display.
- **"In stock" / "Out of stock" are fixed in the theme, because Shopify cannot fix them.** They are filter *values*, and `FILTER`'s only translatable field is `label`. `snippets/dotaim-facet-labels.liquid` relabels them from locale keys, keyed on the input's value rather than its English text, and re-runs on the Section Rendering re-render. It emits nothing when the locale matches Shopify's English, so the English storefront ships no script. Verified in a browser: sidebar, mobile drawer, and the active-filter chips, before and after an AJAX filter change.
- **Shopify's own `shop-js` bundle logs `Unsupported locale: "ar"`** on every Arabic page. Shop-branded UI (Shop Pay, Login with Shop) will therefore render English on `/ar` and nothing in the theme can change that. Worth setting Dee's expectations on before launch.
- **Arabic registered** for the editor session: 13 strings, then 3 more that were sitting *outdated* — `apply-translations.py` had been treating an outdated translation as done, so stale Arabic kept rendering after Bassam changed the English. Remaining gaps are deliberate (Be Yours gift-card demo copy, contact details, Liquid).
- **Product-level Arabic is the big remaining gap:** `product_type` missing on all 537 products, `title` on 108, `body_html` on 111. Collections: 32 strings.
- **Label backfill is run.** 54 active products carry `theme.label` — 34 New, 21 Bestseller — each with its Arabic registered, verified rendering in both locales. Drafts were skipped by design, which is why Limited Edition (all seasonal drafts) is still zero. Vegan still has no source and needs Dee. One colour per label from the theme's own palette: Bestseller `#1a1b18`, New `#ffb503`, Limited Edition and Vegan `#138645`. Sale red `#c0270b` is deliberately unused so a label never reads as a discount.
- **Menu regrouped and mega menus back on.** Seven families, three levels, four columns to a row — see the ledger. The two-level shape was the actual cause of the three-row panels: Be Yours makes every second-level item a column.
- **Sort dropdown and the filter values are handled the same way**, in `dotaim-facet-labels.liquid`: Shopify sends both in English regardless of locale. Nine sort keys added to all 14 locale files.
- **Phone numbers render LTR inside Arabic**, so `+974 44874265` keeps its `+` and country code on the correct end.
- **"Checkout & system" is a whole translation surface we had not touched** (found by Bassam in Translate & Adapt). It is `ONLINE_STORE_THEME_LOCALE_CONTENT`: 4,458 keys of Shopify's own storefront and checkout copy, and **Shopify serves English until each key is overridden** — proved on the live Arabic checkout, which renders English apart from overridden keys. 170 storefront-facing ones are now Arabic (`system-strings-ar.json` + `apply-system-strings.py`); this is what fixed the `/collections/all` heading. **`shopify.checkout.*` (2,455) and `customer_accounts.*` (1,222) are still English and are the client's decision** — Translate & Adapt's bulk auto-translate is the sane route.
- **`audit-translations.py` now walks all 30 resource types**, introspected from the API. It had covered 14, which is why this surface and the filter sidebar stayed invisible.
- **Redirects applied**: 457 live and spot-checked. Shopify matches redirect paths case-insensitively, so `/Hair` and `/hair` share one slot — the script now treats them as one instead of reporting failures.
- **Found while auditing, not yet fixed:** the shipping rates are named in Arabic as their *source* value ("قياسي", "سريع"), so the **English** checkout shows Arabic rate names. They want English sources with Arabic translations. "International" is the one English rate.
- **Page titles are a partial fix.** The `<title>` on `/ar/cart`, `/ar/collections`, `/ar/search` and 404 still renders English hours after the override was registered, while the same override visibly works where the string is page content. Cosmetic, tab-title only; re-check before launch.

Live state to know before touching anything:

- Theme: `Be Yours - Lush Qatar (by DotAim)` #152710447243, **published**. Restore points from this session: `restore point 2026-08-06 — build` (#152793874571).
- **Typography changed 2026-08-06** (Bassam, in the editor): headings `inter_n8` (Inter ExtraBold), body `inter_n4`, navigation on the body font at 12. That puts Qatar on Lebanon's typography, which is closer to lush.com than KSA's. To be reviewed with Dee.
- **Ingredients** — `snippets/lush-ingredients-list.liquid` (full INCI list, in a `collapsible_tab` via Custom liquid) and `sections/lush-ingredients-cards.liquid` (hero cards) on the product template; `sections/lush-ingredient-article.liquid` + `templates/article.ingredient-blog-post.json` for the article page. Store has an `ingredients` blog with **3 articles** (EN + AR, metafields, images). `cinnamoroll` is wired with 2 of its 25 ingredients.
- **Product labels** — no new theme code. Be Yours already reads `theme.label` / `theme.label_color`; only the definitions were missing. **3 products** carry labels (`super-fairy-2`, `super-milk-single-wick-candle`, `banoffee-pie-2`). **The catalogue is otherwise unlabelled — no backfill has been run.**
- Metafields on the store: `theme.label`, `theme.label_color` (labels); `custom.ingredients`, `custom.ingredients_cards` on the product and `custom.ingredient_type`, `custom.ingredient_subtitle`, `custom.ingredient_benefits` on the article. Also defined but **not yet read by any code**: `custom.subtitle`, `custom.category_label`, `custom.how_to_use`, `custom.how_to_store` (the last two are wired into collapsible rows).

### Traps found this session — do not relearn these

1. **`theme check` clean does not mean Shopify accepts the file.** `"default": ""` on a `text` setting passes locally and is rejected server-side; `push-code` still exits reporting success with the error in a separate block. **Grep pushes for `error`, not just `success`.**
2. **Liquid in section settings is evaluated in `text` and `textarea` settings, and nowhere else.** `richtext`, `inline_richtext` and `image_picker` render it literally or drop it. Shopify documents only `"type": "liquid"` as Liquid-enabled, so `text` working is undocumented behaviour to lean on knowingly, not to assume: verified on the live store 2026-08-07, where a `text` block set to `{{ product.vendor }}` resolves to the vendor. This is the exact split that makes KSA's ingredient article template non-functional (backlog #13) — it puts Liquid into `inline_richtext`, `richtext` and `image_picker` — and it is why the header logo silently rendered nothing while it held `{{ shop.brand.logo }}` in an `image_picker`.
3. **Metafield definitions created via the API default to `storefront: NONE`** — the theme then cannot read them and the markup renders empty with no error anywhere. Admin-created ones default to `PUBLIC_READ`. Set `access` explicitly.
4. **Metafield translations are their own resource**, addressed by the metafield's GID with a single key `value`, not by the owning product. For list types the value is the whole JSON array.
5. **WooCommerce slug ≠ Shopify handle.** 140 of 538 products share a name, so Shopify invented handles (`banoffee-pie-2`) and the tidy one is often a draft. Match on `dotaim_migration.source_id`.

### Next, in order

1. **Product Arabic** — the largest remaining language gap: `product_type` on all 537 products (it feeds a product-type filter), `title` on 108, `body_html` on 111, plus 32 collection strings. Needs a scripted pass; `apply-translations.py` covers only authored content, not migration data.
2. **Remaining T4**: cart drawer upsells, back-in-stock, smart search and filtering. `custom.subtitle` and `custom.category_label` are rendered by the product template now but no product carries either value — populating them is Dee's, and the blocks stay hidden until they do.
3. **T5 content** — the biggest unstarted chunk: 16 CMS pages, the 301 redirect map, the empty legal pages.
4. **Ingredients data** — blocked on Dee taking the lush.com harvest to Lush HQ. Longest lead time on the board.
5. **Qatar payments** — local gateway, weeks of lead time, hard launch blocker.

## Earlier state (2026-08-04)

**T2 and T3 are done.** The storefront is complete in both locales behind the password: hero slideshow, Popular Categories, four product carousels, three campaign banners, blog posts, Lush Values, and a four-column footer. Header, mega menus, navigation, fonts, RTL and Arabic are all live.

Live state to know before touching anything:

- Theme: `Be Yours - Lush Qatar (by DotAim)` #152710447243, **published**. There is no separate build theme pre-launch.
- The brand font applies Lebanon-style (display type only), from `snippets/dotaim-custom-styles.liquid`, which **must render after base.css** — it lost the cascade otherwise.
- The only forked stock file is `sections/footer.liquid` (copyright wording). Re-apply after a theme update.
- Twelve unused Be Yours demo templates were deleted; every product and page uses the default template.
- Everything DotAim authored is translated to Arabic. Client-side gaps are in `translation-gaps-for-client.md`.

**Next: T4 features.** In rough order of value:

1. ~~**Ingredients feature**~~ — **theme code complete 2026-08-05**, `theme check` clean; see T4 below. Content source settled the same day: **lush.com's own ingredient library**, in both locales, harvested at the URLs already embedded in Qatar's product descriptions (`theme-porting-list.md` §5). Qatar's descriptions supply the per-product wiring (453 ingredients across 127 products); lush.com supplies the article layer. No KSA credential needed. **Remaining work is data, not code**, and it waits on Dee taking the harvest to Lush HQ.
2. Product badges — vegan / bestseller / new / limited edition, metafield-driven.
3. Cart drawer upsells, back-in-stock, smart search and filtering.
4. Then T5: CMS pages, URL redirects, and the store settings still open in `store-settings-ledger.md`.

Open questions for Bassam or Dee, none blocking:

- Transparent header is off, so the white logo uploaded for it is unused.
- Branches page lists one showroom; KSA lists several.
- Seventeen top-level menu items is a lot for a horizontal header.
- Hero slideshow uses four slides picked from a seasonal rotation — Dee should confirm.

## The three surfaces

Every change in this phase lands on exactly one of these. Knowing which one decides how it gets versioned.

| | Surface | What lives there | Source of truth | Sync |
|---|---|---|---|---|
| **A** | **Theme code** | `*.liquid`, `assets/*.css|js`, `config/settings_schema.json`, `locales/*.json` | **The repo** | `theme push` (code only) / `theme pull` to recover admin code-editor edits |
| **B** | **Theme content** | `config/settings_data.json`, `templates/*.json`, `templates/customers/*.json`, `sections/*.json` (section groups) | **The store** — the theme editor writes these | `theme pull` content into the repo as a versioned snapshot |
| **C** | **Store settings** | Markets, languages, payments, shipping, taxes, checkout, legal policies, navigation menus, metafield definitions, files, notifications, domains, apps, GA | **The store** — no file representation at all | Recorded by hand in `store-settings-ledger.md` |

The failure mode this guards against: a `theme push` of code silently overwriting a section the client rearranged in the editor, or an editor session overwriting code we wrote locally.

### Who owns theme-editor content, and when

This is the question that decides whether editor work survives, so it is worth stating plainly.

**Code pushes are already safe.** `push-code` excludes `settings_data.json` and all template/section JSON, so anything done in the theme editor is untouched by them. Push code as often as you like.

**`push-content` is the risk**, because it writes editor territory from the repo. It is used deliberately during the build to port settings in bulk. From 2026-08-04 it refuses to run when the editor has changed since the last sync:

- every `pull-content` and `push-content` records the synced state in `__reference/content-baseline/`
- `push-content` re-reads the store first and compares against that baseline, **parsed as JSON rather than byte-for-byte** — Shopify normalizes what it serves, so a byte compare flags everything
- if the store moved, it names the files, refuses, and tells you to `pull-content` and commit first
- `--force` overrides, for when the repo really should win

**Menus are not affected by any of this.** They live in Content > Menus, not in the theme, so no `push-code` or `push-content` can touch them — a menu built in the admin is safe from every theme operation. The only thing that writes a menu is `apply-nav.py --apply`, and only the one whose handle is in `main-menu.json`. Because menus have no history either, `apply-nav.py --export` records every menu on the store into `nav/menus.json`, including ones built by hand, so a deleted menu can be rebuilt.

**Ownership changes at training.** During the build the repo drives content and the editor is used for spot checks. Once the client is trained and using the editor for real, the store becomes authoritative: from then on the workflow is `pull-content` → commit, and `push-content` should be treated as a break-glass command. Nothing about the tooling changes — only which direction is normal.

### The one forked stock file

`sections/footer.liquid` — the copyright line. The theme hardcodes `© {year}, {shop.name}. {copyright_text}` and no setting changes that wording; the client wants exactly `Copyright © 2026 LUSH.` KSA had to make the same edit. The stock line is commented out with a note pointing here, so **re-apply it after any Be Yours update**. Everything else stays in `snippets/dotaim-custom-styles.liquid`.

### Finding what needs translating

Gaps do not announce themselves — a heading typed into the theme editor, a menu item or a new page simply renders in English on the Arabic storefront. `shopify/themes/i18n/audit-translations.py` asks Shopify directly instead of relying on memory: it walks every translatable resource type, reports what has no Arabic and what Shopify has flagged `outdated`, and takes `--detail` to list the actual strings. Run it after any round of content work.

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

### T0 — Access & inventory — **complete**
- [x] Theme Access app installed on Qatar; password generated → `shopify/themes/.env` — 2026-08-03
- [x] Theme Access app installed on KSA; password generated (pull-only use) — 2026-08-03
- [x] Qatar is Be Yours **9.2**, KSA is **8.4**
- [x] `list` + `probe` on both stores — versions and customization state established (table above) — 2026-08-03
- [x] KSA store domain corrected to `ckdthc-qn.myshopify.com`; `lushsa.myshopify.com` was never real
- [x] Theme IDs recorded in `shopify.theme.toml`
- [x] Pull `ksa-8.4.0-live`, `qatar-9.1.0-vanilla`, `qatar-9.2.0-live` into `__reference/` — 2026-08-03, plus `ksa-8.5.0-unpublished` for the update assessment
- [x] Check for an archived KSA theme copy — **none exists** (Bassam, 2026-08-04). The exact 8.4 baseline is unavailable, so the customization diff ran against `qatar-9.1.0-vanilla` and was triaged by hand
- [x] Create the `Be Yours - Lush Qatar (by DotAim)` theme (#152710447243) by duplicating the live 9.2.0 — 2026-08-03, first write to the Qatar store

### T1 — Customization inventory — **complete**, one item open
**Done 2026-08-03 — output is `theme-porting-list.md`, which the build runs against.**
- [x] Schema comparison, 8.4 vs 9.2 → 98 of 101 settings shared; 81 of KSA's 86 set values transcribe directly
- [x] Section inventory → 56 of the 58 types KSA uses exist in 9.2; both gaps are DotAim's own code
- [x] Customization diff → 10 custom files identified, including the ingredients feature and a floating WhatsApp button
- [x] Arabic locale assessed → 413 valid keys to port, 86 new keys to translate, ~2,984 non-theme keys to drop
- [x] Metafields the theme reads → `custom.ingredients`, `custom.ingredient_benefits`, `custom.ingredients_cards`, `custom.ingredient_type`, and (found 2026-08-05) `custom.ingredient_subtitle`
- [ ] Inventory KSA's installed apps → cost and client approval if any are paid (storefront shows none, but the admin list is unchecked)

### T2 — Foundation parity — **complete 2026-08-04**
- [x] Theme settings: colors, typography, buttons, spacing, layout — header/footer/announcement colours ported from KSA; Bassam set accent, button labels, page width 1200 and navigation size in the editor 2026-08-04
- [x] Fonts — `LushHandwritten_Bd` in theme assets, applied Lebanon-style to display type only. **No separate Arabic face was needed**: KSA has none either, and Arabic renders in the body font. `SAR` deliberately skipped
- [x] Logo, favicon, brand assets — in Settings > Brand (Bassam). **Corrected 2026-08-07:** the header's `logo` is an `image_picker`, which does not evaluate Liquid, so the `{{ shop.brand.logo }}` it held rendered nothing. It now holds the file itself, with the Arabic logo registered as a translation of that setting, which is also how Arabic gets its own wordmark. Seasonal swaps are therefore a header setting change plus its Arabic counterpart, not a Files upload. Transparent white logo uploaded but the transparent header is still switched off
- [x] RTL + `locales/ar.json` — RTL via `localization.text_direction_trigger`, no theme fork; 499/499 locale keys. **`ar.schema.json` deliberately skipped** — it translates theme-editor labels for Arabic-speaking admins, not the storefront, and KSA has none
- [x] Header, footer, announcement bar section groups — footer columns done 2026-08-04 (Customer Service, We Are Lush); announcement bar deliberately off
- [x] Navigation menus — applied 2026-08-04 from `shopify/themes/nav/main-menu.json`; mega menus enabled for the six large families

### T3 — Templates & sections parity — **complete 2026-08-04**, except the visual pass and customer-account templates
**Started 2026-08-04.** Search, 404 and cart already matched KSA and needed no work.
- [x] Collection — `image_ratio` square and `show_vendor` off to match KSA; removed the 9.2 demo `multicolumn`
- [x] Product — removed Be Yours demo content that was live on the store: fabricated customer testimonials, a Dr. Barbara Sturm quote, and the `#ImwithBeYours` / `#summerMe` social sections. `content-scrollspy` disabled (9.2-only, not in KSA)
- [x] Home — rebuilt from the WooCommerce homepage's own structure. Six sections live (Popular Categories, three product carousels, Featured Products, newsletter); four await artwork
- [x] Hero and the three campaign banners — imagery imported from the WooCommerce site 2026-08-04; all ten homepage sections live and verified in both locales
- [x] Home, collection, product, cart, search, 404 — all verified live in both locales. Search, 404 and cart already matched KSA and needed no work
- [x] Page, blog, article — templates done and verified; 3 articles imported EN+AR and the Branches page created. The **16 WooCommerce CMS pages are still to migrate** (T5)
- [ ] Customer account templates — **not started**; depends on the Settings > Customer accounts choice in `store-settings-ledger.md`
- [ ] Section-by-section **visual** pass against KSA, desktop + mobile, EN + AR — **not done**. Everything so far was verified by inspecting rendered HTML, which proves content and structure but not how it looks. Belongs with T6

### T4 — Features
Per context doc §8: mega menu, smart search with suggestions, advanced filtering, product badges (vegan / bestseller / new / limited edition), back-in-stock, zoom galleries, related products, cart drawer with upsells, countdown timers, hero banners.
- [x] **Ingredients feature — theme code done 2026-08-05**, `theme check` clean. `sections/lush-ingredients-cards.liquid` and `snippets/lush-ingredients-list.liquid` ported from KSA with three defects fixed (empty `alt`, untranslated legend, JS-hidden empty state — backlog #10–12). KSA's `article.ingredient-blog-post.json` was **not** ported: it puts Liquid into stock `image-with-text` settings that never evaluate it, so it renders literal `{{ article.title }}` (backlog #13). Replaced by `sections/lush-ingredient-article.liquid` + `templates/article.ingredient.json`. Five locale keys added in all 14 locale files, Arabic taken from Lush HQ's own wording.
- [ ] **Ingredients data** — blocked on Dee, deliberately. Needs: the five metafield definitions (surface C), an **ingredient blog**, ~453 articles in EN + AR, and the images re-uploaded to Qatar's Files. Harvester built and proven end to end on 3 real ingredients: `shopify/themes/ingredients/` (`harvest-ingredients.py` + `fetch.md`). Nothing fetched at scale until HQ agrees.
- [x] **Product tile labels — done 2026-08-06.** No new theme code: Be Yours already reads `theme.label` / `theme.label_color` in `card-product.liquid` and `mega-showcase-card.liquid`, one badge per value, text colour by contrast. Only the definitions were missing. `shopify/themes/labels/product-labels.py` creates them, sets values and registers the Arabic. **Backfill run 2026-08-07**: 186/186 matched, 54 active products labelled (New 34, Bestseller 21), Arabic registered per product and verified rendering on the Arabic storefront. Limited Edition is 0 because all 11 are seasonal drafts and drafts are skipped — `--include-drafts` when they go live. Vegan has no source data in WooCommerce
- [x] `locales/ar.json` — done in T2, not T4: ported and repaired, 499/499 keys, `theme check` clean

### T5 — Content & store settings
- [x] **CMS pages — nothing outstanding, established 2026-08-07.** The "16 pages" figure was an early estimate that never survived contact with the site. The archived URL inventory (`shopify/themes/redirects/legacy-urls.txt`, 875 paths) shows the old site's only non-catalogue pages were `/about`, `/contact-us`, the three policies, and the blog. Contact and the policies exist; **About is the single page that has no Shopify equivalent** and needs a decision, not a migration
- [x] Blog migration — 3 posts imported with images and Arabic translations 2026-08-04 (`shopify/themes/blog/`)
- [ ] **URL redirects / 301 map — built, not applied.** `shopify/themes/redirects/build-redirects.py` resolves 471 of the 875 archived legacy URLs (325 products, 132 collections, policies, blog, account) against the migration database. 252 of the rest are `/product-tag/` URLs that were never migrated; the remainder are products and categories that no longer exist
- [x] **Legal policies — done as far as they go** (Bassam, 2026-08-07): privacy, refund and terms are written and translated. Shipping and contact-information policies are the client's call, are not tracked here, and anyone can add them from Settings > Policies. The footer's automatic policy list is switched off, because Shopify does not translate policy titles and it was rendering an English duplicate under the Arabic menu links
- [ ] Everything else per `store-settings-ledger.md`: payments (local Qatar gateway — Shopify Payments is unavailable in Qatar), shipping, taxes, checkout branding, notifications, Google Analytics

### T6 — QA & sign-off
- [ ] Lighthouse pass — not run. (`theme check` is already clean: 200 files, no offenses, and is run before every commit)
- [ ] Full AR/RTL sweep, mobile + desktop, both locales
- [ ] Side-by-side parity review against KSA
- [ ] Dee's review on the password-protected storefront, then launch (DNS cutover, per the runbook's Phase 6)

## Open with Bassam

- Check whether an archived copy of the KSA theme from the original migration exists locally. If the KSA library no longer holds an untouched 8.4, this is the remaining route to an exact customization diff.
- Collaborator permissions for `shopify.partner@dotaim.com` may need widening for Admin API work; request scoped permissions rather than using the admin account.
