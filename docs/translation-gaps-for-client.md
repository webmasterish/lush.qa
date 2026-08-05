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
| **Products** | ~755 strings across the catalogue | The WooCommerce source has Arabic for 429 of 538 products. The rest were never translated on lush.qa either, so there is nothing to migrate. These are product names, descriptions and SEO text — brand copy that needs Lush's own wording, not ours. |
| **Collections** | 32 of 61 | Same: the Arabic WooCommerce site shows these categories in English too. DotAim has supplied Arabic names for the 8 that appear in navigation, so the menu reads correctly; the collection pages' own descriptions remain. |

## How the client can fill them

Either through **Translate & Adapt** in the Shopify admin (Apps > Translate & Adapt), which shows each product side by side with its Arabic field, or by supplying a spreadsheet of Arabic names and descriptions keyed by SKU, which DotAim can import.

## Option worth raising

Lush KSA (`lush.sa.com`) sells largely the same products and has Arabic for many of them. Matching by SKU and copying across is technically straightforward and would close most of the product gap without anyone retyping. It needs the client's agreement and read access to the KSA store's Admin API, and it is the same question as the ingredients metafields in `theme-porting-list.md` §5.
