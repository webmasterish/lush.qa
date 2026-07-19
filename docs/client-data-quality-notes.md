# Source data quality notes — to review with Dee

Running list of data issues found in the lush.qa WooCommerce data during migration. These are **source content issues, not migration defects**: the tool migrates content as-is (fidelity first). Collected here so we can walk Dee through them at the client QA pass (Phase 5) and agree what, if anything, they want cleaned up — content cleanup would be a separate task from migration.

Keep appending as new findings surface. Client-facing phrasing note: warm, no em-dashes, frame as "found in the current site's data".

| # | Found | Issue | Scale | Impact on new store | Suggested handling |
|---|---|---|---|---|---|
| 1 | 2026-07-19 | Arabic product descriptions contain malformed ingredient "links" from the old site: URLs made of Arabic text (e.g. `http://مستخلص الكاراجينان.../`) that resolve nowhere. Likely from the original OpenCart era. Example: Sea Spray (سي سبراي). | Many AR descriptions (exact count TBD during full QA) | Links render but lead nowhere when clicked | Ask if they want the ingredient lists kept as plain text (strip dead links); could be scripted during cleanup |
| 2 | 2026-07-19 | Products with no Arabic translation: the English content shows on the Arabic site. | 217 of 538 products (also 8 of 61 categories) | Arabic storefront shows English text for these | Share the list; client decides which to translate (they may be inactive/draft anyway — 219 products are drafts) |
| 3 | 2026-07-19 | Orphan Arabic records: Arabic products/categories with no English original (mostly drafts). These cannot be migrated as translations and will not exist in the new store. | ~94 products, small number of categories | Not present in Shopify | Share the list; likely obsolete content, confirm nothing needed is lost |
| 4 | 2026-07-19 | Duplicate Arabic translations: some products/categories have two Arabic versions linked to the same English original (e.g. two "Fresh Cleansers" Arabic categories). The tool deterministically uses the newest. | ~109 products, a few categories | Only the newest AR version migrates | Informational; confirm the newest is the right one |
| 5 | 2026-07-19 | Some "Arabic" records contain English text (saved as Arabic but never translated). | Several categories, some products | Arabic storefront shows English for these | Same as #2: translation cleanup list |
| 6 | 2026-07-19 | Old orders (2020 era, from the site's earlier OpenCart migration) store inconsistent line-item amounts. The tool detects and corrects this per order, and order totals match exactly. | 2020-era orders | None — handled by the tool; affected orders carry a `source_line_semantics` marker | Informational only, no action needed |
| 7 | 2026-07-19 | 14% of products have no SKU. | ~75 of 538 products | Fine for migration (linked by ID); SKUs are good practice for inventory ops | Suggest assigning SKUs post-launch as ops hygiene |
| 8 | 2026-07-19 | Trashed products are excluded by design; a few historical order lines reference them and import as unlinked line items (name and price preserved). | 4 trashed products | Historical orders keep totals and item names, without product links | Informational only |
