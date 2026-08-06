# Arabic translation gaps — for the client

Running record of Arabic content that is **missing at source** and cannot be filled by DotAim, kept so it can be raised with Dee's team in one go once theme work is finished (Bassam's instruction, 2026-08-04). Nothing here blocks the build.

Regenerate the numbers any time with:

```
./shopify/themes/i18n/audit-translations.py            # summary
./shopify/themes/i18n/audit-translations.py --detail   # the actual strings
```

## What DotAim has already done

Everything we authored is translated: menus and menu links (100%), theme-editor content, the homepage, footer columns, Lush Values, overlay popups, the Branches page, the three blog articles, and the legal policies. `shopify/themes/i18n/ar.json` is the versioned record.

## What the client needs to supply

As of 2026-08-04:

| Content | Missing Arabic | Why DotAim cannot fill it |
|---|---|---|
| **Products** | **36 published products** (plus 72 drafts) | The WooCommerce source has Arabic for 430 of 538 products. The other 108 were never translated on lush.qa either, so there is nothing to migrate — but **72 of those are drafts**, so the gap that matters before launch is **36 live products**, not 108. These are names, descriptions and SEO text: brand copy that needs Lush's own wording, not ours. List: `migration-tool/var/client-lists/products-without-arabic.csv`. |
| **Product short descriptions** | all 538 | No product has an Arabic short description in the source — the field was never translated for anything. Low impact: the theme shows the full description. |
| **Collections** | 32 of 61 | Same: the Arabic WooCommerce site shows these categories in English too. DotAim has supplied Arabic names for the 8 that appear in navigation, so the menu reads correctly; the collection pages' own descriptions remain. |

## How the client can fill them

Either through **Translate & Adapt** in the Shopify admin (Apps > Translate & Adapt), which shows each product side by side with its Arabic field, or by supplying a spreadsheet of Arabic names and descriptions keyed by SKU, which DotAim can import.

## Option worth raising

Lush KSA (`lush.sa.com`) sells largely the same products and has Arabic for many of them. Matching by SKU and copying across is technically straightforward and would close most of the product gap without anyone retyping. It needs the client's agreement and read access to the KSA store's Admin API.

Two caveats to state plainly if it is put to Dee. It means Qatar's storefront carrying another franchise's marketing copy, which is a brand call rather than a technical one. And at 36 published products it is a smaller job than it once looked — writing 36 Arabic descriptions in-house may simply be easier than negotiating access.

**No longer the same question as the ingredients metafields.** That one was settled on 2026-08-05 in favour of Lush's own ingredient library at `lush.com`, which publishes Arabic directly — so the ingredients feature needs no KSA access at all. See `theme-porting-list.md` §5.

## Not a gap: ingredients

Worth noting because it inverts the usual direction. The Arabic source has **no ingredient content whatsoever**, and the English has it only as off-site links to Lush UK. The new store builds the ingredient encyclopaedia from Lush's own library, which is published in Arabic as well as English — so **Arabic shoppers gain ingredient information the current site never gave them**. Nothing needed from the client.
