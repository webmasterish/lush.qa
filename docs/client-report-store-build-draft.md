# DRAFT: store build report for Dee

**Status: draft for Bassam's review. Not sent to the client.**
Sources: `theme-phase.md`, `store-settings-ledger.md`, `client-data-quality-notes.md`, `translation-gaps-for-client.md`.
Conventions applied: warm and professional, no em-dashes, no technical jargon, no internal tool names.

**Suggested subject:** Lush Qatar Shopify project: store build complete, and what we need to go live

**Suggested recipients:** To Dee. CC Mario (approval authority and the launch decision), Sibin and Nirmal (IT: the domain switch is theirs). Ann optional.

**Timing note:** this is the natural moment to raise the Stage 2 invoice. The milestone it is tied to, completion of data migration and store setup, is met. See `handover-and-launch-plan.md` for the reasoning.

---

## Lush Qatar: the store is built

Hi Dee,

Following the data migration report, here is the second progress report. **The store is now built and complete in both English and Arabic.** Everything below is live on the store today and ready for you to look at.

What remains before launch is not build work. It is a short list of decisions and connections that only your side can make, and they are listed further down.

### What the store looks like now

The storefront follows the same style as the Saudi store, as agreed, with Qatar's own catalogue, navigation and content.

| Area | What is in place |
|---|---|
| Homepage | Hero slideshow, popular categories, four product carousels, campaign banners, blog posts, Lush values and newsletter |
| Navigation | Seven main sections with drop down menus, rebuilt from your existing category structure |
| Product pages | Ingredients, key ingredient cards, how to use and storage sections, related products, product labels |
| Collections | All 61 collections with filtering and sorting |
| Blog | Your existing articles, plus a dedicated ingredients library |
| Other pages | Branches, contact, privacy, refund and terms |
| Languages | English and Arabic throughout, including the checkout |

A few things worth drawing your attention to.

**Product labels are live.** Fifty four products now carry New or Bestseller labels on their tiles, drawn from your existing categories, in both languages. Two more label types are ready to switch on, Limited Edition and Vegan, and both need a decision from you, described below.

**The ingredients feature is built and waiting on content.** Product pages can show a full ingredients list and highlight key ingredients with their own illustrated pages, the same as the Saudi store. Three ingredients are wired up as a working sample. The remaining content is covered below.

**The whole store works in Arabic, including checkout.** This turned out to need more work than expected. Shopify translates a store's own content, but the checkout and system messages are separate and were arriving in English. Those are now translated as well, so an Arabic speaking customer sees Arabic from the homepage through to payment.

### Two things we found and fixed

**Your product descriptions were loading images from the current website.** One hundred and forty five images inside product descriptions were still being pulled from lush.qa rather than from the new store. They look fine today, but the moment the domain points to Shopify they would all have broken at once, across 106 products, on launch day. Those images now live in the new store and no longer depend on the old site.

While doing this we noticed the current website is showing a database error and its pages are not loading. The images were still reachable, so we recovered them, but it is worth your IT team knowing.

**Old website links will keep working.** We have set up 457 redirects, so a customer arriving from Google, a bookmark, or a link in an old newsletter lands on the matching page in the new store rather than an error page. This protects the search rankings the current site has built up.

### What we need from you to go live

These are the remaining items, and each one needs a decision or an action from your side rather than from us.

**1. Payment gateway (the main one)**

The store cannot take orders until a Qatar payment gateway is connected. Shopify Payments is not available in Qatar, so this is a local provider such as QNB, Tap or Telr.

**This step should be completed by your chosen provider together with your finance team, not by us.** It involves your merchant account credentials and banking details, and the safe practice is that those never pass through a third party, including us. We will happily join a call with the provider, advise on the Shopify side, and test the checkout thoroughly once it is connected.

Please allow several weeks for the provider's application and approval process. **This is the single item most likely to determine the launch date**, so it is worth starting now if it has not started already.

**2. Shipping rates and delivery**

We need your delivery charges and any free delivery threshold, for example free delivery over a certain order value. The rate names are set up in both languages and ready for your numbers.

**3. Tax treatment**

Whether prices include tax, and how tax should be shown at checkout. Your finance team will know.

**4. Vegan and Limited Edition product labels**

Limited Edition is ready and currently applies to eleven seasonal products that are not published yet. It switches on when they do.

Vegan is different. Your current website holds no record of which products are vegan, so there is nothing for us to read. If you can supply that list, we will apply the labels.

**5. The ingredients library**

Lush's own global ingredient library at lush.com has the pages for 450 of the 453 ingredients used across your products, in both English and Arabic. Using them would give your product pages the same ingredient experience as the Saudi store, with content written by Lush.

We would like your confirmation that Lush HQ is comfortable with the Qatar store using this content before we bring it across.

**6. Customer notification emails**

Order confirmations, shipping updates and similar emails currently go out in English only, including to Arabic speaking customers. Shopify does not translate these automatically. The Saudi store is in the same position today.

Translating them is a content task rather than a technical one, and your team is best placed to write them in your own voice. We can point you to exactly where they are edited, and we would suggest starting with the four that customers actually receive: order confirmation, shipping confirmation, cancellation and refund.

**7. Google Analytics**

If you would like Google Analytics on the new store, we will need the property details, or we can walk your team through creating one.

**8. The domain switch**

The final step. Nirmal and Sibin will need to point lush.qa at the new store. We will provide the exact settings and be on hand during the switch. We recommend doing this early in the day, on a quieter day of the week, so there is a full working day to watch it.

### Two small items on your current data

Neither affects the new store, and both are for your team's awareness.

**Some Arabic product names came across imprecisely.** The Arabic on the current website was machine translated at some point, and a few names do not say what they should. As an example, the Toners category was translated to a word meaning printer ink. We corrected the clear errors we found, but the Arabic product descriptions themselves are your content, and a native review before launch would be worthwhile.

**A few product photographs are missing.** Three images inside Arabic product descriptions no longer exist anywhere, including on the current site. Those descriptions now show their text without the image. If you have the original photographs we will put them back.

### Proposed next steps

| When | What |
|---|---|
| This week | You and the team review the store and send us any changes |
| This week | Start the payment gateway application if it has not started |
| On your go ahead | We complete the final visual review and testing |
| Once payments are connected | Two hour training session for your team, recorded so you can revisit it |
| Agreed date after training | Domain switch, with us monitoring for 72 hours afterwards |

The store is password protected until launch, so nothing is public. You can browse it exactly as a customer would.

Happy to walk through any of this on a call.

Best regards,
Bassam
