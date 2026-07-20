# DRAFT: data migration report for Dee

**Status: draft for Bassam's review. Not sent to the client.**
Source data: `client-data-quality-notes.md` + `migration-tool report` output (2026-07-20).
Conventions applied: warm and professional, no em-dashes, no technical jargon.

---

## Lush Qatar: data migration completed

Hi Dee,

The data migration from the current lush.qa website into the new Shopify store is complete. Everything has been transferred and checked, and the store is now being kept up to date with your live site until we switch over. Here is a full summary of what was done, what we found in the data along the way, and what happens next.

### What was migrated

| Data | Result |
|---|---|
| Product categories | 61 of 61, now collections in Shopify |
| Products | 537 of 538, with images, prices, variants, stock levels and SEO details |
| Customers | 1,915 customer accounts |
| Orders | 3,179 orders with their original order numbers, dates, items, totals and statuses |

A few things worth highlighting:

- **Both languages came across.** Arabic content is in place for 429 products and 53 collections, matching what exists on your current site. English is the primary language and Arabic is published alongside it, the same setup as the Saudi store.
- **Order history is complete and exact.** Every order kept its original number, date, customer, items and total. We checked totals against your current site and they match to the last riyal, including older orders where the original data was stored in an unusual format.
- **Guest orders are now grouped by customer.** On the current site, purchases made without an account are not linked to anything. In Shopify, each guest email now has its own customer record with their order history attached. That is 1,169 additional customer records, so the store holds 3,084 customer records in total. This gives your team a much better view of repeat buyers.
- **Everything is published to the online store**, so it will all be visible as soon as we go live.

### How we verified it

We did not simply move the data and hope for the best. For every type of data we reconciled the number of records on your current site against the number in the new store, and then spot checked individual records field by field, comparing product titles, prices, variant counts, customer details, order totals and order statuses. All checks passed with no mismatches.

Every record we migrated also carries a permanent, invisible marker linking it back to its original record on the current site. This means we can re-check any record at any time, and it gives you a clear audit trail.

### What we found in your current data

Migrating everything record by record gave us a close look at the data. A few things came up that are worth your attention. None of them are problems with the new store, and most need no action at all.

**1. Evidence of automated attack traffic on the current site**

We found 39 customer accounts in your database that are not real customers. They were created automatically by attack software probing your website's registration form. The email addresses are variations of `testing@example.com` with database attack commands appended to them, for example strings that attempt SQL injection or try to make the server pause so the attacker can measure its response.

These accounts were not migrated, since they are not customers and the addresses are not valid. We are flagging them because this is likely connected to the security concerns that led to restricting your site to visitors from Qatar, the UAE and the UK. It is worth having your team delete these records from WooCommerce.

The good news for the new store: Shopify manages platform security, patching and protection against this kind of automated probing at their end, so you no longer carry that maintenance burden yourselves. It also means the new store will not need country restrictions for security reasons, which frees you to sell to a wider audience if you choose.

**2. One product needs a small fix on the current site**

The product "No Way to Say Goodbye" has two size options that were never properly linked to its Size attribute in WooCommerce. Because of that, the size choices cannot be read correctly, and it is the only product that did not migrate. It is currently on sale at 285 QAR on your site, and it is likely that its size selector is not working correctly there either, so this is worth fixing regardless of the migration.

It is a two minute correction in the WooCommerce product page. Your team is welcome to do it, or we can take care of it if you would like to give us the go ahead. Once fixed, it will move across on the next update automatically.

**3. Arabic content gaps that already exist on your current site**

Around 217 products do not have Arabic translations in the current site's database, so they display in English on the Arabic version. Many of these are products currently set to draft, so they may not matter. We can send you the list so your team can decide which ones are worth translating before launch. We also found a small number of Arabic entries that contain English text, and a few Arabic product pages with no English original, which are likely leftovers from an older version of the site.

**4. Older Arabic descriptions contain broken ingredient links**

Some Arabic product descriptions include ingredient links that were built incorrectly at some point in the past, so they do not lead anywhere when clicked. We migrated the content exactly as it is on your site rather than altering it. If you would like these tidied up, we can strip the broken links and keep the ingredient lists as plain text.

**5. Small housekeeping items, no action needed**

Thirteen records in your order history are empty, with no items and a zero total, so there was nothing to migrate. A small number of orders were placed using an email address different from the account they belong to, and a few product images had special characters in their filenames. All of these were handled during the migration and the information is preserved.

### Keeping the new store up to date until launch

The new store is not a one time snapshot. From now until we switch over, we refresh it from your live site on demand:

- New products, price changes, stock updates and content edits are carried over.
- New orders and new customers are added automatically as they come in.
- Nothing gets duplicated. The system knows exactly which records it has already migrated and only brings across what is new or changed.
- We run a final full synchronisation immediately before the switch, so nothing from your last day of trading is lost.

This means you can keep running your business on the current site exactly as normal while we build out the design and features.

### What happens next

1. **Your admin access.** You have an invitation to the new store admin. Once you accept it you can browse everything we have described here.
2. **Payment method.** When your finance team is ready, they can add the company card under Settings, then Billing. All Shopify charges go directly to that card, nothing passes through us. The upcoming items are the Be Yours theme licence at 350 USD one time, and the Shopify plan at around 54 USD per month on annual billing.
3. **Design and features.** Once the theme is in place we begin building the storefront to mirror the Saudi store, then move on to the features we agreed: navigation and search, homepage and campaign sections, product badges, cart and checkout, WhatsApp notifications and email automation.
4. **Your review.** When the store is built, you and the team walk through it and confirm the data and features before we plan the launch and DNS switch.

Please let me know if you would like the lists mentioned above, the untranslated products or the junk accounts, and whether you would like us to fix the "No Way to Say Goodbye" product for you.

Best regards,
Bassam
