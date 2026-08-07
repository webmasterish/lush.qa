# Lush KSA — improvements backlog

Running list of issues found on `lush.sa.com` while using it as the parity reference for Qatar. **Nothing here gets actioned during the Qatar project** (Bassam's call, 2026-08-04) — it becomes its own engagement once Qatar ships. The exception is anything genuinely critical, which gets raised immediately rather than filed.

Theme-update risk for KSA is assessed separately in `ksa-theme-update-assessment.md`.

Nothing on this list currently meets the bar for interrupting Qatar. The closest is the first item, which is customer-visible but low-impact.

## Arabic storefront defects

All found while porting KSA's `ar.json` to Qatar, and all still live.

| # | Issue | Impact | Severity |
|---|---|---|---|
| 1 | **7 strings have corrupted Liquid placeholders.** A translation tool wrapped `{{ link }}` in `<span class="notranslate">`, URL-encoded the spaces, and the markup came back HTML-escaped, leaving it unusable inside `href=""`. | Broken links on the Arabic site: the cart's shipping-policy link, and "clear all" filters on collection and search pages. | Medium — customer-visible, narrow |
| 2 | **`date_formats.month_year` was itself translated.** `%B %Y` became `٪بواسطة` — Arabic percent sign plus the word "by". | Arabic dates render as garbage wherever that format is used (blog, articles). | Medium |
| 3 | **`general.date.minute` mistranslated.** "minute" read as "min" → `الحد الأدنى` ("the minimum") instead of `دقيقة`. | Wrong word in countdown timers. | Low |
| 4 | **`general.social.links.twitter` = `تغريد`** — that is the verb "tweet", not the platform name. | Cosmetic. | Low |

The corrected versions of 1–3 are already in Qatar's `shopify/themes/be-yours/locales/ar.json`, so the fixes can be lifted straight from there when KSA's turn comes. Note KSA is on 8.4 and Qatar on 9.2, so the file cannot be copied wholesale — only these specific keys.

## Theme maintainability

| # | Issue | Why it matters |
|---|---|---|
| 5 | **RTL is hardcoded in `layout/theme.liquid`** (`if request.locale.iso_code == 'ar'` → force rtl) because their `ar.json` is missing `localization.text_direction_trigger`. | Forks a stock theme file, so it must be re-applied after every theme update. Setting the locale key instead gives identical behaviour with no fork — that is what Qatar does. |
| 6 | **Customizations live inside `snippets/css-variables.liquid`** — the brand font, the riyal-symbol font, and the Arabic letter-spacing fix are all edited into a stock file. | Same problem: every theme update risks losing or conflicting with them. Qatar keeps the equivalent in its own `snippets/dotaim-custom-styles.liquid`, rendered from one line in `theme.liquid`. |
| 7 | **An unpublished 8.5.0 theme sits in the library, descended from the old 8.3.3 theme, not from what is live.** | If anyone publishes it, the store loses its favicon and reverts three social links to Shopify's demo URLs. Worth deleting or clearly renaming. Detail in `ksa-theme-update-assessment.md`. |
| 9 | **The mega menu is misconfigured.** The `mega_menu` block's `menu_title` is `"Skincare"`, but KSA's menu has no top-level item by that name (theirs are Face, Body Care, Hair Care…). | The block never renders, which is why its three `seasonal_deal` promos — all still holding Be Yours demo copy — are invisible on the live site. Either point it at a real menu item and write real content, or remove it. |

## The ingredients feature

Found 2026-08-05 while reading the code for the Qatar port. All three are fixed in Qatar's version; the fixes can be lifted back when KSA's turn comes.

| # | Issue | Why it matters | Severity |
|---|---|---|---|
| 10 | **The ingredient card's `alt` text is always empty.** `sections/lush-ingredients-cards.liquid` uses `{{ ingredient.name | escape }}`, but the referenced object is an Article, which has `title` and no `name`. | Every ingredient card image ships `alt=""`. Accessibility and image SEO on the product pages that carry the feature. One-word fix (`name` → `title`). | Medium |
| 11 | **The ingredients legend is hardcoded English.** `snippets/lush-ingredients-list.liquid` prints the literals `Natural Ingredients` and `Safe Synthetics` rather than locale keys. | On the Arabic storefront the two legend labels render in English under an otherwise Arabic accordion. | Medium — customer-visible on `/ar` |
| 12 | **The empty state hides the accordion row with JavaScript after render.** When a product has no ingredients, the snippet emits a `<script>` that walks up to the parent `.accordion__section` and sets `display:none`. | Products without ingredients paint an empty "Ingredients" row before the script removes it, and the row stays visible if JS fails. It is a workaround for `custom_liquid` not being able to suppress its own parent block, so it is defensible, but it should at least be CSS-first rather than post-render JS. | Low |

| 13 | **`templates/article.ingredient-blog-post.json` cannot work.** It drives a stock `image-with-text` section and puts Liquid into settings that never evaluate it: `{{ article.title }}` into `heading` (`inline_richtext`), `{{ article.metafields.custom.ingredient_type.value }} Ingredient` into `subheading` (`inline_richtext`), `{{ article.content }}` into `text` (`richtext`), and `{{ article.image }}` into `image` (`image_picker`). Shopify only evaluates Liquid in settings declared `"type": "liquid"`. | Any article on this template renders the literal characters `{{ article.title }}` and shows no image. Either KSA's ingredient articles display raw Liquid today, or the template was built and never assigned to an article — **worth checking on the live site**. Qatar does not port it; `sections/lush-ingredient-article.liquid` does the same job as real Liquid. | **High if any article uses it** |

| 14 | **Notification emails have no Arabic.** Checked 2026-08-08 while auditing Qatar: the KSA store's notification templates carry no Arabic either, so an Arabic-speaking customer gets an English order confirmation, shipping confirmation and cancellation. | Every transactional email a customer receives is English, on a store whose storefront is bilingual. Not visible anywhere in the admin unless someone opens the per-language preview under Settings > Notifications. | Medium — customer-visible, but only after they buy |

## Housekeeping

| # | Issue |
|---|---|
| 8 | `locales/ar.json` carries 3,400 keys, of which roughly 2,980 are Shopify customer-account/B2B strings that were never theme strings — they arrived from a full locale bundle. Harmless but noisy. |
