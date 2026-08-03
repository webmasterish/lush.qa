# KSA theme update — risk assessment

About the **reference store** `lush.sa.com` (`ckdthc-qn.myshopify.com`), not Lush Qatar. Written 2026-08-03 because Bassam wants to update its Be Yours theme and needs to know what breaks. Evidence comes from read-only pulls plus the RoarTheme release notes saved at `shopify/themes/__reference/be-yours_theme_release_notes.html`.

## The headline: do not publish the 8.5.0 copy already in the library

`Updated copy of Updated copy of Be Yours` (#184533385530, **8.5.0**) is **not** an updated version of what is currently live. It descends from the older `Be Yours` (#182010315066, **8.3.3**), not from the live `Updated copy of Be Yours` (#184102060346, **8.4.0**).

Evidence — comparing the migrated `settings_data.json` of all three:

- 8.5.0 shares **80 of 83** setting values with 8.3.3, but only **74 of 83** with the live 8.4.0.
- 8.5.0 carries 8.3.3's stale values verbatim: `social_facebook_link` and `social_instagram_link` still point at **Shopify's demo URLs** (`facebook.com/shopify`, `instagram.com/shopify`), `social_twitter_link` at `twitter.com/shopify`, and the **favicon is empty**.
- The live 8.4.0 has the real ones: `x.com/lushsaudi`, `youtube.com/@lushsaudi`, `pinterest.com/lushsaudi`, the Lush LinkedIn company page, and a proper favicon.

Publishing that 8.5.0 theme would therefore **regress the live store**: favicon gone, three social links pointing at Shopify's own accounts, the LinkedIn link dropped. It also drops five settings the live theme has (`low_inventory_badge_*`, `low_inventory_threshold`, and the `blocks` entry holding a Shopify Forms app block).

The safe path is to run the theme update **from the live 8.4.0**, producing a fresh updated copy that inherits the live settings, and to leave the existing 8.5.0 copy alone or delete it once its origin is confirmed unwanted.

## How far to update

| Target | Released | Risk |
|---|---|---|
| **8.5.0** | Dec 2025 | **Low.** Purely additive plus fixes: new Dual Scroll and Tabbed Collections sections, a Countdown block for the announcement bar, cart discount support. Nothing in the notes changes existing defaults. |
| 8.6.0 / 8.7.0 | — | Not yet reviewed in detail. |
| **9.x** | May–Jul 2026 | **Visual change by design.** 9.0.0 is a major release that "refreshes the default look" — serif heading family, warmer palette, frosted-glass surfaces — and "refined the homepage layout, and section ordering follows a clearer commerce funnel". |

The 9.x line is where care is needed. Defaults only reach a store for settings the merchant never explicitly set, but KSA's `settings_data.json` leaves plenty at defaults (`type_header_font` and `type_body_font` are both stock `sans_serif_n4`), so a default-typography change would land on the storefront. RoarTheme effectively concede this: 9.2.0 adds "a **Heading Size mode with Classic and Auto** options **so existing stores keep their heading sizes stable when updating the theme**" — a compatibility switch that exists because updating does shift sizing.

## The customizations at stake

The live KSA theme carries real DotAim work that a theme update must be verified to preserve. Files present on KSA-live and absent from a vanilla Be Yours:

- `sections/lush-ingredients-cards.liquid` and `snippets/lush-ingredients-list.liquid` — **the ingredients feature**
- `templates/article.ingredient-blog-post.json`
- `locales/ar.json` — Arabic theme strings (Be Yours ships no `ar.json`)
- `templates/page.branches.json`, `page.consultation-request.json`, `page.newsletter-signup.json`
- `templates/index.context.sa.json` — market-contextual homepage
- `config/markets.json`
- `blocks/ai_gen_block_5ca9f34.liquid`

Shopify's update flow replaces stock theme files with the new version's code while migrating settings. Files the theme never shipped are a different case, and whether each survives should be **verified on the updated copy before publishing**, not assumed.

## Recommended sequence

1. Update **from the live 8.4.0**, not from any older copy. Target 8.5.0 first if the goal is safety; treat 9.x as a separate, deliberate redesign decision.
2. On the resulting updated copy, verify: the custom files above are still present, `locales/ar.json` survived, RTL still works on `/ar`, favicon and social links match the live theme, and the ingredients feature renders.
3. Compare the updated copy against the live theme on a preview link before publishing.
4. Keep the live 8.4.0 theme in the library as the rollback.

## Bearing on Lush Qatar

If KSA moves to 9.x, the two stores converge on the same major version and the parity work in `theme-phase.md` gets easier — the 8.4→9.2 transcription gap narrows or disappears. That is an argument for updating KSA, but it is a KSA business decision with its own risk, and Qatar's plan does not depend on it.

**The ingredients feature already exists on KSA** (`lush-ingredients-cards.liquid` + `lush-ingredients-list.liquid`). That is the feature promised to Dee in the 14 July session, so T4 is a port of existing working code rather than a build from scratch — provided it survives whatever update KSA applies.
