# Handover and launch plan

Internal. How the Qatar project gets from "built" to "launched and handed over", what each step depends on, and what gets invoiced when. Client-facing wording lives in `client-report-store-build-draft.md`.

## Where the project actually stands

Build is done. What is left is other people's decisions, one QA pass, and the launch mechanics.

| | Status |
|---|---|
| Phases 1 to 4 (discovery, setup, data, theme and features) | **Complete** |
| Phase 5 (testing and QA) | Visual pass against KSA outstanding, Bassam doing it last |
| Phase 6 (training and launch) | Not started, gated on payments |

Nothing in the remaining work is DotAim build effort of any size. The critical path runs through the client.

## The critical path

```
payment gateway application  ──►  gateway connected  ──►  checkout testing  ──►  training  ──►  DNS cutover  ──►  72h monitoring
        (weeks, client)              (client + us)          (us, ~1 day)      (2h, recorded)    (IT + us)
```

Everything else runs alongside and none of it blocks. **The gateway is the only long pole**, so the report leads with it and says plainly that it needs to start now.

## What we are waiting on, and from whom

| Item | Owner | Blocks launch? |
|---|---|---|
| Qatar payment gateway | Client finance + provider | **Yes** |
| Shipping rates, free delivery threshold | Dee | Yes, checkout is incomplete without rates |
| Tax treatment | Client finance | Yes |
| DNS window and execution | Nirmal, Sibin | Yes, it is the launch |
| Vegan product list | Dee | No, labels can be added after |
| Lush HQ sign off on the ingredient library | Dee to HQ | No, feature works with what is wired |
| Notification email Arabic | Client | No, but customers get English receipts until done |
| Google Analytics property | Client | No |
| Native Arabic review of product copy | Client | No |

## Training session

Two hours, recorded, per the original scope. Run it **after** the gateway is connected so the checkout can be demonstrated with something real, and **before** the DNS switch so the team is ready on day one.

Cover, in this order:

1. Orientation: the admin, where things live, how it differs from WordPress
2. Products and collections: creating, editing, images, the two languages, publishing
3. The features we built: product labels, the ingredients library, how to add an ingredient page
4. Homepage and campaigns: swapping hero imagery, banners, seasonal changes without touching code
5. Orders: processing, fulfilment, refunds, customer records
6. Content: pages, blog, navigation menus
7. Discounts and gift cards
8. Reports: what is worth watching in the first weeks
9. Where to get help, and what we cover during the monitoring window

Attendees: Dee and the brand team. Nirmal or Sibin optional and probably only useful for the first section.

The recording plus the demo reference document from 14 July becomes their reference material. Worth extending that document with the Qatar-specific features rather than writing something new.

## Launch sequence

1. **Pre-flight**, the day before. Final checkout test end to end with a real payment method, confirm shipping rates, confirm taxes, confirm notification emails send, confirm the store password is ready to come off.
2. **Cutover**, early in the day, midweek. IT points the domain at Shopify. We remove the store password at the same moment, not before.
3. **Immediately after.** Verify both languages resolve, the redirects fire, checkout completes, analytics records. Place one real order and refund it.
4. **72 hours.** Watch orders, error rates and search console. Fix anything that surfaces.
5. **Close out.** Confirm handover, remove DotAim staff access per the ledger, Stage 3 invoice.

Do not schedule cutover on a Thursday or the day before a public holiday. Qatar's weekend and Al Mana's coverage both matter more than our convenience.

## Invoicing

Per the agreed 50/25/25 schedule in the context document.

| Stage | Trigger | Amount | Status |
|---|---|---|---|
| Stage 1 | Deposit to begin | $1,350 | Paid |
| **Stage 2** | **On completion of data migration and store setup** | **$675** | **Due now** |
| Stage 3 | On launch | $675 | After cutover |

**Stage 2 is defensibly due.** Its trigger is data migration and store setup, both of which are complete: the data landed and was reconciled on 20 July, and the store build finished this week. It is not tied to launch, and launch is now gated on the client's payment gateway rather than on us. Raising it alongside the report is the natural moment, and it also signals that the remaining wait is on their side without having to say so.

Invoice via Stripe as sequence 0003, referencing LUSHQA-0001.

## Risks worth naming now

- **The gateway timeline is not ours to control** and is the whole launch date. Say so in writing now, so a slip is understood as theirs rather than becoming ours by silence.
- **The current site is down** with a database error. If it stays down, the client loses sales until cutover, which is an argument for moving quickly rather than a problem for us. It also means no further data sync is possible from it, so anything added to the old site since the last sync will not come across. Worth confirming the last sync date before cutover.
- **English receipts to Arabic customers** until the notification templates are translated. Named in the report so it is their informed choice.
- **Store password removal is a one way door.** It happens at cutover, not before.
