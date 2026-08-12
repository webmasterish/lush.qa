# Client email draft — Cloudflare account and the nameserver change

Written 2026-08-12, after Sibin asked for the Cloudflare account details. **Draft only. Bassam sends, or does not.**

**Send as a reply on the same thread.** Everyone stays on it (Bassam's call).

**No credentials in the email.** The account address is fine to state; password and 2FA recovery codes go across separately at handover.

## State, verified from Bassam's screenshots

lush.qa is **already added** to the new account (free plan) and the DNS records are imported. The only outstanding step is the nameserver change at the registrar. Cloudflare assigned:

- `arely.ns.cloudflare.com`
- `fonzie.ns.cloudflare.com`

replacing `terin.ns.cloudflare.com` / `tia.ns.cloudflare.com`. **It added without a zone hold blocking it**, so that worry is closed.

## The one thing to fix before the nameservers move

Cloudflare's scan imported **10 A and 6 AAAA records that all point at Cloudflare's own proxy IPs** (`104.21.58.148`, `172.67.204.127`, `2606:4700:…`), across `lush.qa`, `www`, `ftp`, `ipv4` and `server`, every one proxied and flagged with a warning. That is the 1000 error the move-domain guide warns about: the old zone proxied everything, so the scan could only see Cloudflare, not the real origin. **If the nameservers change with these records in place, lush.qa returns Error 1000.**

The apex and `www` get replaced by Shopify's records anyway, so those are fine. `ftp`, `ipv4` and `server` are the open question: their real origin is invisible from outside, and they are almost certainly legacy records for hosting that is being retired. Hence the export ask in the email, kept to one line.

Left out of the email deliberately, as detail the client does not need: DNSSEC (already off), the dangling MX, SSL reissue, and the fourteen-day clearance on the old account.

---

**Subject:** (reply on the existing thread)

Hi Sibin,

The Cloudflare account is set up and lush.qa is already added to it, with your current DNS records imported. The only step left is the nameserver change.

**The account**

- Created under **almanadev@gmail.com**, a new mailbox set up so the account belongs to Al Mana rather than to us. Both the account and the mailbox are handed over to you, and you can move it to an @almana.com address whenever you prefer.
- Cloudflare's free plan. No cost.
- Not limited to lush.qa. Any other Al Mana domains can sit in the same account.

**What we need**

At the registrar (ROUTEDGE), replace the current nameservers with these two:

- **arely.ns.cloudflare.com**
- **fonzie.ns.cloudflare.com**

and remove `terin.ns.cloudflare.com` and `tia.ns.cloudflare.com`. Cloudflare's guide is here if it helps: https://developers.cloudflare.com/fundamentals/manage-domains/move-domain/

That single change completes the move. The domain keeps working throughout, and the old Cloudflare account releases it automatically.

One thing that would help before we make the switch: if whoever manages the current Cloudflare account can send us an **export of the DNS records**, we can be certain nothing is missed. From the outside we cannot see everything, and there are a few older subdomains we would rather confirm than guess at.

Happy to do the change together at a time that suits you, and we will be watching while it settles.

Warmest regards,
