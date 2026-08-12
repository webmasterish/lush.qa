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
| Legal policies | Settings > Policies | **Privacy, refund and terms written and translated 2026-08-07 (Bassam).** Shipping and contact-information policies are the client's call and are not tracked here. The footer's automatic policy list is switched off, because Shopify does not translate policy titles and it rendered an English duplicate under the Arabic menu links. **Corrected 2026-08-12** via `shopify/themes/policies/update-policies-2026-08-12.py`, after Ann asked for the customer care number to change: the number was also wrong in the Arabic terms and the English privacy policy, and the terms still quoted pre-Shopify delivery charges (QAR 15 Doha / QAR 22 outside) and a delivery time that differed between the two languages. All now match the approved rates. **Arabic phone numbers are written without spaces** (`+97444874265`) so bidi cannot split and reorder them inside RTL text | text no, structure yes | **done as far as they go** | Dee may still want to review the text |
| Payments | Settings > Payments | Local Qatar gateway (QNB / Tap / Telr). **Shopify Payments is unavailable in Qatar.** Apple/Google Pay if the gateway supports them. **Cash on delivery proposed 2026-08-12** and it matters: it is a manual payment method needing no gateway, so it would remove the only hard launch blocker and leave DNS as the last one. Kyaw confirmed they already do cash *and* card on delivery, the driver carrying the machine. **Ann asked to confirm internally first, so it is not approved and was deliberately kept out of the group email.** If it goes ahead: orders arrive unpaid and are marked paid by hand, card-on-delivery happens outside Shopify entirely, the terms line "we will only accept credit or debit cards" needs rewording, and the English-only order confirmation becomes the customer's only record | no | **awaiting Ann** | client + DotAim |
| Shipping | Settings > Shipping and delivery | **Rates set and approved 2026-08-12.** Domestic Qatar zone, one rate for the whole country because Shopify has no per-city rates: `Free` on orders **QAR 300 and up**, `Standard` **QAR 20** below that, both 1 to 2 business days. Ann approved the figures by email (she raised the threshold from the 250 discussed on the call). Rate names were renamed to English 2026-08-07 and the Arabic registered 2026-08-08: Standard/قياسي, Express/سريع, International/دولي | reference only | **done** | DotAim |
| Taxes | Settings > Taxes and duties | **Confirmed and set 2026-08-12.** Ann confirmed no tax applies in Qatar, so all three "Include sales tax…" options are unchecked and product pages no longer render a tax line. Still worth one line from Finance in writing before launch | no | **done** | confirmed by Ann |
| Checkout | Settings > Checkout | Branding (logo, colors, fonts), customer accounts, marketing consent, abandoned-cart timing | yes | todo | DotAim |
| Notifications | Settings > Notifications | Branded order/shipping email templates, sender address, AR versions | yes | todo | DotAim |
| Navigation | Content > Menus | **Main menu restructured 2026-08-07**: 17 top-level items → 7 families, three levels deep, from `shopify/themes/nav/main-menu.json` (`apply-nav.py --apply`). Be Yours renders each second-level item as a mega-menu column, four per row, so the previous flat shape wrapped onto three rows. Mega menus re-enabled for all seven with menu images off. Footer menus unchanged | yes | **done** | DotAim |
| URL redirects | Settings > Navigation > URL redirects | **457 applied 2026-08-07** from `shopify/themes/redirects/` and spot-checked. Dead product, category and tag URLs are deliberately left to 404 (Bassam); `/about` is deliberately absent, since the client can add that page if they want it | yes | **done** | DotAim |
| Metafield definitions | Settings > Custom data | **Done.** `theme.label`, `theme.label_color`, `custom.ingredients`, `custom.ingredients_cards`, `custom.subtitle`, `custom.category_label`, `custom.how_to_use`, `custom.how_to_store`, plus the article-side ingredient fields. All `PUBLIC_READ`. Distinct from the `DotAim ·` migration-namespace definitions. **`custom.category_label` populated 2026-08-11**: 531 products, EN + AR, from `shopify/themes/category-labels/` | yes | **done** | DotAim |
| Files | Content > Files | **7 homepage images imported 2026-08-04** via `shopify/themes/files/import-images.py`, and **145 product-description images rehosted** off lush.qa via `rehost-legacy-images.py` (both keep manifests of source and usage). Every image the live storefront actually references now resolves, verified in both locales. The general rule still stands for anything ported later: `shopify://` file URLs are per-store and silently resolve to nothing until the file is re-uploaded here. **Confirm during the visual QA pass** rather than assuming | yes | **done for what is in use** | DotAim |
| Translations | Translate & Adapt | **Done 2026-08-08.** Arabic runs from homepage to payment, checkout included, verified live. Product/collection AR came through the migration; theme-editor content and Shopify's own checkout strings were registered separately. Theme's own strings live in `locales/*.json` (surface A). **Capped at 3,400 keys per resource with ~140 slots of headroom** — check `i18n/reclaim-translation-slots.py` before registering anything new. The one gap left is the notification templates, on the Notifications row | yes | **done** | DotAim |
| Markets | Settings > Markets | Qatar primary; confirm whether other regions ship | reference only | todo | Dee |
| Customer accounts | Settings > Customer accounts | **New customer accounts**, login not required at checkout (confirmed 2026-08-07). The account UI is therefore Shopify-hosted, so the theme's `templates/customers/*` are unused and T3's account-template item is moot — but the 1,222 `customer_accounts.*` strings are Shopify's and need Arabic | yes | **done** | DotAim |
| Pages | Content > Pages | **Branches rebuilt 2026-08-11.** Five stores, EN + AR, live and verified in both locales. Note the page's `main-page` section is **disabled**, so `shopify/themes/pages/branches.json` is not what renders: the page is the `multicolumn` section in `templates/page.branches.json`, one card per branch. **Cards rebuilt by Bassam in the editor the same day**: store photograph and real phone number on all five, phone above address, and the repeated email address lifted out of every card into one `rich-text` section below the grid. Arabic re-registered to match. The rich-text section also carries a heading and a button block kept deliberately as examples for the client, both set not to display. Only **opening hours** are still outstanding, and they were deliberately never guessed, since every public source published mall hours rather than Lush's own | structure yes | **live; hours outstanding** | DotAim + Ann |
| Overlay group | Customize > overlay group | **WhatsApp button added 2026-08-11**, `dotaim-whatsapp-button`, number `97466572759`, enabled. Verified live: bottom right on English, bottom left on Arabic, aria-label translated. The other three overlay sections (popup, cookie banner, age verifier) stay disabled | KSA has one, disabled | **done** | DotAim |
| Analytics | Settings > Customer events / theme | **Dropped 2026-08-11.** Client agreed on the call to rely on Shopify's own reports rather than add Google Analytics | n/a | **n/a** | closed |
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
