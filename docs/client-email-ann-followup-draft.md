# Client email draft — reply to Ann on shipping, phone number and tax

Written 2026-08-12. **Draft only. Bassam sends, or does not.**

**Reply on the same thread**, to Ann's email of 2026-08-12 12:50. Everyone stays on it.

## What was already done, verified on the live store

- **Shipping** — Domestic Qatar zone: `Free, orders 300.00 QAR and up, 1-2 business days` and `Standard, 1-2 business days, 20.00 QAR`. Matches Ann's approved figures. She moved the threshold from 250 to **300**.
- **Tax** — all three "Include sales tax…" options unchecked; the product page no longer renders a tax line.
- **Customer care number** — English Terms of Service updated.

## What checking the rest turned up, now fixed

Ann named the Terms policy. Checking every policy and page in both languages found the same details wrong in three more places. All corrected via `shopify/themes/policies/update-policies-2026-08-12.py` and verified live in both locales.

| | Was | Now |
|---|---|---|
| Arabic Terms, phone | `+974 44885202` | `+97444874265` |
| **English Privacy, phone** | `974 4488 5202` | `+974 44874265` |
| Arabic Privacy, phone | `974 44874265`, spaced | `+97444874265` |
| **Terms shipping cost, both languages** | `QAR 15 within Doha` / `QAR 22 outside Doha` | free over QAR 300, QAR 20 below |
| **Terms delivery time** | EN `5 to 7 business days`, AR `3 to 5` | `1 to 2 business days` in both |

Three things worth knowing about why these were missed:

- **English and Arabic policy text are separate resources.** Editing the English policy never touches the Arabic translation, so the Arabic keeps the old text silently.
- **The phone number also lives in the Privacy policy**, which is easy to skip when the request says "terms policy".
- **The Terms had its own shipping rates**, left over from before Shopify, contradicting both the new rates and each other. English said 5 to 7 days, Arabic said 3 to 5, and the store is set to 1 to 2.

Arabic phone numbers are written without spaces (`+97444874265`) so bidi cannot split them and reorder the parts inside RTL text. Bassam's call, and correct.

## Cash on delivery is deliberately not in this email

Kyaw confirmed on WhatsApp that they already do cash **and** card on delivery, the driver carries the machine, and asked Ann. **Ann replied "Hold on let me just confirm plz!"** So it is not approved, and it stays out of a group email that includes the approver and Finance until she comes back. Agreed with Bassam 2026-08-12.

---

**Subject:** (reply on the existing thread)

Dear Ann,

Thank you for confirming the delivery figures. All three changes are done and live (screenshots attached):

- **Shipping.** Free delivery on orders of QAR 300 and above, and QAR 20 below that, for all of Qatar, delivered in 1 to 2 business days.
- **Customer care number.** Updated to +974 44874265. While making the change we found the old number in the privacy policy as well, so that has been corrected too, in both English and Arabic.
- **Tax.** The tax setting is switched off and prices no longer show a tax line.

One more thing we picked up while we were in there. The terms policy still quoted the old delivery charges, QAR 15 within Doha and QAR 22 outside, and an old delivery time. Both are now updated to match what you have approved.

Warmest regards,
