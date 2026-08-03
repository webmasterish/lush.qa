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
| Legal policies | Settings > Policies | Refund, privacy, terms, shipping, contact info. Qatar-specific text — needs Dee's sign-off, and Arabic versions | text no, structure yes | todo | DotAim drafts, Dee approves |
| Payments | Settings > Payments | Local Qatar gateway (QNB / Tap / Telr). **Shopify Payments is unavailable in Qatar.** COD. Apple/Google Pay if the gateway supports them | no | todo | client + DotAim |
| Shipping | Settings > Shipping and delivery | Zones, rates, free-shipping threshold, local delivery | reference only | todo | Dee provides rates |
| Taxes | Settings > Taxes and duties | Qatar tax treatment, prices tax-inclusive or not | no | todo | client finance |
| Checkout | Settings > Checkout | Branding (logo, colors, fonts), customer accounts, marketing consent, abandoned-cart timing | yes | todo | DotAim |
| Notifications | Settings > Notifications | Branded order/shipping email templates, sender address, AR versions | yes | todo | DotAim |
| Navigation | Content > Menus | Main menu (mega-menu structure), footer menus. Feeds the theme's mega menu in T2 | yes | todo | DotAim |
| Metafield definitions | Settings > Custom data | Definitions the theme reads: badges (vegan / bestseller / new / limited edition), ingredients. Distinct from the `DotAim ·` migration-namespace definitions already created | yes | todo | DotAim |
| Files | Content > Files | Every image referenced by ported KSA theme settings must be re-uploaded here — `shopify://` file URLs are per-store and will not resolve | yes | todo | DotAim |
| Translations | Translate & Adapt | Theme-editor strings and store content in Arabic. Product/collection AR came through the migration; theme content did not. Theme's own strings live in `locales/*.json` (surface A) | yes | todo | DotAim |
| Markets | Settings > Markets | Qatar primary; confirm whether other regions ship | reference only | todo | Dee |
| Customer accounts | Settings > Customer accounts | Classic vs. new accounts — affects the account templates in T3 | yes | todo | DotAim |
| Analytics | Settings > Customer events / theme | Google Analytics 4 | n/a (Qatar property) | todo | DotAim + client |
| Apps | Apps | Inventory what KSA depends on before installing anything. Any paid app is a client cost and needs approval | audit first | todo | DotAim proposes |
| Domain | Settings > Domains | lush.qa cutover via Cloudflare, coordinated with Nirmal | no | blocked until launch | IT + DotAim |
| Users | Settings > Users | Confirm DotAim staff access post-transfer, and remove it at handover | no | todo | Bassam |

## Notes

- **WhatsApp integration** ($200 line, deferrable) and **email automation** ($300 line) both land here as app + settings work; neither is scheduled yet.
- Anything that costs the client money (apps, paid gateways) is proposed to Dee first and billed directly through Shopify, never through DotAim.
