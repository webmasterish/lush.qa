# Store settings ledger

Surface C from `theme-phase.md`: everything configured in the Shopify admin that has **no file representation** and therefore cannot be versioned in this repo. If a setting is not recorded here, there is no record of it at all — so a change to the admin gets a line here the same day.

Store: `lush-qatar.myshopify.com` (client-owned since 2026-07-28, Shopify/Grow plan).
Mirror benchmark: `lush.sa.com`. Not everything mirrors — payments, shipping, taxes and legal text are Qatar-specific.

Status: `done` · `todo` · `blocked` · `n/a`

**When changing a setting that already had a value, record the previous value in the row.** Surface C has no undo, no history and no git — the ledger line is the only way back.

## Confirmed

| Area | Setting | Value | Date |
|---|---|---|---|
| General | Timezone | (GMT+3) Riyadh — no Qatar entry; GMT+3 equivalent, no DST | 2026-07-12 |
| General | Currency | QAR | — |
| Languages | Published locales | `en` (primary), `ar` | 2026-07-13 |
| General | Branding | copied from lush.sa | 2026-07-13 |
| Plan | Subscription | Shopify (Grow), client card on file | 2026-07-29 |
| Themes | Be Yours license | purchased | 2026-07-29 |

## Open

| Area | Admin path | What's needed | Mirror KSA | Status | Owner |
|---|---|---|---|---|---|
| Legal policies | Settings > Policies | **Privacy, refund and terms written and translated 2026-08-07 (Bassam).** Shipping and contact-information policies are the client's call and are not tracked here. The footer's automatic policy list is switched off, because Shopify does not translate policy titles and it rendered an English duplicate under the Arabic menu links | text no, structure yes | **done as far as they go** | Dee may still want to review the text |
| Payments | Settings > Payments | Local Qatar gateway (QNB / Tap / Telr). **Shopify Payments is unavailable in Qatar.** COD. Apple/Google Pay if the gateway supports them | no | todo | client + DotAim |
| Shipping | Settings > Shipping and delivery | Zones, rates, local delivery. **Rate names renamed to English 2026-08-07 (Bassam) and Arabic registered 2026-08-08**: Standard/قياسي, Express/سريع, International/دولي. **Free-shipping threshold cleared**: it held `USD:500,EUR:475,JPY:65000` with no QAR, so the mini-cart's currency match never succeeded and the progress bar never rendered. Set `QAR:<amount>` once Dee confirms the threshold | reference only | partly done | Dee provides rates |
| Taxes | Settings > Taxes and duties | Qatar tax treatment, prices tax-inclusive or not | no | todo | client finance |
| Checkout | Settings > Checkout | Branding (logo, colors, fonts), customer accounts, marketing consent, abandoned-cart timing | yes | todo | DotAim |
| Notifications | Settings > Notifications | Branded order/shipping email templates, sender address, AR versions | yes | todo | DotAim |
| Navigation | Content > Menus | **Main menu restructured 2026-08-07**: 17 top-level items → 7 families, three levels deep, from `shopify/themes/nav/main-menu.json` (`apply-nav.py --apply`). Be Yours renders each second-level item as a mega-menu column, four per row, so the previous flat shape wrapped onto three rows. Mega menus re-enabled for all seven with menu images off. Footer menus unchanged | yes | **done** | DotAim |
| URL redirects | Settings > Navigation > URL redirects | **457 applied 2026-08-07** from `shopify/themes/redirects/` and spot-checked. Dead product, category and tag URLs are deliberately left to 404 (Bassam); `/about` is deliberately absent, since the client can add that page if they want it | yes | **done** | DotAim |
| Metafield definitions | Settings > Custom data | **Done.** `theme.label`, `theme.label_color`, `custom.ingredients`, `custom.ingredients_cards`, `custom.subtitle`, `custom.category_label`, `custom.how_to_use`, `custom.how_to_store`, plus the article-side ingredient fields. All `PUBLIC_READ`. Distinct from the `DotAim ·` migration-namespace definitions | yes | **done** | DotAim |
| Files | Content > Files | **7 homepage images imported 2026-08-04** via `shopify/themes/files/import-images.py`, and **145 product-description images rehosted** off lush.qa via `rehost-legacy-images.py` (both keep manifests of source and usage). Every image the live storefront actually references now resolves, verified in both locales. The general rule still stands for anything ported later: `shopify://` file URLs are per-store and silently resolve to nothing until the file is re-uploaded here. **Confirm during the visual QA pass** rather than assuming | yes | **done for what is in use** | DotAim |
| Translations | Translate & Adapt | **Done 2026-08-08.** Arabic runs from homepage to payment, checkout included, verified live. Product/collection AR came through the migration; theme-editor content and Shopify's own checkout strings were registered separately. Theme's own strings live in `locales/*.json` (surface A). **Capped at 3,400 keys per resource with ~140 slots of headroom** — check `i18n/reclaim-translation-slots.py` before registering anything new. The one gap left is the notification templates, on the Notifications row | yes | **done** | DotAim |
| Markets | Settings > Markets | Qatar primary; confirm whether other regions ship | reference only | todo | Dee |
| Customer accounts | Settings > Customer accounts | **New customer accounts**, login not required at checkout (confirmed 2026-08-07). The account UI is therefore Shopify-hosted, so the theme's `templates/customers/*` are unused and T3's account-template item is moot — but the 1,222 `customer_accounts.*` strings are Shopify's and need Arabic | yes | **done** | DotAim |
| Analytics | Settings > Customer events / theme | Google Analytics 4 | n/a (Qatar property) | todo | DotAim + client |
| Apps | Apps | Inventory what KSA depends on before installing anything. Any paid app is a client cost and needs approval | audit first | todo | DotAim proposes |
| Domain | Settings > Domains | lush.qa cutover via Cloudflare, coordinated with Nirmal | no | blocked until launch | IT + DotAim |
| Users | Settings > Users | Confirm DotAim staff access post-transfer, and remove it at handover | no | todo | Bassam |

## Theme settings that are overridden in code

Settings whose theme-editor control does nothing, because code forces the value. Recorded here so nobody loses an afternoon to a setting that silently has no effect.

| Setting | Overridden by | Why |
|---|---|---|
| Typography > Heading font | `snippets/dotaim-custom-styles.liquid` points `--font-heading-family` at `--font-lush-handwritten` (`LushHandwritten_Bd`) | Shopify's font picker only offers its own library, so the Lush brand face has to be forced in CSS. Matches KSA. |

## Notes

- **WhatsApp integration** ($200 line, deferrable) and **email automation** ($300 line) both land here as app + settings work; neither is scheduled yet.
- Anything that costs the client money (apps, paid gateways) is proposed to Dee first and billed directly through Shopify, never through DotAim.
