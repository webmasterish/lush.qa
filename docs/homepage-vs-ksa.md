# Homepage: Qatar against KSA

Written 2026-08-11 after the client call, where "homepage like KSA" was agreed without pinning down what it means. This is the section-by-section comparison plus the decision it needs from Bassam.

Sources: `be-yours/templates/index.json` (Qatar, live) and `__reference/ksa-8.4.0-live/templates/index.json`, filtered to the sections KSA actually renders. KSA's file carries 25 sections, 13 of them disabled demo leftovers, so the raw file is misleading — only the 12 below are live.

## What each store renders today

| # | Qatar | KSA |
|---|---|---|
| 1 | Slideshow, 4 slides | Slideshow, 6 slides |
| 2 | **Popular Categories** (collection list, 6) | Featured collection — Lush x Sanrio Characters |
| 3 | Featured collection — Trending | Featured collection — Beat The Heat |
| 4 | Image with text — Gifts banner | Featured collection — Viral Products |
| 5 | Featured collection — New Products | **Countdown timer** |
| 6 | Image with text — Fragrance banner | Image with text |
| 7 | Featured collection — Best Sellers | **Countdown timer** |
| 8 | Image with text — Bath banner | **Tab collage** — Best Selling Fragrances |
| 9 | Featured collection — Featured | **Image with text overlay** |
| 10 | Featured blog | **Video hero** |
| 11 | Guarantees — Lush Values | Featured blog |
| 12 | — | Guarantees — Lush Values |

Both open on a slideshow and close on blog + Lush Values. The middle is where they diverge.

**Qatar has that KSA does not:** Popular Categories, and a rhythm that alternates a product carousel with a campaign banner.

**KSA has that Qatar does not:** two countdown timers, a tab collage, an image-with-text overlay, and a video hero. KSA also front-loads three product carousels back to back before any banner.

## The important part: none of this is build work

Every one of those four section types is already in Qatar's theme — `countdown-timer`, `tab-collage`, `image-with-text-overlay` and `video-hero` all exist in `sections/`, verified. Adding them is arranging sections in the theme editor, not writing code.

What they need instead is **content Qatar does not have**:

| Section | What it needs before it can go on the page |
|---|---|
| Countdown timer ×2 | A real campaign with a real end date. A timer counting down to nothing is worse than no timer. |
| Tab collage | 3 to 4 collections plus a lifestyle image per tab. |
| Image with text overlay | One wide campaign image with room for text over it. |
| Video hero | A video. Qatar has none. |

So "like KSA" cannot be delivered as a straight copy. The structure is an afternoon; the assets are the client's.

## Two readings, and they lead to different work

**Reading A — match the arrangement.** Reorder to KSA's rhythm: carousels grouped at the top, banners after, and drop or demote Popular Categories. Doable now, no client assets, no new content. But it removes Popular Categories, which is a genuinely useful navigation aid on a 61-collection catalogue, and KSA's grouping is arguably the weaker layout.

**Reading B — match the feature set.** Add the countdown timers, tab collage, overlay banner and video hero. This is what makes it *look* like KSA. It is blocked on client assets, and it should not be built empty.

My read is that the meeting meant B, because the sections KSA has and Qatar lacks are the visible ones — a video and a countdown are what you notice when two homepages are side by side. But A is what can be done today, and the two are not mutually exclusive.

**Recommendation:** do neither blind. Ask Ann which of the four KSA sections she actually wants, and ask for the assets in the same message. Meanwhile leave Qatar's homepage as it is — it is complete and coherent, and stripping Popular Categories to chase a structural match would be a downgrade.

## One constraint worth remembering

`templates/index.json` is **surface B**. The store is the source of truth and the theme editor writes it. Bassam has already done editor work on the homepage (hero slides bottom-left, the titled blog section). Rebuilding the homepage from the repo and running `push-content` would overwrite that. Homepage changes go through the theme editor, or through `pull-content` first and a careful diff.
