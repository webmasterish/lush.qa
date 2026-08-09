# DRAFT: Stage 2 invoice email

**Status: draft for Bassam. Not sent, and not in Gmail.** The Gmail connector on this machine has read scope only, so the draft could not be created for you. Paste the body below into a new Gmail message.

**Before sending:**
1. Issue the Stripe invoice as **LUSHQA-0003**, $675, referencing LUSHQA-0001.
2. Attach `DotAim_Invoice_LUSHQA-0003.pdf`.
3. Replace `[PASTE STRIPE CARD LINK HERE]` with the hosted card link.

**To:** Dee (`moradeke_ogunbiyi@almana.com`)
**Cc:** Mario (`mario_faluh@almana.com`), **Jeffrey Flores (`jeffrey_flores@almana.com`)**

Jeffrey is the senior accountant and the only finance contact Bassam has dealt with directly: he handled the Shopify payment and the overcharge Bassam resolved for them. `kumarraju_beera` and `kumaran_ponnaiah` appeared once on the data-migration thread, about paying **Shopify**, not DotAim, and were never on an invoice email. Do not copy them.

Dee stays on the To line because she is the contact and the account holder. Jeffrey is copied because she is on vacation until the end of August and the invoice should not wait three weeks for her.

**Stripe delivery: Dee only.** The Stripe invoice goes to Dee as the customer contact, which is what finalises it as sent rather than leaving it a draft. **Jeffrey is deliberately not added to the Stripe customer record** (Bassam's call): the PDF is attached to our own email anyway, the Stripe CC is a persistent setting that would silently pull him into every future Stripe mail including Stage 3, and the client never asked for him to be on it. Copying him on our email is a judgement we can make; wiring him into their billing records is not.

*(For reference if it is ever wanted: Stripe's additional recipients live on the customer record, not the invoice. Dashboard > customer detail page > edit details > Billing information > unselect "Same as account email", which exposes a comma-separated "To" line and an "Add more recipients" link for CCs.)*

**Subject:** Lush.qa Migration to Shopify: Stage 2 invoice (LUSHQA-0003)

**Send as its own email, not as a reply to the build thread.** Finance needs a subject line they can file and find; "Re: Store build and setup complete" is neither. It also keeps the invoice off a thread carrying six recipients and two shared mailboxes, which is a wider audience than a bill needs.

Dee's 2026-08-09 reply ("the team and I will go through it and give you feedback, and will also discuss with Finance regarding our payment gateway") asks nothing and needs no substantive answer: she is already organising the review herself, and the gateway is deliberately left alone. A one-line acknowledgment may precede this invoice on the same day, with an hour or two between them so it does not read as throat-clearing before the ask.

Note that her email mentions no vacation and names no one — that came from the WhatsApp thread. The two channels must not be crossed in what we write.

---

Dear Dee,

Enjoy the break, and apologies for a piece of admin arriving while you are away. I am copying Jeffrey so that it does not wait on your return.

Following my email confirming that the store build and setup are complete, please find attached the Stage 2 invoice, LUSHQA-0003, for $675.

This is the second of the three stages set out in the full project invoice LUSHQA-0001. Its trigger is the completion of the data migration and store setup: the data migration was completed and reconciled on 20 July, and the store build finished this week, so both parts of that milestone are now met.

It can be settled directly via this secure card link: [PASTE STRIPE CARD LINK HERE]

For clarity, this invoice covers DotAim's services only. It is separate from the Shopify plan and the Be Yours theme licence, which are billed directly to your own Shopify account and never pass through us.

The final stage, Stage 3 at $675, becomes due on launch.

Thank you, and as always I am happy to walk your finance colleagues through anything they need.

Warm regards,
Bassam

---

**Why it is worded this way.** The milestone sentence states the trigger and the evidence for both halves of it in one line, so if finance queries the timing the answer is already in the email. The Shopify separation paragraph pre-empts the confusion from 26 July, when finance conflated DotAim's invoice with the Shopify plan and theme charges. Launch is not mentioned as a condition of anything, because Stage 2 is not tied to it.
