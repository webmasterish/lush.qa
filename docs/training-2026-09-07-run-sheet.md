# Training run sheet, Monday 2026-09-07

**Session:** LUSH QATAR Digital, Shopify Training
**When:** Mon 7 Sep 2026, 10:30 to 11:30 Qatar time (GMT+3). 60 minutes, hard stop.
**Where:** https://meet.google.com/cri-awun-nmd
**Organiser:** Dee, from her personal address `moradekebabayale@gmail.com`

Dee's brief, verbatim:

> The Shopify training is more for Bassam to take us through the basic steps on navigating the new LUSH Qatar website interface, and to answer any questions.

She did not answer the "what would you like me to focus on" question from the completion report, so the brief is open. This run sheet fills it from what the store data actually shows.

## Attendees, 13 invited

| Accepted | Not yet responded |
| --- | --- |
| Dee (organiser), Ann (Brand), Nirmal (IT), Mario (GM), `wecarelush@`, `yhen21.lush@gmail`, `concepcion051791@gmail`, Bassam | MOQ, Doha, DFC, Villaggio, `moradeke_ogunbiyi@almana`, `winston46dh@gmail` |

Two things to note. **Sibin is not invited**, and he owns the 6 outstanding email CNAMEs, so that item cannot be closed in this room. And three attendees are on personal Gmail addresses, which are most likely new store staff with no Shopify login yet.

**Do before Monday:** ask Dee whether everyone attending has a staff account. Settings > Users. A training session where half the room cannot log in is a wasted hour.

## The two findings that should shape the session

Verified against the live store on **2026-09-06 22:27 UTC**. Re-run `shopify/__/2026-09-07/check.sh` if anything needs confirming on the morning. The 2026-09-03 capture is preserved in `shopify/__/2026-09-07/capture-2026-09-03/`.

### 1. Fulfilment started, then stopped. 24 of 35 orders are still waiting

**This changed between 3 and 6 September and it changes the tone of the session.** On 3 September not a single order had ever been fulfilled. As of 6 September, **11 are fulfilled** and **6 are marked Paid**, so somebody has been shown, or worked it out, and is doing it correctly.

The pattern by order date is the useful part:

| Dates | Orders | Fulfilled |
| --- | --- | --- |
| 27 to 30 Aug | 12 | 10, plus 2 in progress |
| 31 Aug to 6 Sep | 23 | 1 |

So the first two days were cleared properly and then it lapsed. 24 orders are still not fulfilled, the oldest from 31 August, and until an order is fulfilled Shopify never sends the shipping confirmation, so those customers have heard nothing since ordering.

**Do not present this as a failure.** Lead with the fact that they already did it right, then ask what got in the way after 31 August. That question is likely to surface the real process gap, which is what the session is for. The aim is to make the first two days the normal pattern.

### 2. 139 products are in stock but set to Draft, and it is growing

Draft means invisible to customers and impossible to buy. There are **5,549 units** sitting behind that flag, including Lemongrass (495 units), Ro's Argan (480), Breath of Fresh Air (197) and Eau Roma Water (197).

**It got worse over the week, not better:** 121 products and 4,767 units on 3 September, 139 and 5,549 on 6 September. New stock is arriving and going straight behind the draft flag, which confirms this is an ongoing habit rather than a one-off backlog.

The mirror image also holds: 127 products are Active but out of stock, so they show as sold out. Only 147 of 538 products are both Active and in stock.

This traces straight back to `wecarelush@`'s email of 23 August, "most of the items are currently out of stock ... I am unable to edit or update the ...". Somebody set products to Draft as a way of hiding out-of-stock items, and they were never set back when stock arrived.

Handle this carefully. Do not present it as a mistake anyone made. Present it as the single highest value thing they can do this week, because it is.

## Run sheet

### 10:30, Welcome and what has changed since July, 5 min

Purpose: reset the room. Half of them were not at the July session and the store was not live then.

- The store has been live since 27 August at 12:40, 11 days.
- 35 real customer orders, QAR 15,447, average order value QAR 441, largest single order QAR 1,425.
- Steady 2 to 6 orders a day, no drop-off after the launch bump. 5 September was the joint busiest day since launch.
- Say plainly: today is hands-on, everything shown is their live store, and questions are welcome throughout rather than saved to the end.
- **Ask about recording here, in the first minute, not at the end.** It is theirs to record, and a reminder in the closing slide is useless because by then the session is over. Removed from the deck's last board for that reason.

Have the Analytics dashboard open in a tab and read the visitor and session numbers live. The API token cannot pull them (no `read_reports` scope), so read them in the admin on the morning.

### 10:35, Orders, 15 min

The centre of the session. Do it in the live admin, not on slides.

1. Orders list. Filter, search, saved views, what each status column means.
2. Open a real unfulfilled order. Walk the anatomy: customer, items, delivery address, delivery charge, payment status.
3. **Explain COD.** Payment shows Pending until money is collected. Show where to mark it Paid after delivery, and why that matters for their sales reports.
4. **Fulfil an order end to end.** This is the moment the session exists for. Mark as fulfilled, what the customer receives, tracking if they use it.
5. Show what the customer sees. Pull up the shipping confirmation email template so they understand what marking fulfilled actually triggers.
6. Cancelling and refunding, briefly.

Then land the point: 11 are done, 24 are waiting. Credit the 11 first. Offer to walk through clearing the rest together, or to stay after the call and do it with whoever handles fulfilment.

**Duplicate order numbers, mention here.** This is worse than the 3 September note said. It is not three orders: **every one of the 35 live orders, #4207 through #4243, already exists as a migrated order too.** The migrated range is #2587 to #18862 and the new counter started inside it, so the overlap is total. 299 of the next 300 numbers will collide as well. This is not a fault, it is the two sequences sharing a range. When searching, check the date and whether the source is "web". See the fix under Recommendations below.

Note for the room: #4218 and #4219 are the two internal test orders, so do not use them as examples.

### 10:50, Products and inventory, 12 min

1. Find and edit a product. Title, description, images, price, stock.
2. **Active versus Draft versus Archived.** The most important five minutes of the session. Active means customers see it, Draft means nobody does.
3. Show the 139 in-stock draft products in their own admin, using a filter they can recreate: Products, filter Status = Draft, sort by inventory. Let them see Lemongrass sitting there with 495 units.
4. Show how to bulk-select and set status to Active, so fixing 139 products is a two minute job and not a two day one.
5. **Stock levels and the correct way to hide a sold-out item.** They do not need Draft for this. Show "Continue selling when out of stock" being off, which makes Shopify show Sold out automatically and bring the product back on its own when stock is added. This is the habit change that stops the problem recurring.
6. **The physical product checkbox.** Tie back to 30 August. One unticked box on 11 products stopped delivery charges applying. It is now correct on all 771 variants. Show them where it is so they know not to touch it when creating new products.
7. Collections, briefly, and how a product reaches a collection.
8. **The third case: online but sold only in the shop.** See below. Deck board 06 covers it.

#### The in-store-only case, and a correction worth having straight

Bassam raised this as a case the team will hit: a product they want visible on the website but only sold in the branches. Draft hides it completely, Active makes it buyable, so neither fits.

**Checked, and Qatar does not have this.** The mechanism exists in the KSA theme only:

- `__reference/ksa-8.4.0-live/` implements it in `snippets/card-product.liquid`, `sections/main-product.liquid` and `sections/main-product-modal.liquid`. A product in a collection with the handle `only-in-stores` keeps its page, gains an "In store only" badge taken from the collection title, has its add-to-cart removed, and is exempted from the sold-out treatment.
- The Qatar theme (`shopify/themes/be-yours/`, Be Yours **9.2.0**, against KSA's 8.4.0) contains no reference to `only_in_stores`.
- The live Qatar store has **no collection with the handle `only-in-stores`**, so even if the theme code were there it would do nothing.

The deck therefore presents it as a KSA capability that Qatar does not have, and stops there. It does not offer to build it, price it, or imply it is coming. If they say they want it, that is a scoping conversation for afterwards, not a promise made in the room.

### 11:02, Analytics, 8 min

Added because management is in the room. Mario and Dee care how the store is performing, not how to fulfil an order, and without this the whole hour is aimed at the operators.

1. Where it lives: Analytics in the left menu. Dashboard, Reports, Live view.
2. Read the real numbers off the dashboard live. Sessions, visitors, conversion rate, average order value, top products.
3. Explain each one in plain words. Sessions counts visits, not people. Conversion rate is the share of visits ending in an order, and is the single most useful number they have.
4. Sessions by traffic source and by device. Device split matters here, and it justifies the mobile slider work they already did.
5. Live view if there is anyone on the site. It lands better than any chart.

**No figures are printed in the deck for this section, deliberately.** The API token has no `read_reports` scope, so these cannot be pulled ahead of time, and a slide with stale numbers is worse than none. Open the dashboard and read them.

Two connections worth making out loud, because they tie the management view to the operator view:

- Conversion rate should improve once the 139 hidden products come back, since roughly a quarter of the catalogue is currently unreachable.
- Repeat purchase reflects whether customers hear from you after ordering, which is exactly what marking orders fulfilled controls.

### 11:10, Settings and team access, 8 min

Two parts. A fast tour so they know where things are, then the one decision worth making.

1. Store details, payments and checkout, delivery, notifications, policies. Show where, not how. Nothing here needs changing in the session.
2. Notifications is worth a pause: it is where the shipping confirmation template lives, which connects back to the fulfilment section.
3. **Users.** Open Settings > Users and look at the list together.

**The access problem.** Every account currently has full access: any product, every order, all customer data, payment settings, and the ability to add or remove other people. Fine for three trusted people, a lot of exposure across thirteen, and it makes an accident impossible to trace.

Shopify handles this with roles assigned per user, and roles stack if somebody wears two hats. There are predefined roles to start from, so this is not a build. The deck proposes a starting shape: full access for Dee and Mario, a brand and merchandising role, an orders and fulfilment role, and view only.

Frame it as Dee's decision to make after the call, not something to change live. Nobody should lose access mid-session.

> ⚠️ **Verify before Monday.** The claim that everyone has full access came from Bassam, not from the API. `staffMembers` needs a `read_users` scope the token does not have, so it could not be checked. Open Settings > Users and confirm before saying it in the room.

### 11:18, Content and the storefront, 5 min

Cut from 10 minutes to make room for analytics and access. They have already proved they can do this, so pitch it as confirmation rather than instruction. **This is the section to drop first if the session runs long.**

1. Theme editor, live preview, desktop and mobile toggle. Credit them for the Halloween slider they built within hours of launch, including the separate mobile image.
2. Homepage sections, reordering, the slider specifically.
3. Pages and the Branches page. **Opening hours are still blank** and are theirs to fill. Show exactly where.
4. Saving versus publishing, and how to preview without going live.
5. Arabic. Show where translations are edited and note that 36 published products still have no Arabic description.

### 11:23, Questions and what is open on their side, 7 min

Open the floor first, and let it run. If it goes quiet, use the open items list below as prompts. The ongoing-support mention now lives inside this block rather than as its own slot: one or two sentences, after everything else has landed, and no pricing to the room.

Read out what is theirs, briefly, without dwelling:

- Branch opening hours, Ann and Dee.
- Arabic for 36 published products.
- Product 9026 "No Way to Say Goodbye", still missing, needs creating by hand with two sizes. **Note:** the "No Way To Say Goodbye" already in the store at QAR 75 is a different product, so do not let anyone conclude it is done.
- 6 email DNS records with IT. Sibin is not on this call, so this needs Nirmal or Dee to carry it. Until they are added, customer emails still send from a Shopify address rather than `wecarelush@almana.com`.

## Recommendations to raise

**Set an order number prefix.** Settings > General > Order ID, add a prefix such as `QA`. New orders become QA4244 onward and stop colliding with migrated history. Two minute change, permanently removes the duplicate-number confusion. Their decision, and it only affects new orders.

**Clear the fulfilment backlog this week**, and agree who owns it day to day.

**Set the 139 in-stock draft products to Active**, then stop using Draft to hide sold-out items. Worth stressing that this list grew by 18 products in three days, so the habit matters more than the one-off cleanup.

**Set up Google Search Console, under a new Gmail account created for Lush Qatar.** Not a personal address and not a DotAim one, so the property is owned by the brand from day one and survives any staff change. Three attendees are already on personal Gmail addresses, which is the pattern worth avoiding here.

Search Console is not analytics, and this does not reopen the Google Analytics decision of 11 August, which stands. It reports how the site appears in Google search: which queries bring people in, which pages Google has indexed, and any crawl or coverage errors. That last part is the reason to do it now rather than later. The domain changed platform on 27 August, every URL changed shape, and Google is still recrawling. Search Console is the only place that will show whether the old WooCommerce URLs are redirecting cleanly or quietly dropping out of the index.

Verification is a one time step, either a DNS TXT record through IT or a meta tag in the theme. Raise it as a recommendation, not a deliverable. If they want it, it is a separate small piece of work.

## Anticipated questions

| Question | Answer |
| --- | --- |
| Why do all our orders say Payment pending? | They are Cash on Delivery. Pending is correct until you collect the money and mark it Paid. |
| Do customers get an email when they order? | Yes, an order confirmation immediately. But the shipping confirmation only goes out when you mark the order fulfilled, which is why the 24 waiting orders matter. |
| Why are our emails coming from a Shopify address? | 6 DNS records are still with IT. Once added, they send from `wecarelush@almana.com`. Replies already reach you either way. |
| Why does the same order number appear twice? | Migrated history and the new counter overlap. Check the date and the source. An order ID prefix fixes it going forward. |
| Why is a product not showing on the website? | Almost always status is Draft rather than Active. Sometimes it is not in the right collection. |
| How do we hide something that is out of stock? | You do not need to. Leave it Active with stock at 0 and Shopify shows Sold out, then brings it back automatically when you add stock. |
| Can we change prices in bulk? | Yes, select products in the list and use bulk edit. |
| Who can access the admin, and can we add staff? | Settings > Users. Dee controls this. Permissions can be limited per person. |
| What happened with the delivery charge? | 11 products had the physical product box unticked, so Shopify did not think they needed delivering. Fixed on 30 August. All 771 variants verified correct, and every order since has charged correctly. |
| Is our old website data safe? | Yes. 61 collections, 3,111 customers and 3,179 historical orders are all in Shopify, with the content as of 3 August. The catalogue is now 538 products, since the team has been adding. |
| Can we see how many people visit the site? | Yes, Analytics. Show it live. |
| Can we stop some staff seeing orders or customer data? | Yes. Settings > Users, assign each person a role with only the permissions they need. Roles stack if somebody wears two hats. |
| Can we show a product online but only sell it in the shop? | Not on this store today. The Saudi site has it, built as an "Only in stores" collection that hides the buy button. Qatar would need it added. |
| Why is there no Google Analytics? | You decided on 11 August to rely on Shopify's own reports, which cover sessions, sources, devices and conversion. Nothing was lost. |

## Do before the session

- [ ] Re-run `shopify/__/2026-09-07/check.sh` on Monday morning and refresh every number in the deck.
- [ ] Read Analytics in the admin for sessions, visitors and conversion rate. The API cannot fetch these.
- [ ] Ask Dee whether all 13 attendees have staff accounts.
- [ ] Have tabs pre-opened: Orders list, one unfulfilled order, Products filtered to Draft sorted by inventory, Analytics dashboard, theme editor, Branches page.
- [ ] Decide whether to offer clearing the fulfilment backlog live or straight after the call.
- [ ] **Confirm on Settings > Users that everyone really does have full access** before saying so in the room. The API could not verify it (`read_users` scope missing).
- [ ] Read Analytics once on the morning so the numbers are in your head before you screen-share them.
- [ ] Check whether Dee wants the session recorded, and remind her it is theirs to record.
- [ ] Regenerate the PDF if any figure changes: see Materials below.

## Materials

All untracked, in `shopify/__/2026-09-07/`:

| File | What it is |
| --- | --- |
| `lush-training-deck.html` | The deck, openable straight in a browser. Arrow keys page between the 11 boards. Same content as the private artifact, kept locally so the session does not depend on being online or logged in. |
| `lush-training-deck.pdf` | 14 pages, one board per A4 landscape sheet. This is the shareable copy. |
| `check.sh` | The read-only store check. Re-run it Monday morning and it reprints every number in the deck. |
| `orders.jsonl`, `products.jsonl`, `variants.jsonl`, `migrated.jsonl`, `mig_nums.txt` | The captured 2026-09-06 data the figures were read from. **`check.sh` overwrites these on every run**, so copy them aside before re-running if the current numbers still need to be provable. |
| `capture-2026-09-03/` | The 2026-09-03 capture, kept so the week-on-week movement in the state table can be checked. |

To rebuild the PDF after editing the HTML:

```
cd shopify/__/2026-09-07
google-chrome --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer \
  --virtual-time-budget=20000 --run-all-compositor-stages-before-draw \
  --print-to-pdf=lush-training-deck.pdf "file://$PWD/lush-training-deck.html"
pdfinfo lush-training-deck.pdf | grep Pages   # expect 14
```

If the page count is not 14, a board has outgrown its sheet. The print rules live in the single `@media print` block at the end of the stylesheet, and the levers that matter most are `.board` padding and the shared `margin-top` on `.stats, .agenda, .owners, figure, .cols, ol.steps, table`.

The artifact version of the deck is at `https://claude.ai/code/artifact/3914c366-f39b-4866-a785-0d0fe5e60d23`, kept in sync with the local file. It is private and has not been shared with anyone.

## Verified store state, 2026-09-06

Captured 2026-09-06 22:27 UTC. The 2026-09-03 figures are kept in `shopify/__/2026-09-07/capture-2026-09-03/` for comparison.

| | 2026-09-03 | 2026-09-06 |
| --- | --- | --- |
| Live since | 2026-08-27 12:40 Qatar | same |
| Real customer orders | 23 | **35** |
| Revenue | QAR 10,495 | **QAR 15,447** |
| Average order value | QAR 456 | **QAR 441** |
| Largest order | QAR 1,425 | same |
| Delivery fees collected | QAR 180 | **QAR 260** |
| Payment method | Cash on delivery, all | same |
| Marked Paid | 0 | **6**, plus 1 partially |
| Fulfilled | 0 | **11**, plus 2 in progress and 1 partial |
| Not fulfilled | 23 | **24** |
| Delivery charge correctness | correct since 30 Aug fix | still correct, no new cases |
| Products | 536 | **538** |
| Active | 310 | **274** |
| Draft | 226 | **264** |
| In stock but hidden | 121 products, 4,767 units | **139 products, 5,549 units** |
| Active but out of stock | 144 | **127** |
| Active and in stock | 166 | **147** |
| Variants requiring shipping | 769 of 769 | **771 of 771**, still all correct |
| Product 9026 | missing | still missing, one variant only |
| Collections | 61 | same |
| Customers | 3,111 | same |
| Live order numbers | #4207 to #4232 | **#4207 to #4243**, every one colliding with migrated history |

Two movements matter for the session. **Fulfilment started and then lapsed** after 31 August, which is the single most useful thing to ask about. And the **hidden-stock problem grew** by 18 products and 782 units in three days, so it is an active habit rather than a backlog.
