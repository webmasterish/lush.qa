# Store build report for Dee

**Status: SENT 2026-08-08 15:47 UTC** by Bassam, with his own edits. Kept as the record of what went out. Do not resend.

**Sent as:** subject `Lush.qa Migration to Shopify: Store build and setup complete`. To Dee, cc Mario, Sibin, Nirmal, Ann, `wecarelush@almana.com`, `amfgqatar@almana.com`. Two homepage screenshots attached, English and Arabic.

**Bassam's edits to the text below, worth knowing because they change what the client was actually asked:**

- **The Vegan product list ask was cut.** The labelling system is built and the Vegan label is unused, and nobody has been asked for the list. It will stay unused unless raised at training.
- Cloudflare wording generalised to "for other stores we usually", rather than naming the Saudi and Lebanon builds.
- Final step reworded to "as soon as payments are connected **and tested by provider and your finance team**".
- Newsletter dropped from the homepage bullet; training session no longer described as two hours.
- Numbered lists rather than the bullets below, and the opening line made warmer.

**Invoice:** deliberately not mentioned here. Stage 2 goes separately, drafted at `client-email-stage2-invoice-draft.md`.

**Not mentioned, deliberately:** where the ingredient content could come from. Populating the library is a separate piece of work to be offered after launch, so this email says only that the system is built and demonstrated.

Sources: `theme-phase.md`, `store-settings-ledger.md`, `client-data-quality-notes.md`, `translation-gaps-for-client.md`.

---

## Lush Qatar: the store is built

Hi Dee,

**The store is built, complete in both English and Arabic, and ready for you to look at today.**

You can see it here: **https://lush-qatar.myshopify.com** and the password is **lush2026**. It is password protected until launch, so nothing is public. Once you are through the password you can browse it exactly as a customer would.

We pushed to finish this ahead of schedule for a reason. With lush.qa currently down, every day without a working shop is a day of orders going elsewhere, and the new store is ready to take over as soon as the last few pieces are in place. Most of those pieces now sit on your side, which is why the second half of this email is a list of what we need from you.

### What the store looks like now

The storefront follows the same style as the Saudi store, as agreed, with Qatar's own catalogue, navigation and content.

- **Homepage.** Hero slideshow, popular categories, four product carousels, campaign banners, blog posts, Lush values and newsletter.
- **Navigation.** Seven main sections with drop down menus, rebuilt from your existing category structure.
- **Product pages.** Ingredients, key ingredient cards, how to use and storage sections, related products, product labels.
- **Collections.** All 61 collections, with filtering and sorting.
- **Blog.** Your existing articles, plus a dedicated ingredients library.
- **Other pages.** Branches, contact, privacy, refund and terms.
- **Languages.** English and Arabic throughout, including the checkout.

A few things worth drawing your attention to.

**Product labels are live.** We have built a labelling system for product tiles, where the wording and the colour are set per product, so you can use it however suits the season. It is already applied to 54 products carrying New and Bestseller labels, brought across from the categories on your current website, in both languages. Adding, changing or removing labels is something your team does directly, and we will cover it in the training session.

**The ingredients feature is built and demonstrated.** Product pages can show a full ingredients list and highlight key ingredients with their own illustrated pages, the same as the Saudi store. Three ingredients are wired up end to end as a working example, so you can see exactly how it looks and behaves. Filling out the rest of the library is a content exercise, and one we are happy to talk through with you after launch.

**The whole store works in Arabic, including checkout.** This turned out to need more work than expected. Shopify translates a store's own content, but the checkout and system messages are separate and were arriving in English. Those are now translated as well, so an Arabic speaking customer sees Arabic from the homepage through to payment.

### Two things we found and fixed

**Your product descriptions were loading images from the current website.** 145 images inside product descriptions were still being pulled from lush.qa rather than from the new store. They looked fine, but the moment the domain points to Shopify they would all have broken at once, across 106 products, on launch day. Those images now live in the new store and no longer depend on the old site. We recovered them while the images were still reachable, which was fortunate given the state the current site is in.

**Old website links will keep working.** We have set up 457 redirects, so a customer arriving from Google, a bookmark, or a link in an old newsletter lands on the matching page in the new store rather than an error page. This protects the search rankings the current site has built up.

### What we need from you to go live

These are the remaining items, and each one needs a decision or an action from your side rather than from us.

**1. Payment gateway (the main one)**

The store cannot take orders until a Qatar payment gateway is connected. Shopify Payments is not available in Qatar, so this will be whichever local provider you choose to work with.

**This step should be completed by your chosen provider together with your finance team, not by us.** It involves your merchant account credentials and banking details, and the safe practice is that those never pass through a third party, including us.

**This is the single item most likely to determine the launch date**, so it is worth starting now if it has not started already.

**2. Shipping rates and delivery**

We need your delivery charges and any free delivery threshold, for example free delivery over a certain order value. The rate names are set up in both languages and ready for your numbers.

**3. Tax treatment**

If any tax applies to your prices, we need to know whether prices are shown inclusive of it and how it should appear at checkout. Your finance team will know, and it may well be nothing to do.

**4. Vegan product list**

The labelling system is ready to use, as described above. The one thing we cannot do for you is decide which products are vegan, because your current website holds no record of it and there is nothing for us to read across. If you can supply that list, we will apply the labels.

**5. Customer notification emails**

Order confirmations, shipping updates and similar emails currently go out in English only, including to Arabic speaking customers. Shopify does not translate these automatically. The Saudi store is in the same position today.

Translating them is a content task rather than a technical one, and your team is best placed to write them in your own voice. We can point you to exactly where they are edited, and we would suggest starting with the four that customers actually receive: order confirmation, shipping confirmation, cancellation and refund.

**6. Google Analytics**

If you would like Google Analytics on the new store, we will need the property details, or we can walk your team through creating one.

**7. The domain and DNS**

The final step, and the one that puts the store live.

For the Saudi and Lebanon stores we set up a Cloudflare account for the domain, and Lush HQ pointed the nameservers to it. We would recommend the same approach for Qatar. Our first question is simply who holds the DNS for lush.qa today, because that is not clear to us from the outside. Whoever it is, our recommendation is that the account ends up owned by Nirmal and Sibin, with access delegated to us where it is useful. That way your IT team has direct control of the domain and does not have to wait on anyone else each time a record needs changing.

The switch itself is more than pointing the main address at Shopify. The website records, the customer accounts subdomain, and your email authentication records (SPF, DKIM and DMARC) all need to be handled together, so that email sent from your domain continues to be delivered. We will supply the exact list of records and be on hand during the change. Best done early in the day and midweek, so there is a full working day to watch it settle.

### Two small items on your current data

Neither affects the new store, and both are for your team's awareness.

**Some Arabic product names came across imprecisely.** The Arabic on the current website was machine translated at some point, and a few names do not say what they should. As an example, the Toners category was translated to a word meaning printer ink. We corrected the clear errors we found, but the Arabic product descriptions themselves are your content, and a native review before launch would be worthwhile.

**A few product photographs are missing.** Three images inside Arabic product descriptions no longer exist anywhere, including on the current site. Those descriptions now show their text without the image. If you have the original photographs we will put them back.

### Proposed immediate steps

- Start the payment gateway application now, if it has not started. Everything else can run alongside it.
- Have a look at the store using the link above and send us any changes you want made.
- Send us your delivery charges and any free delivery threshold.
- Let us know who currently controls the DNS for lush.qa, so we can prepare the switch with Nirmal and Sibin.
- As soon as payments are connected, we run the final checks, hold the two hour training session for your team, recorded so you can revisit it, and agree a date for the switch.

The store is finished and waiting. The sooner these move, the sooner lush.qa is trading again.

Happy to walk through any of this on a call.

Best regards,
Bassam
