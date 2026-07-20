# DRAFT: data migration report for Dee

**Status: draft for Bassam's review. Not sent to the client.**
Sources: `client-data-quality-notes.md` + `migration-tool report` (2026-07-20).
Conventions applied: warm and professional, no em-dashes, no technical jargon.

**Suggested subject:** Lush Qatar Shopify project: data migration complete (progress report)

**Suggested recipients:** To Dee. CC Mario (approval authority, milestone visibility), Sibin and Nirmal (IT: the backup confirmation and the junk account cleanup are theirs to action). Ann optional if you want the wider brand team in the loop.

**Attachments:** `products-without-arabic.csv` (108 rows) and `junk-registrations.csv` (39 rows), both generated at `migration-tool/var/client-lists/`.

---

## Lush Qatar: data migration complete

Hi Dee,

Following our getting started session on 14 July, here is the first progress report on the Lush Qatar Shopify project. The data migration from the current lush.qa website into the new store is complete, everything has been transferred and checked, and the store is now being kept up to date with your live site until we switch over.

### What was migrated

| Data | Result |
|---|---|
| Product categories | 61 of 61, now collections in Shopify |
| Products | 537 of 538, with images, prices, variants, stock levels and SEO details |
| Customers | 1,915 customer accounts |
| Orders | 3,179 orders with their original order numbers, dates, items, totals and statuses |

A few things worth highlighting:

- **Both languages came across.** Arabic content is in place for 430 products and 53 collections, matching what exists on your current site. English is the primary language with Arabic published alongside it, set up the same way I demonstrated during our session on 14 July.
- **Order history is complete and exact.** Every order kept its original number, date, customer, items and total, and we reconciled the totals against your current site down to the riyal. This included a technical detail worth mentioning: the orders that were imported into WooCommerce from your previous OpenCart system store their amounts in a different way from the orders placed since the current site launched. We detected that and corrected it during the migration, so all totals are accurate.
- **Guest orders are now grouped by customer.** On the current site, purchases made without an account are not linked to anything. In Shopify, each guest email now has its own customer record with their order history attached. That is 1,169 additional customer records, so the store holds 3,084 customer records in total, and it gives your team a much better view of repeat buyers.
- **Everything is published to the online store.** You can browse it all now by logging into the admin, and see how it looks to customers through the store preview. It goes live to the public when we switch the domain over.

### How we verified it

We did not simply move the data and hope for the best. For every type of data we reconciled the number of records on your current site against the number in the new store, and then spot checked individual records field by field, comparing product titles, prices, variant counts, customer details, order totals and order statuses. All checks passed with no mismatches.

Every migrated record also carries a permanent, invisible marker linking it back to its original record on the current site. That means any record can be re-checked at any time, and it gives you a clear audit trail.

### What we found in your current data

Migrating record by record gave us a close look at the data. A few things came up that are worth your attention. None of them are problems with the new store, and most need no action at all.

**1. Evidence of automated attack traffic on the current site**

We found 39 customer accounts in your database that are not real customers. They were created automatically by attack software probing your website's registration form, between November 2022 and April 2025. The email addresses are variations of `testing@example.com` with database attack commands appended, for example strings attempting SQL injection or trying to make the server pause so the attacker can measure its response and find a way in.

These accounts were not migrated, since they are not customers and the addresses are not valid. I am attaching the full list so your team can remove them from WooCommerce. I am flagging this because it is likely connected to the security concerns that led to restricting the site to visitors from Qatar, the UAE and the UK.

The good news for the new store: Shopify manages platform security, patching and protection against this kind of automated probing at their end, so that maintenance burden moves off your team. It also means the new store should not need country restrictions for security reasons, which frees you to sell to a wider audience if you choose.

**2. One product needs a small fix on the current site**

The product "No Way to Say Goodbye" has two size options that were never properly linked to its Size attribute in WooCommerce. Because of that the size choices cannot be read correctly, and it is the only product that did not migrate. It is currently on sale at 285 QAR on your site, and its size selector is likely not working correctly there either, so it is worth fixing regardless of the migration.

It is a two minute correction on the WooCommerce product page. Your team is welcome to do it, or we are happy to take care of it if you give us the go ahead. Once fixed it will move across automatically on the next update.

**3. Arabic content gaps that already exist on your current site**

108 products have no Arabic translation in the current site's database, so they display in English on the Arabic version. Of those, 72 are products currently set to draft, so in practice only 36 published products are affected. I am attaching the full list so your team can decide which ones are worth translating before launch. We also found a small number of Arabic entries containing English text, and 96 Arabic product pages with no English original, which look like leftovers from an older version of the site.

**4. Ingredient lists in Arabic product descriptions**

Some Arabic product descriptions contain ingredient links that were built incorrectly at some point in the past and no longer lead anywhere. We migrated the content exactly as it is rather than altering it. This will be resolved as part of the dedicated ingredients feature we discussed during the session on 14 July, which we will build when we start on the theme, so no action is needed from your side now.

**5. Small housekeeping items, no action needed**

Thirteen records in your order history are empty, with no items and a zero total, so there was nothing to migrate. A small number of orders were placed using an email address different from the account they belong to, one order has a mistyped email address, and a few product images had special characters in their filenames. All of these were handled during the migration and the original information is preserved.

### A note on the current site's performance

Working through your data at volume gave us a clear picture of how the current site performs, and it is worth sharing. In our tests the homepage took around 30 seconds to respond. That is slow enough to cost you sales, since most visitors leave well before that.

Two things are worth saying about the cause. First, your software is not the problem: WordPress, WooCommerce, WPML and Elementor are all running current versions, so the site is being kept properly updated. Second, what we can see points to a combination of server response time and the weight of the page itself, which loads over one megabyte of markup along with around 66 scripts and 50 stylesheets from the theme and page builder. We could not run a full diagnostic because that needs server level access, so this is an observation rather than a conclusion.

The reason this matters less than it sounds: moving to Shopify resolves this side of things entirely. Hosting, performance, and the global content network are all handled by Shopify, so the new store will not carry the current site's speed issues over.

Two related points:

- **Please confirm that regular backups of the current site are running** and that your team can restore from them. This is standard practice before any platform change, and it protects you regardless of the migration.
- **For transparency, everything we did on your WooCommerce site was read only.** We only read data out for the migration. We have not modified, added or deleted anything on your live site, and we will not do so without asking you first.

Worth noting that we completed the migration using the WooCommerce access we were given, without needing the server access we originally requested, so there is nothing blocked on your IT team at this stage.

### Keeping the new store up to date until launch

The new store is not a one time snapshot. From now until we switch over we refresh it from your live site on demand:

- New products, price changes, stock updates and content edits are carried over.
- New orders and new customers are added automatically as they come in.
- Nothing gets duplicated. The system knows exactly which records it has already migrated and only brings across what is new or changed.
- We run a final full synchronisation immediately before the switch, so nothing from your last day of trading is lost.

This means you can keep running your business on the current site exactly as normal while we build out the design and features.

### What happens next

1. **Your admin access.** You have an invitation to the new store admin. Once you accept it you can browse everything described here.
2. **Payment method.** When your finance team is ready, they can add the company card under Settings, then Billing. All Shopify charges go directly to that card, nothing passes through us. The upcoming items are the Be Yours theme licence at 350 USD one time, and the Shopify plan at around 54 USD per month on annual billing.
3. **Design and features.** Once the theme is in place we begin building the storefront to mirror the Saudi store, then move on to the features we agreed: navigation and search, homepage and campaign sections, product badges and the ingredients feature, cart and checkout, WhatsApp notifications and email automation.
4. **Your review.** When the store is built, you and the team walk through it and confirm the data and features before we plan the launch and the domain switch.

Two things to come back to us on when you can: whether you would like us to fix the "No Way to Say Goodbye" product for you, and confirmation that backups of the current site are running.

Best regards,
Bassam
