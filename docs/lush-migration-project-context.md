# Lush Franchise Shopify Migration — Full Project Context

Background and working context for DotAim LLC's Lush franchise migration work, centered on the **Lush Qatar** WooCommerce-to-Shopify migration (the primary active engagement). Merges the original opportunity summary with the current project state.

---

## 1. Overview

- **Vendor:** DotAim LLC — Bassam Mardini, Founder (based in Lebanon)
- **Contact:** bassam.mardini@dotaim.com · +961-81-227726
- **Focus:** E-commerce migrations (WooCommerce / OpenCart → Shopify) for Lush cosmetics franchisees across regions, plus related digital services.
- **Value proposition:** Client independence (direct dashboard access, training, no agency lock-in), Lush-specific expertise, cross-market best practices, cost-effectiveness, and direct communication.

---

## 2. Origin & franchise network

The Lush Saudi Arabia migration (OpenCart → Shopify, delivered by DotAim) is the foundation of this line of work. That success generated referrals across the Lush franchise network:

- **Ziad** (Lush KSA) originated the referrals from the start, circulating a recommendation to other Lush franchisees endorsing DotAim — including the introduction that led to Lush Qatar.
- **Joven** (Lush KSA) reinforced this by vouching to the Qatar team for the high quality of DotAim's service.

Lush franchises are broadly standardizing on Shopify for consistency across markets, using a shared theme ecosystem (Be Yours by RoarTheme).

### Franchise status snapshot

| Market | Platform status | DotAim involvement |
|---|---|---|
| Lush Saudi Arabia (`lush.sa.com`) | Live on Shopify | **Migrated by DotAim** (OpenCart → Shopify) |
| Lush Lebanon (`lushlebanon.com`) | Live on Shopify | **Migrated by DotAim** |
| **Lush Qatar (`lush.qa`)** | **On WooCommerce — migration underway** | **Primary active project (this doc)** |
| Lush Malaysia (`lush.my`) | On Shopline | In discussions (see §9) |
| Lush South Africa (`lush.co.za`) | Live on Shopify | **Not DotAim** — information sharing between teams only |
| Lush Cyprus (`lush.cy`) | Live on Shopify | Not DotAim |
| Lush Estonia (`lush.ee`) | Live on Shopify | Not DotAim |

> **Messaging note:** When talking to other prospects, do NOT name specific franchisees (Qatar, Lebanon, etc.) as being "in discussions" — those are confidential. Speak generally ("in discussions with several Lush franchisees"). Frame South Africa accurately as information-sharing, not a DotAim migration.

---

## 3. PRIMARY PROJECT — Lush Qatar (Al Mana Fashion Group)

### Objective
Migrate `lush.qa` from WooCommerce (WordPress) to Shopify with zero data loss, implement features, integrations, training, and launch. Client wants the frontend to **mirror the Lush Saudi Arabia store**.

- **Estimated timeline:** 6–8 weeks from kickoff.
- **Current status:** Approved, deposit paid, access mostly granted, discovery phase starting.

### Stakeholders

| Person | Role | Contact | Notes |
|---|---|---|---|
| Dee (Moradeke Fatima Ogunbiyi) | Brand Manager, Lush Qatar & Oman | moradeke_ogunbiyi@almana.com · +974 66405856 | Primary day-to-day contact and deal driver |
| Mario Faluh | General Manager, Al Mana Fashion Group | mario_faluh@almana.com · +974 55 816215 | Final approval authority |
| Ann | Brand team | ann_mati@almana.com | Made the initial re-contact in this round |
| Nirmal Varghese | IT | nirmal_varghese@almana.com | DNS/technical; originally suggested the demo |
| Sibin Xavier | IT Manager | sibin_xavier@almana.com | Provided WooCommerce admin credentials; lifted the IP geo-lock |

### Company background
Al Mana is a major Qatari conglomerate (55+ companies, operations across 8 countries, 3,500+ employees, 300+ retail outlets). Al Mana Fashion Group handles brands including Zara, Mango, Balenciaga, Hermès, Dior, and operates Lush in the region.

---

## 4. Commercial terms (agreed)

### DotAim services — total $2,700

| Item | Amount | Notes |
|---|---|---|
| Migration & Setup Services | $1,700 | After 15% discount (was $2,000) |
| Data Migration | $500 | Preliminary — up to 500 products / 5,000 customers / 5,000 orders; final cost confirmed after data-volume assessment |
| WhatsApp Integration Setup | $200 | Deferrable to a later phase if not an immediate priority |
| Email Automation Setup | $300 | |

### Payment schedule (50 / 25 / 25)

| Stage | Trigger | Amount | Status |
|---|---|---|---|
| Stage 1 | Deposit to begin | $1,350 | **PAID** (Stripe fee $59.70) |
| Stage 2 | On completion of data migration & store setup | $675 | Pending |
| Stage 3 | On launch | $675 | Pending |

### Third-party costs (billed directly to Lush Qatar via Shopify — NOT through DotAim)
- **Shopify Grow Plan:** ~$54/month annual ($648/yr) or $72/month monthly — MENA regional pricing (NOT the US rate of $79/$105).
- **Be Yours theme (RoarTheme):** $350 one-time; license tied to lush.qa domain, non-transferable.
- **Optional apps:** WhatsApp integration (usage-based); email marketing (Shopify Email is free; Klaviyo/Omnisend for advanced).
- A credit card is required on the Shopify account to activate these.

---

## 5. Invoicing structure
- **LUSHQA-0001** — Master/full reference invoice ($2,700, full 50/25/25 breakdown). Issued via **InvoiceNinja** (document only, not payable) for the client's finance/audit records.
- **LUSHQA-0002** — Stripe deposit invoice ($1,350). **PAID.**
- Stripe sequence continues: 0003 (Stage 2), 0004 (Stage 3), each referencing LUSHQA-0001.
- Stripe and Payoneer are both under **DotAim LLC**. Payoneer payment links aren't available in DotAim's region; payment is collected via Stripe hosted card links (link emailed manually rather than sent from the Stripe dashboard).

---

## 6. Technical details

### Source
- Platform: **WooCommerce** (WordPress) at `lush.qa`
- Previously geo-restricted (Cloudflare) to **Qatar / UAE / UK** — blocked external access and analysis (e.g., PageSpeed) from Lebanon. **Now lifted.**
- WooCommerce admin access: **granted and working**
- Server SSH (preferred) / FTP access: **still pending** from Sibin — needed for migration steps that can't run from wp-admin

### Target
- Platform: **Shopify**
- Dev store admin: `https://admin.shopify.com/store/lush-qatar`
- Dev store URL: `https://lush-qatar.myshopify.com/`
- Theme: **Be Yours by RoarTheme** (not yet installed/purchased; client buys the $350 license)

### Reference sites
- **DotAim-built (live):** Lush KSA `https://lush.sa.com/` · Lush Lebanon `https://lushlebanon.com/`
- **Other Lush on Shopify (not DotAim):** South Africa `lush.co.za`, Cyprus `lush.cy`, Estonia `lush.ee`

### Access status
- [x] IP geo-lock on lush.qa (was Qatar/UAE/UK) — **REMOVED**
- [x] WooCommerce admin access — **PROVIDED**
- [ ] Server SSH/FTP access — **PENDING** (requested from Sibin)
- [ ] DNS management — coordinate with Nirmal / Al Mana IT at cutover stage

---

## 7. Data to migrate
- **Products:** name, description, slug, image/thumbnail, gallery, regular & sale price, category, SKU, quantity, stock management, brand/manufacturer, weight & dimensions, attributes, tags, variations, publish status, meta title/description
- **Categories:** name, description, slug, thumbnail, meta
- **Customers:** email, first/last name, company, address 1 & 2, city, postcode, country/region, state, phone
- **Orders:** order number, notes, total, date, status, customer, tax, discount, shipping, currency, payment method, billing/shipping address
- **Order items:** product name, price, qty, SKU
- **CMS pages:** title, URL key, status, meta, content
- **Blog:** title, content, author, featured image, slug, status, category, tags, meta
- **URL redirects:** map all existing URLs, 301 redirects for SEO preservation

### Migration approach
Previous DotAim migrations (KSA and Lebanon) were done using the paid third-party service **LitExtension** (litextension.com), with some manual cleanup at the end. **For this project, the goal is to perform the migration in-house without any third-party migration services.** This is the main reason direct WooCommerce data access and server (SSH/FTP) access are required.

---

## 8. Migration phases & features

### Phases
1. **Discovery & Planning** — access, data structure export/documentation, migration checklist, DNS documentation
2. **Shopify Store Setup** — Grow plan, Be Yours theme install
3. **Data Migration** — all entities above
4. **Features & Functionality** — see below
5. **Testing & QA** — internal (DotAim) + client testing
6. **Training & Launch** — 2-hour recorded training session, DNS cutover via Cloudflare, 72-hour post-launch monitoring

### Features to implement
- **Navigation:** mega menu, smart search with auto-suggestions, advanced filtering, mobile-optimized nav
- **Homepage/campaigns:** hero banners (image/video), custom landing pages, featured collections, countdown timers
- **Product display:** custom badges (vegan, bestseller, new, limited edition), back-in-stock notifications, image galleries with zoom, related products
- **Cart & checkout:** slide-out cart drawer with upsells, cards, COD, digital wallets (Apple/Google Pay), local Qatar payment gateways, gift cards
- **WhatsApp integration:** order confirmations, shipping/delivery updates, optional abandoned-cart reminders (deferrable)
- **Email automation:** welcome series, abandoned-cart recovery, post-purchase, back-in-stock, order/shipping notifications, branded templates
- **Blog & content, analytics** (Google Analytics)
- **Bilingual (Arabic/English):** the Qatar site will be bilingual, mirroring the Saudi store.

### Demo / training session
- **First demo is scheduled for 14 July, 9:30 Qatar time.** It needs to be a polished, highly professional presentation — the first live walkthrough for the team.
- Purpose: walk the team (Dee, Ann, Nirmal, possibly others) through the **Shopify admin/dashboard** and features — the frontend is already sold via the live KSA/Lebanon sites.
- Plan: load a slice of their **actual data** into the dev store so the demo is relevant.
- Mirrors the training deliverable: products, collections, homepage banners, test order, customers, reports, navigation.

---

## 9. Other engagements

### Lush Saudi Arabia — COMPLETED (flagship reference)
The original and most important engagement. Migrated by DotAim from OpenCart to Shopify, now live at `lush.sa.com`, and bilingual (Arabic/English). This project is the foundation of the entire Lush franchise pipeline — its success generated the referrals (via Ziad) that led to Qatar, Lebanon, and the others. Dee has specifically said she likes the Saudi site very much and wants Lush Qatar to be a **mirror** of it, so it is the direct design and functionality benchmark for this project.

### Lush Lebanon — COMPLETED (reference)
Now live at `lushlebanon.com`, migrated by DotAim. Previously on WooCommerce via a local agency. The pain points that drove the switch (useful when pitching similar franchisees): slow site, no dashboard access (agency lock-in), charged for every change, requested changes not done properly, not mobile-friendly, preferred the Shopify look and feel. **Key selling point that resonated: independence from agency lock-in.**

### Lush Malaysia — IN DISCUSSIONS (stalled)
- **Contact:** Akmal (IT, Lush Malaysia). Has an internal team of ~2 developers.
- Approached DotAim, had a few conversations, requested a rough estimate and delivery time (provided), but never returned with a decision — appears undecided on whether to switch to Shopify. No formal proposal sent.
- Akmal asked about local Malaysian providers; DotAim intentionally did not recommend anyone (wants to win the engagement).

---

## 10. Key constraints & learnings
- **Shopify Payments is NOT available in Qatar** — the only GCC country supported is the UAE (per Shopify's official supported-countries list). Lush Qatar must use a local gateway (e.g., QNB, Tap, Telr), and Shopify applies a plan-based transaction fee on top. That fee is Shopify's, not DotAim's, and is reduced only by moving to a higher plan tier.
- **Shopify regional (MENA) pricing differs from US pricing:** Grow is ~$54/$72 in the region vs $79/$105 in the US. Always confirm against the regional view.
- The **"1% back on sales"** on Shopify pricing is a cashback/credit benefit, **not** a transaction charge (client initially misread this).
- **Annual Shopify billing** already saves ~25% vs monthly — beats the discount the client asked for on the subscription.
- **DotAim's core selling point** with brand teams is client independence: direct dashboard access + training, no lock-in.

---

## 11. Communication preferences
- **Channels:** WhatsApp for fast/ongoing client coordination; email for formal proposals, invoices, and access requests (keeps an audit trail); Google Meet for video calls.
- **Tone:** warm but professional, concise.
- **Formatting:** no em-dashes in client-facing docs. Emojis fine on WhatsApp with Dee, not in formal emails.
- **Structure:** Dee is primary; Mario approves; loop in IT (Sibin/Nirmal) for access and DNS.
- Payment structure is firm at 50/25/25 — never imply full upfront payment.

---

## 12. Immediate next steps
1. **Set up the Claude Code project** for the migration work.
2. **Prepare for the first demo — scheduled 14 July, 9:30 Qatar time.** Load the dev store with representative real data and build a polished, highly professional walkthrough of the Shopify admin/dashboard and the agreed features (see §8). This is the first live presentation to the team.
3. Obtain **server SSH/FTP access** from Sibin (last outstanding access item).
4. Review the WooCommerce store; assess **data volumes against the agreed scope** (500 products / 5,000 customers / 5,000 orders) and flag if the data-migration cost needs revising.
5. Export and document the current data structure; build the migration checklist (in-house migration, no third-party tools — see §7).

---

## Appendix — resources & credentials handling
- **Google Drive project folder:** https://drive.google.com/drive/folders/1P9fR1Vfy-8ufo32VJlBfBN3kal88aVFI (proposals, invoices, and project documents).
- Keep WooCommerce/server credentials in a local `.env` or secrets manager, **not** in this context file.
- Update the "Access status" section (§6) as items get provisioned, since that's the part that changes fastest.
