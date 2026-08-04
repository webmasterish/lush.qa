# Navigation plan — proposed Qatar menus

Menus are **surface C** (Content > Menus): store data with no file representation, so this doc is the only record until they exist. The header's mega menu and all four footer columns read from them, which makes this the gating item for finishing the header and footer.

Derived 2026-08-04 by reading KSA's live navigation off `lush.sa.com` (42 items, 40 collection links) and mapping it onto Qatar's 61 migrated collections.

## The decision to make first

KSA's menu and Qatar's catalogue are not the same shape. A literal mirror would **omit Qatar's five largest collections**:

| Qatar collection | Products | In KSA's menu? |
|---|---|---|
| Bath and Shower | 181 | not as a single entry |
| New Products | 162 | no |
| 5 Star Reviews | 50 | no |
| Lifestyle | 38 | no |
| Knot Wraps | 28 | no |

Meanwhile KSA's menu points at seasonal collections Qatar does not have (Mother's Day, Eid Al Adha Gift Ideas, Father's Day, Lush x Sanrio) and one category Qatar lacks entirely (Eye Pads).

So "mirror the Saudi store" cannot be read literally for navigation. **Recommendation: mirror the structure and visual treatment, populate it from Qatar's own catalogue.** A customer landing on a menu that hides the 181-product Bath and Shower range is worse served than one seeing a menu shaped like Saudi's but stocked with what Qatar sells. Worth Dee confirming, since it is the one place we would knowingly diverge.

## Proposed header menu

Structure follows KSA. Handles are Qatar's. Items marked **new** have no KSA counterpart and are proposed on catalogue size.

| KSA item | Qatar collection | Handle |
|---|---|---|
| Best Sellers | Best Sellers | `best-sellers` |
| — | **New Products** *(new, 162 products)* | `new-products` |
| **Face** | Face | `face` |
| · Cleansers & Exfoliators | Cleansers & Scrubs | `cleansers-scrubs` |
| · Face Masks | Face Masks | `face-masks` |
| · Eye Pads | *no Qatar equivalent — drop* | — |
| · Moisturisers & Eye Creams | Moisturisers | `moisturisers` |
| · Lips | Lip Scrubs & Balms | `lip-scrubs-balms-face` |
| · Toners | Toners | `toners` |
| · — | **Fresh Masks / Fresh Cleansers** *(new)* | `fresh-masks-2`, `fresh-cleansers-2` |
| **Body Care** | Body | `body` |
| · Body Lotion | Body Lotions & Body Butter | `body-lotions` |
| · Hand Care | Hand Care | `hand-care-body` |
| · Foot Care | Foot Care | `foot-care` |
| · Shaving Creams | Shaving | `shaving` |
| · Deodorant & Dusting Powder | Deodorants & Dusting Powders | `deodorants-powders` |
| · Massage Bars | Massage Bars | `massage-bars` |
| · — | **Body Scrubs** *(new)* | `body-scrubs` |
| **Hair Care** | Hair | `hair` |
| · Shampoo | Shampoo | `shampoo` |
| · Conditioner | Conditioners | `conditioners` |
| · Hair Treatment | Hair Treatments | `hair-treatments` |
| · Hair Styling | Hair Styling | `styling` |
| · Henna Hair Dye | Henna | `henna` |
| · — | **Afro Hair Care** *(new)* | `afro-hair-care` |
| **Bath** | Bath and Shower | `bath-and-shower` |
| · Bath Bombs | Bath Bombs | `bathbomb` |
| · Bubble Bars | Bubble Bars | `bubble-bar` |
| · — | **Luxury Bath Oils** *(new)* | `luxury-bath-oils` |
| **Shower** | *(under Bath and Shower)* | — |
| · Shower Gels | Shower gels & Jellies | `shower-gels` |
| · Shower Jellies | *(same collection as above)* | — |
| · Body Scrubs & Conditioner | Shower Moisturisers | `shower-moisturisers` |
| Handmade Soaps | Soap | `soap` |
| **Fragrances** | Fragrances | `fragrances` |
| · Body Sprays | Body Sprays | `body-sprays` |
| · Perfumes | Perfumes | `perfumes` |
| · Candles | Candles | `candles` |
| · — | **Solid Perfume, Home Fragrance** *(new)* | `solid-perfume`, `home-fragrance` |
| **Gifts** | Gifts | `gifts` |
| · — | **Under 200 QAR / 200–500 QAR / Over 500 QAR** *(new, Qatar-specific)* | `gifts-under-200-qar`, `gifts-between-200-500-qar`, `gifts-over-500-qar` |
| · — | **Knot Wraps** *(new, 28 products)* | `knot-wraps` |
| Make Up | Make Up | `make-up-face` |
| Lush Party | Lush Party | `lush-party` |
| **Limited Edition** | Collaborations | `collaborations` |
| · Mother's Day / Eid / Father's Day | *no Qatar equivalent* | — |
| · The Super Mario Galaxy Movie x Lush | The Super Mario Galaxy Movie × Lush | `the-super-mario-galaxy-movie-x-lush` |
| · Lush x Sanrio | Scooby-Doo! X LUSH | `scooby-doo-x-lush` |
| · — | **Lunar New Year** *(new)* | `lunar-new-year` |

Not placed anywhere yet, worth Dee's view: `5-star-reviews` (50), `lifestyle` (38), `sleep-better`, `lavender-range-sleepy-2`, `magnesium-range`, `muscle-recovery`, `oral-care`, `fresh`, `trending-now`, `glitter-mist`, `apparel`, `sun-care`.

## Footer menus

KSA uses four, and Qatar needs the same four handles for the footer blocks to resolve:

| Menu handle | KSA heading | Contents on KSA | Qatar status |
|---|---|---|---|
| `contact-us` | Customer Service | Consultation Request, Contact Us, Delivery Information, Privacy Policy, Refund Policy | **blocked** — pages and policies do not exist yet |
| `about-lush-menu` | We Are Lush | Who We Are, Our Values, Our Impact, Press Area — all external `weare.lush.com` links | **portable now**, links are brand-global |
| `footer` | About | Branches, Blogs | **blocked** — Branches page missing |
| `explore-menu` | Explore | *(not rendered on the live page)* | check with Dee |

Only `about-lush-menu` can be built today. The rest wait on the CMS pages and legal policies at T5, which is the honest sequencing: building menu items that point at 404s helps nobody.

## Also blocked on assets

- **Logo files.** KSA's header references `shopify://shop_images/transparent_en_…` and a white variant for the transparent header. Those URLs are per-store. Qatar needs its own logo and white logo uploaded to Content > Files.
- **Announcement bar copy.** KSA's reads *"Spend 350 riyals and enjoy free delivery, shipping takes from 5-7 days"*. Qatar needs its own free-shipping threshold in QAR and its own delivery window — a question for Dee — plus an Arabic version.
