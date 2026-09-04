# Handover and launch plan

Internal. How the Qatar project gets from "built" to "launched and handed over", what each step depends on, and what gets invoiced when. Client-facing wording lives in `client-report-store-build-draft.md`.

## Where the project actually stands

Build is done. What is left is other people's decisions, one QA pass, and the launch mechanics.

**2026-08-08: the store build report went to Dee**, cc Mario, IT, Ann and the two shared Lush Qatar mailboxes. The clock on everything below starts from there. A short WhatsApp to Dee followed, pointing at the email and at the gateway, and deliberately not repeating that the current site is down: that fact is already in the email, in writing, in front of Mario and IT, and repeating it on a personal channel reads as pressure rather than information.

| | Status |
|---|---|
| Phases 1 to 4 (discovery, setup, data, theme and features) | **Complete** |
| Phase 5 (testing and QA) | Visual pass against KSA outstanding, Bassam doing it last |
| Phase 6 (training and launch) | **Launched 2026-08-27. Completion report and final invoice sent 2026-08-30.** Only the training session and close-out access revocation remain |

Nothing in the remaining work is DotAim build effort of any size. The critical path runs through the client.

**Update, 2026-08-30: the store is live and trading.** DNS cut over on 2026-08-27 and the password came off at cutover as planned, confirmed by real customer orders from that morning onward (#4207, 2026-08-27 10:36, is the first). The monitoring window is therefore running, and post-launch support has started in earnest: the care team (Kyaw, `wecarelush@almana.com`) now raises customer-facing issues to Dee, who forwards them to Bassam. The first was the delivery-charge incident on 2026-08-30, written up in `store-settings-ledger.md`. Still outstanding from the launch sequence: the training session and close-out access revocation.

**Update, 2026-08-30 evening: handover is done on paper.** The project completion report went to Dee, cc Mario, Sibin, Nirmal, Ann, `wecarelush@almana.com` and `amfgqatar@almana.com`, as its own new thread, email only with no attachments. The Stage 3 invoice (LUSHQA-0004, $675) went separately the same day to Dee, cc Mario and Jeffrey, PDF attached with the hosted Stripe card link inline. Both recorded at `client-report-completion-draft.md` and `client-email-stage3-invoice-draft.md`. **Training is next: Dee asked for Wednesday 2026-09-02 but has not given a time**, and the report asks her for one along with what she wants covered. Access revocation waits on the client saying they are ready, which the report explicitly invited.

## Dee is away until the end of August

Told to Bassam on WhatsApp 2026-08-09: she is on vacation in the UK and back at the end of the month, though she is plainly still reading email. She has asked **Nirmal, Ann and Kyaw** to review the store and report back to her.

**The gateway is going to Finance, not waiting for her return.** Her WhatsApp said she would look at "the payment gateway fee" herself; her email an hour later said she "will also discuss with Finance regarding our payment gateway". The email is the one to believe. Read "fee" as the *cost* of a gateway — setup and per-transaction charges — rather than a slip: she says herself she is not technical and routes anything financial to Finance. If she is waiting to understand the cost before starting, that is a hidden blocker, and the useful move is to offer Finance help evaluating providers rather than to repeat the ask. **It has now been made twice, in the email and on WhatsApp. Do not make it a third time.**

**Escalation, if it stalls.** Mario phoned Bassam unprompted on Thursday 2026-08-06, friendly, just to check nothing was outstanding on access (he was still thinking of the server access, long since dropped). Bassam said nothing was needed, that the build was ahead of schedule, and mentioned in passing that the old site is down; **Mario did not comment on that**. The call is worth remembering for two reasons: there is a warm direct line to the approver if the gateway stalls, and Mario already knows about the outage without treating it as a crisis, so raising it again adds nothing.

**Kyaw** is probably the data-entry and customer-support person; he attended the earlier meetings. His address may be `wecarelush@almana.com`, which is on the thread. Unconfirmed, so weight his feedback accordingly and confirm when he surfaces.

**Reply to threads as the client leaves them.** Dee's 2026-08-09 email dropped Nirmal and Ann from the copy list while keeping Mario, Sibin and the two shared mailboxes. **Do not add them back** (Bassam's call, and the right one): we cannot know whether that was her mail client or her intent, and re-adding people to a list the client curated presumes on how they run their own team. It is also consistent with what she said she would do, which is collect the team's feedback herself and come back. Feedback flows through Dee, not through the thread.

**The gateway offer is held, not dropped.** Offering to help Finance evaluate providers is genuinely useful, but making it in the same breath as her saying she will discuss it with Finance reads as impatience, and she is on holiday. The offer does not expire. Make it when Finance actually surfaces, where it lands as responsiveness rather than eagerness.

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
| Vegan product list | Dee, **but not yet asked** | No, labels can be added after |
| Ingredient library content | Nobody, deliberately | No, feature works with what is wired |
| Notification email Arabic | Client | No, but customers get English receipts until done |
| Native Arabic review of product copy | Client | No |

## Training session

**Update, 2026-09-04: scheduled and prepared.** Monday **2026-09-07, 10:30 to 11:30 Qatar time**, Google Meet, organised by Dee from her personal Gmail with **13 invited**. The full plan, timings and demo checklist live in **`docs/training-2026-09-07-run-sheet.md`**; the deck and a re-runnable store check are in `shopify/__/2026-09-07/`.

Three things below are now out of date and the run sheet supersedes them:

- **One hour, not two.** Dee set a 60 minute slot with a hard stop, so the agenda below does not fit. The run sheet cuts discounts, gift cards and the blog, and adds analytics and team access instead, because Mario is attending and the original list is aimed only at operators.
- **It is happening after launch, not before.** The store went live 2026-08-27 and has been trading for over a week, so this is no longer preparation. Two live findings now drive the session: 23 of 25 orders have never been marked fulfilled, and 121 in-stock products sit behind a Draft flag.
- **Recording is the client's to do.** The original scope said recorded; the completion report handed that to them, and the run sheet only reminds Dee.

Attendee note: **Sibin is not invited** and he owns the six outstanding email CNAMEs, so that item cannot be closed in the room.

Original scope, kept for reference. Two hours, recorded. Run it **after** the gateway is connected so the checkout can be demonstrated with something real, and **before** the DNS switch so the team is ready on day one.

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

### Access to revoke at close-out

Do this once the store is stable and the handover document has gone out, not before: the token
and the staff account are still how we fix things during the monitoring window.

| What | Where | Why it waits |
|---|---|---|
| Shopify offline Admin API token | Shopify admin, uninstall/revoke the custom app | The real guard on the migration tool. `target.locked` in the project config is a deliberate speed bump; a revoked credential is absolute. Still needed if any translation or metafield work comes up before handover |
| `dev@dotaim.com` from staff order notifications | Settings > Notifications > Staff notifications | Named to the client in the launch email as ours, for the monitoring period, removed at handover. Removing it is therefore a promise kept, not housekeeping |
| DotAim admin account, also `dev@dotaim.com` | Settings > Users, per `store-settings-ledger.md` | Last, after everything else is confirmed. Same address as the notification recipient above, so removing one does not remove the other |
| `WOO_STORE_URL` in `config/projects/lush-qatar.env` | Local only | `https://lush.qa` now resolves to Shopify, so an extract would send the WooCommerce key and secret to a third party. Clear the value. The Woo REST key itself can no longer be revoked, the site is unreachable, so it dies with the server |

**Back up `var/migration-tool.sqlite` before any of this.** 45MB, gitignored, one machine. Now that
lush.qa points at Shopify and the origin IP was never captured, it is the only surviving copy of the
WooCommerce source data: 538 products, 1,955 customers and 3,192 orders with full payloads. It is
also the only place the one unmigrated product's variation data still exists.

Do not schedule cutover on a Thursday or the day before a public holiday. Qatar's weekend and Al Mana's coverage both matter more than our convenience.

## Invoicing

Per the agreed 50/25/25 schedule in the context document.

| Stage | Trigger | Amount | Status |
|---|---|---|---|
| Stage 1 | Deposit to begin | $1,350 | Paid |
| Stage 2 | On completion of data migration and store setup | $675 | **Paid 2026-08-24** (LUSHQA-0003) |
| **Stage 3** | **On launch** | **$675** | **Invoiced and sent 2026-08-30** (LUSHQA-0004). Awaiting payment |

**Both later stages are settled or sent.** Stage 2's trigger was data migration and store setup, met 2026-08-08; it was invoiced 08-09, resent on request 08-23 and paid 08-24. Stage 3's trigger is launch, met 2026-08-27, invoiced and sent 08-30 alongside the completion report.

**What makes these get paid, worth repeating on the next project:** the invoice goes as its own message rather than inside the report, so good news is not delivered attached to a bill; it goes to Dee with Mario and Jeffrey copied; and the hosted Stripe card link sits in the body, not just in the attached PDF. Stage 2 was paid the day after Dee received that link, on her own card.

## Risks worth naming now

- **The gateway timeline is not ours to control** and is the whole launch date. Say so in writing now, so a slip is understood as theirs rather than becoming ours by silence.
- **The current site is down** with a database error. If it stays down, the client loses sales until cutover, which is an argument for moving quickly rather than a problem for us. It also means no further data sync is possible from it, so anything added to the old site since the last sync will not come across. Worth confirming the last sync date before cutover.
- **English receipts to Arabic customers** until the notification templates are translated. Named in the report so it is their informed choice.
- **The ingredient library stays at 3 ingredients** and the report does not say where the other 450 could come from. Populating it is a separate paid piece of work to be offered after launch, so the store build report demonstrates the feature and stops there. Do not raise HQ sign off until there is a scope and a price attached.
- **Store password removal is a one way door.** It happens at cutover, not before.
