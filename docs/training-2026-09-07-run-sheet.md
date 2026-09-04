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

Verified against the live store on 2026-09-03. Re-run `shopify/__/2026-09-07/check.sh` before the session.

### 1. 23 of 25 orders since launch are still unfulfilled

Every order is Cash on Delivery, so "Payment pending" is normal and expected. **Unfulfilled is not.** Orders from 27 August are still sitting unfulfilled 8 days later. Only 2 have ever been moved to In progress.

The customer-facing consequence is the part that matters: until an order is marked fulfilled, Shopify never sends the shipping confirmation email. So 23 customers have paid nothing, heard nothing, and have no idea their order is being handled.

This is almost certainly a process gap rather than a system fault. The team is likely picking and delivering from WhatsApp or the store, and nobody has been shown that Shopify needs telling. That makes it a training problem, which is exactly what this session is for.

### 2. 121 products are in stock but set to Draft

Draft means invisible to customers and impossible to buy. There are 4,767 units sitting behind that flag, including Lemongrass (495 units), Ro's Argan (480) and Snow Fairy (93), which is one of Lush's best known products.

The mirror image also holds: 144 products are Active but out of stock, so they show as sold out. Only 166 of 536 products are both Active and in stock.

This traces straight back to `wecarelush@`'s email of 23 August, "most of the items are currently out of stock ... I am unable to edit or update the ...". Somebody set products to Draft as a way of hiding out-of-stock items, and they were never set back when stock arrived.

Handle this carefully. Do not present it as a mistake anyone made. Present it as the single highest value thing they can do this week, because it is.

## Run sheet

### 10:30, Welcome and what has changed since July, 5 min

Purpose: reset the room. Half of them were not at the July session and the store was not live then.

- The store has been live since 27 August at 12:40, 8 days.
- 23 real customer orders, QAR 10,495, average order value QAR 456, largest single order QAR 1,425.
- Steady 2 to 3 orders a day, no drop-off after the launch bump.
- Say plainly: today is hands-on, everything shown is their live store, and questions are welcome throughout rather than saved to the end.

Have the Analytics dashboard open in a tab and read the visitor and session numbers live. The API token cannot pull them (no `read_reports` scope), so read them in the admin on the morning.

### 10:35, Orders, 15 min

The centre of the session. Do it in the live admin, not on slides.

1. Orders list. Filter, search, saved views, what each status column means.
2. Open a real unfulfilled order. Walk the anatomy: customer, items, delivery address, delivery charge, payment status.
3. **Explain COD.** Payment shows Pending until money is collected. Show where to mark it Paid after delivery, and why that matters for their sales reports.
4. **Fulfil an order end to end.** This is the moment the session exists for. Mark as fulfilled, what the customer receives, tracking if they use it.
5. Show what the customer sees. Pull up the shipping confirmation email template so they understand what marking fulfilled actually triggers.
6. Cancelling and refunding, briefly.

Then land the point: there are 23 orders waiting. Offer to walk through clearing the backlog together, or to stay after the call and do it with whoever handles fulfilment.

**Duplicate order numbers, mention here.** Orders #4213, #4217 and #4219 each exist twice, once as a July migrated order and once as a new one. This is not a fault, it is the migrated history and the new counter overlapping. 299 of the next 300 order numbers will do the same. When searching, check the date and whether the source is "web". See the fix under Recommendations below.

### 10:50, Products and inventory, 15 min

1. Find and edit a product. Title, description, images, price, stock.
2. **Active versus Draft versus Archived.** The most important five minutes of the session. Active means customers see it, Draft means nobody does.
3. Show the 121 in-stock draft products in their own admin, using a filter they can recreate: Products, filter Status = Draft, sort by inventory. Let them see Lemongrass sitting there with 495 units.
4. Show how to bulk-select and set status to Active, so fixing 121 products is a two minute job and not a two day one.
5. **Stock levels and the correct way to hide a sold-out item.** They do not need Draft for this. Show "Continue selling when out of stock" being off, which makes Shopify show Sold out automatically and bring the product back on its own when stock is added. This is the habit change that stops the problem recurring.
6. **The physical product checkbox.** Tie back to 30 August. One unticked box on 11 products stopped delivery charges applying. It is now correct on all 769 variants. Show them where it is so they know not to touch it when creating new products.
7. Collections, briefly, and how a product reaches a collection.

### 11:05, Content and the storefront, 10 min

They have already proved they can do this, so pitch it as confirmation rather than instruction.

1. Theme editor, live preview, desktop and mobile toggle. Credit them for the Halloween slider they built within hours of launch, including the separate mobile image.
2. Homepage sections, reordering, the slider specifically.
3. Pages and the Branches page. **Opening hours are still blank** and are theirs to fill. Show exactly where.
4. Saving versus publishing, and how to preview without going live.
5. Arabic. Show where translations are edited and note that 36 published products still have no Arabic description.

### 11:15, Questions and what is open on their side, 10 min

Open the floor first, and let it run. If it goes quiet, use the open items list below as prompts.

Read out what is theirs, briefly, without dwelling:

- Branch opening hours, Ann and Dee.
- Arabic for 36 published products.
- Product 9026 "No Way to Say Goodbye", still missing, needs creating by hand with two sizes. **Note:** the "No Way To Say Goodbye" already in the store at QAR 75 is a different product, so do not let anyone conclude it is done.
- 6 email DNS records with IT. Sibin is not on this call, so this needs Nirmal or Dee to carry it. Until they are added, customer emails still send from a Shopify address rather than `wecarelush@almana.com`.

### 11:25, Ongoing support, 5 min

Keep it short and unpushy, and only after everything else has landed. By this point they will have seen 23 unfulfilled orders and 121 hidden products, so the case makes itself.

One or two sentences: the support options are in the original proposal, happy to talk it through separately with Dee. Do not quote pricing to the whole room.

Close by recommending they keep a recording. Recording is theirs to do, not ours.

## Recommendations to raise

**Set an order number prefix.** Settings > General > Order ID, add a prefix such as `QA`. New orders become QA4232 onward and stop colliding with migrated history. Two minute change, permanently removes the duplicate-number confusion. Their decision, and it only affects new orders.

**Clear the fulfilment backlog this week**, and agree who owns it day to day.

**Set the 121 in-stock draft products to Active**, then stop using Draft to hide sold-out items.

**Set up Google Search Console, under a new Gmail account created for Lush Qatar.** Not a personal address and not a DotAim one, so the property is owned by the brand from day one and survives any staff change. Three attendees are already on personal Gmail addresses, which is the pattern worth avoiding here.

Search Console is not analytics, and this does not reopen the Google Analytics decision of 11 August, which stands. It reports how the site appears in Google search: which queries bring people in, which pages Google has indexed, and any crawl or coverage errors. That last part is the reason to do it now rather than later. The domain changed platform on 27 August, every URL changed shape, and Google is still recrawling. Search Console is the only place that will show whether the old WooCommerce URLs are redirecting cleanly or quietly dropping out of the index.

Verification is a one time step, either a DNS TXT record through IT or a meta tag in the theme. Raise it as a recommendation, not a deliverable. If they want it, it is a separate small piece of work.

## Anticipated questions

| Question | Answer |
| --- | --- |
| Why do all our orders say Payment pending? | They are Cash on Delivery. Pending is correct until you collect the money and mark it Paid. |
| Do customers get an email when they order? | Yes, an order confirmation immediately. But the shipping confirmation only goes out when you mark the order fulfilled, which is why the 23 waiting orders matter. |
| Why are our emails coming from a Shopify address? | 6 DNS records are still with IT. Once added, they send from `wecarelush@almana.com`. Replies already reach you either way. |
| Why does the same order number appear twice? | Migrated history and the new counter overlap. Check the date and the source. An order ID prefix fixes it going forward. |
| Why is a product not showing on the website? | Almost always status is Draft rather than Active. Sometimes it is not in the right collection. |
| How do we hide something that is out of stock? | You do not need to. Leave it Active with stock at 0 and Shopify shows Sold out, then brings it back automatically when you add stock. |
| Can we change prices in bulk? | Yes, select products in the list and use bulk edit. |
| Who can access the admin, and can we add staff? | Settings > Users. Dee controls this. Permissions can be limited per person. |
| What happened with the delivery charge? | 11 products had the physical product box unticked, so Shopify did not think they needed delivering. Fixed on 30 August. All 769 variants verified correct, and every order since has charged correctly. |
| Is our old website data safe? | Yes. 61 collections, 536 products, 3,111 customers and 3,179 historical orders are all in Shopify, with the content as of 3 August. |
| Can we see how many people visit the site? | Yes, Analytics. Show it live. |

## Do before the session

- [ ] Re-run `shopify/__/2026-09-07/check.sh` on Monday morning and refresh every number in the deck.
- [ ] Read Analytics in the admin for sessions, visitors and conversion rate. The API cannot fetch these.
- [ ] Ask Dee whether all 13 attendees have staff accounts.
- [ ] Have tabs pre-opened: Orders list, one unfulfilled order, Products filtered to Draft sorted by inventory, Analytics dashboard, theme editor, Branches page.
- [ ] Decide whether to offer clearing the fulfilment backlog live or straight after the call.
- [ ] Check whether Dee wants the session recorded, and remind her it is theirs to record.

## Materials

All untracked, in `shopify/__/2026-09-07/`:

| File | What it is |
| --- | --- |
| `lush-training-deck.html` | The deck, openable straight in a browser. Arrow keys page between the 11 boards. Same content as the private artifact, kept locally so the session does not depend on being online or logged in. |
| `check.sh` | The read-only store check. Re-run it Monday morning and it reprints every number in the deck. |
| `orders.jsonl`, `products.jsonl`, `variants.jsonl`, `migrated.jsonl`, `mig_nums.txt` | The captured 2026-09-03 data the figures were read from. Overwritten on the next run, so the current copies are the audit trail for the numbers quoted above. |

The artifact version of the deck is at `https://claude.ai/code/artifact/3914c366-f39b-4866-a785-0d0fe5e60d23`. It is private and has not been shared with anyone.

## Verified store state, 2026-09-03

| | |
| --- | --- |
| Live since | 2026-08-27 12:40 Qatar |
| Orders since launch | 25 total, 23 real plus 2 team test orders |
| Revenue | QAR 10,495, AOV QAR 456, largest QAR 1,425 |
| Delivery fees collected | QAR 180 |
| Payment method | Cash on Delivery, 25 of 25 |
| Fulfilment | 23 unfulfilled, 2 in progress, 0 fulfilled |
| Delivery charge correctness | Correct on every order since the 30 Aug fix |
| Products | 536 total, 310 active, 226 draft |
| In stock but hidden | 121 products, 4,767 units |
| Active but out of stock | 144 |
| Variants requiring shipping | 769 of 769, all correct |
| Pumpkin Spice SKU 65311 | Fixed, now a physical product |
| Product 9026 | Still missing |
| Collections | 61 |
| Customers | 3,111 |
| Total orders on file | 3,204, reconciles as 3,179 migrated plus 25 new |
