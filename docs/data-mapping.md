# WooCommerce → Shopify data mapping

The migration scripts in `shopify/migration_from_woocommerce/` implement this mapping. Source is WooCommerce (WordPress) at `lush.qa`; target is the Shopify dev store `lush-qatar.myshopify.com`. The migration is done **in-house** (no third-party migration tools). Scope baseline: up to 500 products / 5,000 customers / 5,000 orders — flag if actual volumes exceed this.

The site is bilingual (Arabic/English), mirroring the Lush KSA store; capture translations for every translatable entity.

## Products

| WooCommerce | Shopify | Notes |
|---|---|---|
| Name | Product title | |
| Description | Body (HTML) | |
| Slug | Handle | Preserve for URL/redirect mapping |
| Featured image / thumbnail | Product image (position 1) | |
| Gallery images | Product images (2…n) | |
| Regular price | Variant price | |
| Sale price | Variant compare-at / price | Sale = price; regular = compare-at |
| Category | Collection + product type | See Categories → Collections |
| SKU | Variant SKU | |
| Stock quantity | Inventory quantity | |
| Manage stock flag | Inventory tracking | |
| Brand / manufacturer | Vendor (or metafield) | |
| Weight & dimensions | Variant weight; dimensions → metafields | Shopify has no native dimensions |
| Attributes | Options / variants | |
| Tags | Tags | |
| Variations | Variants | Map attribute combinations |
| Publish status | Status (active/draft/archived) | |
| Meta title / description | SEO title / description | |

## Categories → Collections

| WooCommerce | Shopify | Notes |
|---|---|---|
| Name | Collection title | Manual (custom) collections unless a rule fits |
| Description | Collection description | |
| Slug | Handle | Preserve for redirects |
| Thumbnail | Collection image | |
| Meta title / description | SEO title / description | |

## Customers

| WooCommerce | Shopify | Notes |
|---|---|---|
| Email | Email | Dedup key |
| First / last name | First / last name | |
| Company | Address company | |
| Address 1 & 2, city, postcode, country/region, state | Address | |
| Phone | Phone | E.164 for Qatar (+974) |

> Passwords do not migrate. Decide whether to trigger Shopify account-invite/reset flow at cutover.

## Orders

| WooCommerce | Shopify | Notes |
|---|---|---|
| Order number | Name / order number | Preserve original number where possible |
| Notes | Note | |
| Total | Total | |
| Date | Processed-at | Historical orders imported as-is |
| Status | Financial + fulfillment status | Map Woo statuses to Shopify pair |
| Customer | Customer | Link by email |
| Tax, discount, shipping | Tax / discount / shipping lines | |
| Currency | Currency | QAR |
| Payment method | Gateway / payment reference | Historical/reference only |
| Billing / shipping address | Billing / shipping address | |

### Order line items

| WooCommerce | Shopify | Notes |
|---|---|---|
| Product name | Line item title | |
| Price | Line item price | |
| Quantity | Quantity | |
| SKU | SKU | Link to migrated variant where possible |

## CMS pages

| WooCommerce/WordPress | Shopify | Notes |
|---|---|---|
| Title | Page title | |
| URL key / slug | Handle | Preserve for redirects |
| Status | Published/hidden | |
| Meta | SEO title / description | |
| Content | Body (HTML) | |

## Blog

| WordPress | Shopify | Notes |
|---|---|---|
| Title | Article title | Under a Shopify blog |
| Content | Body (HTML) | |
| Author | Author | |
| Featured image | Article image | |
| Slug | Handle | Preserve for redirects |
| Status | Published/hidden | |
| Category / tags | Blog / tags | |
| Meta | SEO title / description | |

## URL redirects (SEO preservation)

- Map **all** existing WooCommerce URLs (products, categories, pages, blog) to their Shopify equivalents.
- Create **301 redirects** in Shopify for every changed path.
- Preserve handles wherever possible to minimize redirects.
