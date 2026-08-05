# Porting list — KSA 8.4 → Qatar 9.2

The checklist the build runs against. Derived 2026-08-03 from local read-only copies in `shopify/themes/__reference/`: `ksa-8.4.0-live` (the parity target), `qatar-9.1.0-vanilla` (untouched baseline), `qatar-9.2.0-live`. Method and rules: `theme-phase.md`.

## Headline: the version gap is much smaller than it looked

The 8.4 → 9.2 major bump turns out to be mostly additive. Measured, not assumed:

| | Result |
|---|---|
| Theme settings defined | 101 in 8.4, 108 in 9.2 — **98 shared** |
| Settings KSA actually sets | 86, of which **81 transcribe directly** into 9.2 |
| Settings with no 9.2 equivalent | **5** (four of them empty or zero on KSA) |
| Section types KSA uses | 58, of which **56 exist in 9.2** |

So this is largely transcription, not reconstruction. The two genuinely missing section types are both **ours**, not RoarTheme's.

## 1. Custom files to port

Present on KSA-live, absent from stock Be Yours. This is DotAim's own work from the KSA project.

| File | What it is | Notes |
|---|---|---|
| `sections/lush-ingredients-cards.liquid` (662 lines) | **The ingredients feature**, used on `product.json` | Needs metafields — see §5 |
| `snippets/lush-ingredients-list.liquid` (106 lines) | Ingredients list rendering | Same |
| `templates/article.ingredient-blog-post.json` | Blog template for ingredient articles | |
| `locales/ar.json` | Arabic theme strings — **Be Yours ships none** | See §4, needs filtering |
| `templates/page.branches.json` | Store branches page | `main-page` + `multicolumn` |
| `templates/page.consultation-request.json` | Consultation request page | Built on an `apps` section — check which app |
| `templates/page.newsletter-signup.json` | Newsletter signup page | |
| `config/markets.json` | Market configuration | KSA-specific values, structure only |
| `blocks/ai_gen_block_5ca9f34.liquid` | **Floating WhatsApp button** — present but **disabled** on KSA | See §2 |
| `templates/index.context.sa.json` | KSA market-contextual homepage | **Skip** — KSA-only |

## 2. The WhatsApp button already exists

KSA's footer group carries an AI-generated theme block configured as a floating WhatsApp button: phone `+966553337052`, WhatsApp green `#25d366`, hover `#128c7e`, with size and spacing settings. It is the `_blocks` entry that showed up as a missing section type.

**Correction (2026-08-04): that block is `disabled` on KSA and does not render** — confirmed against the live storefront, which loads no WhatsApp script. So it is working code that was never switched on, not a feature in production.

**Decision 2026-08-04: not being added.** It is disabled on KSA, so nothing is being mirrored by leaving it out. The $200 WhatsApp integration line stays in scope as app-level work (order confirmations, shipping updates); the floating button can be revisited then.

## 3. Settings needing a decision

Everything else transcribes. These do not:

**No 9.2 equivalent (5).** Four are harmless — `low_inventory_badge_collections` (empty), `low_inventory_badge_scope`, `low_inventory_badge_threshold` (0), `low_inventory_threshold` (0): the low-inventory badge feature was reworked upstream and KSA never configured it, so there is nothing to carry. `content_for_index` is a legacy key, dropped.

**New in 9.2 (10), each needs a call rather than a default:**

| Setting | Default | Recommendation |
|---|---|---|
| `heading_size_mode` | `classic` | **Keep `classic`** — RoarTheme added this specifically so existing stores keep stable heading sizes. Matching KSA is the goal. |
| `glass_design_enabled` + `glass_blur_intensity`, `glass_bg_opacity`, `glass_border_opacity`, `glass_tint_color` | off | **Leave off.** The 9.0 frosted-glass look is not KSA's look. |
| `color_schemes` | — | New scheme-group system layered over the individual colour settings KSA uses. Verify KSA's colours land correctly once transcribed. |
| `voice_search_enabled` | off | Leave off unless Dee wants it. |
| `similar_products_mode` | `sold_out` | 9.2 feature KSA lacks; keep the default, mention to Dee as a free win. |
| `show_add_discount_code` | on | Keep on. |

## 4. The Arabic locale needs filtering, not just copying

`locales/ar.json` on KSA holds **3,400 keys**, but KSA's own `en.default.json` holds only 458. The extra ~2,984 are Shopify's **customer-accounts / B2B** translation keys that do not belong to the theme at all — they arrived from a full Shopify locale bundle, not from theme translation work.

Against Qatar's 9.2:

- **413 keys** are real theme translations still valid → port directly.
- **86 keys** are new in 9.2 with no Arabic → need translating.
- The ~2,984 non-theme keys → drop.

The translations themselves are good quality (`sections.collection_template.no_products` → `عذرا، لا يوجد منتجات في هذه المجموعة`), so this is filtering plus 86 new strings, not a retranslation.

## 5. Dependencies that are not theme work

The ingredients feature reads four product metafields in the `custom` namespace:

```
custom.ingredients        custom.ingredient_benefits
custom.ingredients_cards  custom.ingredient_type
```

Porting the Liquid gets us a feature with nothing to display. Qatar needs the **definitions** created (surface C, `store-settings-ledger.md`) and the **content** populated. Qatar's WooCommerce source holds ingredient text inside product descriptions, with the broken-link issues already noted in `client-data-quality-notes.md`.

Worth raising with Bassam: KSA and Qatar sell largely the same Lush products, so KSA's ingredient metafield values may be reusable by SKU or handle match. That would need read access to KSA's Admin API — a different credential from the theme password, and a separate decision.

## 6. Page templates KSA has

Beyond the standard set: `page.branches`, `page.consultation-request`, `page.newsletter-signup`, `page.store-locator`, `page.about` and `page.about-modern`, `page.contact` and `page.contact-with-map`, `page.faq`, `page.plant-drop`, `page.visit`, `page.sidebar`, plus `product.pre-order`, `product.product-landing`, `product.gift-card`, `product.modal`.

Which of these Qatar needs depends on the 16 CMS pages still to migrate (Phase 3, scheduled at T5). Match them up before building templates nobody will use.

## 7a. Header and footer — done and blocked

**Done 2026-08-04:** visual settings ported and verified live — announcement bar `#1a1b18` on `#ffb503` highlight, header white on `#282828` with the marker highlight and bag cart icon, footer black with white headings, KSA's padding and logo heights, social icons and payment icons off, policy links on.

**Deliberately not ported:** the `seasonal_deal` blocks and mega-menu promos in KSA's header. They hold unedited Be Yours demo copy ("THE PERFECT PRESENT … includes a cuddly teddy bear", "MEET OUR NEW BAE!", the literal placeholder "Add a tagline") and **render nowhere on the live Saudi site** — verified, zero occurrences in the page. Mirroring KSA there would mean importing dormant demo content.

**Blocked:** logos (per-store file URLs, need uploading to Qatar's Files), announcement copy (Saudi riyal threshold and delivery window; needs Dee, plus Arabic), and every menu (see `navigation-plan.md`).

## 7. KSA homepage — the parity target

Enabled sections in order (13 more sit disabled in the template and can be ignored):

1. `slideshow`
2. `featured-collection` ×3
3. `countdown-timer`
4. `image-with-text`
5. `countdown-timer`
6. `tab-collage`
7. `image-with-text-overlay`
8. `video-hero`
9. `featured-blog`
10. `guarantees`

Every one of these section types exists in Qatar 9.2. Content, images and collection targets are Qatar's own — and every referenced image must be uploaded to Qatar's Files, since `shopify://` URLs are per-store.

## Open design question — where the brand face applies

Qatar currently applies `LushHandwritten_Bd` to **all headings**, because that is what KSA does and Dee asked for a mirror of the Saudi store.

**Lush UK/HQ and Lush Lebanon use it for headlines only** — not for prices, buttons or UI text — which is the more accurate reading of the brand. Bassam's view (2026-08-04) is that Saudi will likely be brought in line with UK eventually.

Nothing to do now, but the target is no longer guesswork. **Lush Lebanon already implements exactly this**, and inspecting it (2026-08-04) shows the pattern to copy — including the same variable name Bassam asked for here, which is where it comes from:

```css
/* lushlebanon.com — Be Yours 8.5.0 */
:root { --font-heading-family: Inter, sans-serif; }   /* headings are NOT the brand face */
.font-lush-handwritten,
.product__heading,
.card-information__text,
.slideshow__heading      { font-family: var(--font-lush-handwritten); }
```

plus per-section rules on chosen `image-with-text` headings, added through the theme editor's per-section custom CSS.

So the change, when it comes, is: stop pointing `--font-heading-family` at the brand face, and instead apply `var(--font-lush-handwritten)` to that short list of selectors, with a `.font-lush-handwritten` utility class for anything else. Qatar's `--font-lush-handwritten` variable is already named and structured to match, so this is a small edit to `snippets/dotaim-custom-styles.liquid` rather than a rework.

## 8. Explicitly skip

- The **`SAR` riyal font** — Qatar is QAR.
- `templates/index.context.sa.json` — KSA market context.
- KSA social links, phone numbers, LinkedIn, legal text, contact details.
- KSA's 8.4-era stale values, including the demo social URLs found in the older library copies (`ksa-theme-update-assessment.md`).
