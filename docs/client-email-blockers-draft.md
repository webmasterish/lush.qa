# Client email draft — the two remaining blockers

Written 2026-08-11 after the call with Ann, revised 2026-08-12. **Sent by Bassam on 2026-08-12**, as a reply on the existing thread. Kept as the record of what went out and why; the notes below are the reasoning behind it, not instructions for a future send.

**Send as a reply on the existing thread**, "Lush.qa Migration to Shopify: Store build and setup complete" (thread `19fe1d68cef9b892`), which is where Ann's forward and the meeting link already live. Subject stays whatever Gmail carries, so `Re: FW: Lush.qa Migration to Shopify: Store build and setup complete`. Do not start a new one: the whole conversation, including Ann's annotated points, is in that thread, and Finance and IT joining it mid-way can read back.

**To:** Ann (`ann_mati@almana.com`), Dee (`moradeke_ogunbiyi@almana.com`)
**Cc:** Mario (`mario_faluh@almana.com`), Sibin (`sibin_xavier@almana.com`), Nirmal (`nirmal_varghese@almana.com`), **Jeffrey Flores (`jeffrey_flores@almana.com`)**, Lush Qatar (`wecarelush@almana.com`)

Jeffrey and Sibin are being added to an existing thread rather than a fresh one, so the first line of the email needs to make sense to someone who has not read the forty messages above it. It does, but keep that in mind if you edit it.

**Attach:** screenshots do the describing here, so the copy stays short. Worth including the Branches page, the new homepage, a collection page showing the category labels, and a close-up of the WhatsApp button.

**Why these recipients.** Ann ran the call and is driving the review, so she leads. Dee stays on the To line because she is the contact and the account holder. Jeffrey and Sibin are added on Bassam's instruction, and both have a named job in the email rather than being copied for volume: Jeffrey owns the gateway, Sibin and Nirmal own the approach to Lush HQ. Mario is the approver.

**The gateway is not a third ask.** It has been raised twice already. Here it is framed as routing it to Finance directly, not as chasing. No deadline attached.

**Two judgement calls worth your eye:**

1. **The ingredient library offer.** You made it verbally and gave no price. I put one sentence in that records the offer and promises a scope and price separately, with no numbers. That way it exists in writing without turning a launch email into a sales email, and the quote lands on its own where it can be read properly. Cut the sentence if you would rather keep the two threads fully apart. Working estimate for when you do quote: 15 to 20 minutes per product across the **127 products that carry an ingredient list** is roughly 32 to 42 hours.
2. **The QAR 250 threshold.** You said "free, and only one paid 20 QAR for all Qatar". I kept 250 as the free-delivery threshold, since that is the figure Ann gave and you did not withdraw it. If the threshold is also open, change that line.

---

**Subject:** (reply on the existing thread)

Hi Ann, hi Dee,

Thank you for the call, and Ann, thank you for the store details that followed it.

Everything we went through is now in place on the store:

- **Homepage.** Rebuilt to follow the Saudi store as closely as we can. A few of the sections Saudi uses are built around collections that do not exist in the Qatar catalogue, so those have been left out rather than filled with something that is not yours, but the look and the running order match.
- **Branches.** All five stores are live with photos, phone numbers and directions, in English and Arabic. These details can be updated at any time, as I demonstrated.
- **Menu.** Handmade Soaps, Collaborations and Make Up were already there, one level inside the menu.
- **WhatsApp.** There is now a WhatsApp button on every page, in both languages. You can set the phone number, an optional message that is already typed in for the customer, an optional text label beside the icon, which side of the screen it sits on, how far in from the edge and the bottom, the button and icon size, the colours, and whether it appears on mobile.
- **Product cards.** These now show the product's category under its name, taken from the category label set on the product, as I demonstrated. We have filled that in across the whole catalogue, in English and Arabic, so it is working everywhere rather than waiting on your team to enter it. It stays a setting you can switch on or off.
- **Ingredients.** The green and black coding is built and working, and it fills out as the ingredient library is completed. As mentioned on the call, we are glad to take that on for you as a separate piece of work, and I will send you a scope and a price for it separately.
- **Delivery.** Shopify does not offer different rates per city within a country, so this is a single rate for all of Qatar: free delivery above QAR 250, and QAR 20 below it, delivered in 1 to 2 business days. We have set QAR 20 for now, and Ann is confirming the figure with management.
- **Tax.** Noted as not applicable in Qatar.
- **Reporting.** As agreed, we will use Shopify's own reports rather than adding Google Analytics, so there is nothing further needed there.

Two items now decide the launch date, and neither of them sits with us.

**1. The payment gateway.** The store cannot take an order until a Qatar gateway is connected, and that step belongs with your provider and your finance team, because it involves your merchant account and banking credentials. Jeffrey, I am copying you directly so it does not have to route through anyone else. If it helps, I am glad to join a call with any provider you are considering and answer the technical side.

**2. DNS.** Ann confirmed that Lush UK holds the DNS for lush.qa.

The approach we recommend is the one we used for both Lush Saudi Arabia and Lush Lebanon. We create a Cloudflare account in your name, and Lush HQ points the nameservers to it. From that moment the account is yours and gives you full control of your own DNS, and you can grant access to whoever needs it, including us, so that we set the records up for you exactly as we did for Saudi and Lebanon.

Could you ask Lush HQ to point the nameservers across? We will have the account ready and waiting, so the only thing needed from them is that one change.

One thing worth flagging. The switch is not only the main website address. Your email records, SPF, DKIM and DMARC, live in the same place, and if they are not carried across at the same time, email sent from your domain will stop being delivered. We will supply the exact list of records and be on hand while the change is made, and we would suggest doing it early in the day and midweek so there is a full working day to watch it settle.

Everything else is ready and waiting on these two.

Warmest regards,
