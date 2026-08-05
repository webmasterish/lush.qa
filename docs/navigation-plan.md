# Navigation plan — proposed Qatar menus

Menus are **surface C** (Content > Menus): store data with no file representation, so this doc is the only record until they exist. The header's mega menu and all four footer columns read from them, which makes this the gating item for finishing the header and footer.

## Source: the existing WooCommerce site, not KSA

Built from **`lush.qa`'s own category hierarchy**, read from the live WooCommerce site on 2026-08-04. Bassam's direction, and it is plainly the right source: the parent/child structure is encoded in the WooCommerce URLs (`/product-category/face/toners/`), so this is Qatar's real catalogue shape rather than an inference from Saudi.

It also reflects how Dee's "mirror the Saudi store" should be read — **same style, not the same content**. Qatar's navigation should carry Qatar's categories.

**62 of the 64 category links map to a migrated Shopify collection.** The two that do not, `fun-en` and `shower-bombs`, have no collection because the migration created collections only for categories that had products. Confirm they are empty in WooCommerce before deciding whether to drop them; they are excluded below.

**Applied 2026-08-04.** The menu is live: 17 top-level items, 61 collection links rendering in the header, Shopify's Home/Catalog/Contact placeholders gone. Mega menus are enabled for the six large families (Bath and Shower, Face, Body, Hair, Fragrances, Gifts), which render their children as columns; the rest stay simple dropdowns.

## Proposed main menu

Handles are Shopify collection handles, verified present. Structure matches WooCommerce exactly.

| Top level | Children |
|---|---|
| **Bath and Shower** `bath-and-shower` | Bath Bombs `bathbomb` · Body Scrubs `body-scrubs` · Bubble Bars `bubble-bar` · Luxury Bath Oils `luxury-bath-oils` · Shower gels & Jellies `shower-gels` · Shower Moisturisers `shower-moisturisers` · Soap `soap` |
| **Face** `face` | Cleansers & Scrubs `cleansers-scrubs` · Face Masks `face-masks` · Lip Scrubs & Balms `lip-scrubs-balms-face` · Make Up `make-up-face` · Moisturisers `moisturisers` · Oral Care `oral-care` · Shaving `shaving` · Toners `toners` |
| **Body** `body` | Body Lotions & Body Butter `body-lotions` · Deodorants & Dusting Powders `deodorants-powders` · Foot Care `foot-care` · Hand Care `hand-care-body` · Massage Bars `massage-bars` · Sun care `sun-care` |
| **Hair** `hair` | Afro Hair Care `afro-hair-care` · Conditioners `conditioners` · Hair Treatments `hair-treatments` · Henna `henna` · Shampoo `shampoo` · Hair Styling `styling` |
| **Fragrances** `fragrances` | Body Sprays `body-sprays` · Candles `candles` · Glitter Mist `glitter-mist` · Home Fragrance `home-fragrance` · Perfumes `perfumes` · Solid Perfume `solid-perfume` |
| **Gifts** `gifts` | Gifts under 200 QAR `gifts-under-200-qar` · Gifts between 200-500 QAR `gifts-between-200-500-qar` · Gifts over 500 QAR `gifts-over-500-qar` · Knot Wraps `knot-wraps` |
| **Fresh** `fresh` | Fresh Cleansers `fresh-cleansers-2` · Fresh Masks `fresh-masks-2` |
| **Collaborations** `collaborations` | Scooby-Doo! X LUSH `scooby-doo-x-lush` · The Super Mario Galaxy Movie × Lush `the-super-mario-galaxy-movie-x-lush` |
| **New Products** `new-products` | Lunar New Year `lunar-new-year` |
| **Sleep Better** `sleep-better` | Lavender Range/Sleepy `lavender-range-sleepy-2` |
| **Muscle Recovery** `muscle-recovery` | Magnesium Range `magnesium-range` |
| **Lifestyle** `lifestyle` | Apparel `apparel` |
| Best Sellers `best-sellers` | — |
| 5 Star Reviews `5-star-reviews` | — |
| Trending Now `trending-now` | — |
| Lush Party `lush-party` | — |
| Sun Care `sun-care` | — (also appears under Body) |

**Worth Dee's view:** seventeen top-level items is a lot for a header. WooCommerce can afford it in a sidebar; a horizontal mega menu usually reads better with six to eight. A sensible reduction keeps the six large families (Bath and Shower, Face, Body, Hair, Fragrances, Gifts) as mega-menu columns and demotes the merchandising collections (Best Sellers, 5 Star Reviews, Trending Now, New Products, Sleep Better, Muscle Recovery, Lush Party, Lifestyle) to a secondary row, the footer, or promo slots.

## Footer menus

KSA uses four menu handles, and the footer blocks resolve by handle:

| Handle | Heading | Contents | Qatar status |
|---|---|---|---|
| `contact-us` | Customer Service | Consultation Request, Contact Us, Delivery Information, Privacy Policy, Refund Policy | **blocked** — pages and policies do not exist yet |
| `about-lush-menu` | We Are Lush | Who We Are, Our Values, Our Impact, Press Area — external `weare.lush.com` links | **buildable now**, brand-global |
| `footer` | About | Branches, Blogs | **blocked** — Branches page missing |
| `explore-menu` | Explore | not rendered on KSA's live page | check with Dee |

Only `about-lush-menu` can be built today. The rest wait on CMS pages and legal policies at T5 — menu items pointing at 404s help nobody.

## Decisions taken

- **Announcement bar: off.** Configured but disabled, so Bassam can demonstrate switching it on during training. KSA's copy was Saudi-specific anyway ("Spend 350 riyals…").
- **Floating WhatsApp button: not added.** It is disabled on KSA too.
- **Logos: Settings > Brand**, already populated. The header setting is `{{ shop.brand.logo }}`, a dynamic reference, so seasonal swaps happen in the admin with no code change. Campaign and seasonal imagery follows the same rule — Files and theme-editor pickers, never bundled into the theme.
