#!/usr/bin/env python3
"""Derive a per-product `custom.category_label` from the WooCommerce category tree.

Reads only the local migration staging database. Touches no store. Writes a
proposal file for review; applying it is a separate, deliberate step.

Which category becomes the label:

  A product sits in several WooCommerce categories at once -- typically one
  real product category plus a merchandising one ("New Products", "Best
  Sellers"). The label wants the *most specific real category*: "Body Sprays",
  not "Fragrances" and not "New Products". So we take the deepest node in the
  tree, after dropping the merchandising branches, and break ties on the
  smaller category, which is the more specific of two siblings.

Arabic comes from the same categories in the `ar` staging rows, matched on the
WooCommerce term id, so the pairing is exact rather than by name.
"""

import argparse
import html
import json
import sqlite3
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
DB = REPO / "shopify/migration_from_woocommerce/migration-tool/var/migration-tool.sqlite"
OUT = Path(__file__).resolve().parent / "category-labels.json"
OVERRIDES = Path(__file__).resolve().parent / "label-overrides.json"

# Merchandising and price-band categories. Real groupings for browsing, but not
# what a product *is*, so never a category label.
EXCLUDED_SLUGS = {
    "5-star-reviews", "best-sellers", "trending-now", "new-products",
    "lush-party", "lunar-new-year", "sleep-better", "muscle-recovery",
    "gifts-under-200-qar", "gifts-between-200-500-qar", "gifts-over-500-qar",
    "lifestyle", "collaborations", "collaboration",
    "uncategorized", "uncategorised",
}

# "Gifts" is not excluded outright, only demoted. A gift set's categories are
# often nothing but Gifts and a price band, and "Gifts" is the honest label for
# it -- better than a blank card. But any real product category outranks it.
FALLBACK_SLUGS = {"gifts"}


def load(conn, entity, lang):
    rows = conn.execute(
        "select source_id, payload from staging where entity=? and lang=?",
        (entity, lang),
    ).fetchall()
    return {int(sid): json.loads(p) for sid, p in rows}


def depth_of(cat_id, parents, seen=None):
    """Distance from a root. Guards against a cycle in the source data."""
    seen = seen or set()
    d = 0
    while cat_id and cat_id in parents and cat_id not in seen:
        seen.add(cat_id)
        cat_id = parents[cat_id]
        d += 1
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(DB))
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)

    cats_en = load(conn, "categories", "en")
    cats_ar = load(conn, "categories", "ar")
    prods_en = load(conn, "products", "en")

    parents = {c["id"]: c.get("parent") or 0 for c in cats_en.values()}
    by_id = {c["id"]: c for c in cats_en.values()}
    # Arabic categories are staged under their own term ids; pair them back to
    # the English term via the `en_id` column the staging table carries.
    ar_by_en = {}
    for sid, payload in conn.execute(
        "select en_id, payload from staging where entity='categories' and lang='ar'"
    ).fetchall():
        if sid is None:
            continue
        ar_by_en[int(sid)] = json.loads(payload)

    # Arabic we supplied ourselves, for categories WooCommerce never translated.
    ar_overrides = {}
    if OVERRIDES.exists():
        ar_overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")).get("ar", {})

    proposals, skipped = {}, []
    dist = Counter()

    for pid, p in prods_en.items():
        usable = [
            c for c in p.get("categories", [])
            if c.get("slug") not in EXCLUDED_SLUGS and c.get("id") in by_id
        ]
        cands = [c for c in usable if c.get("slug") not in FALLBACK_SLUGS]
        if not cands:
            cands = usable  # gift sets and anything else with only a fallback left
        if not cands:
            skipped.append({
                "source_id": pid,
                "name": p.get("name"),
                "reason": "no category left after exclusions",
                "categories": [c.get("slug") for c in p.get("categories", [])],
            })
            continue

        # deepest wins; then the smaller (more specific) of two at equal depth
        best = max(
            cands,
            key=lambda c: (depth_of(c["id"], parents), -(by_id[c["id"]].get("count") or 0)),
        )
        ar = ar_by_en.get(best["id"])
        # WooCommerce stores category names HTML-escaped ("Shower gels &amp;
        # Jellies"). A metafield value is plain text and the theme escapes on
        # output, so the entity has to come off here or it renders literally.
        label_en = html.unescape(by_id[best["id"]]["name"])
        label_ar = html.unescape((ar or {}).get("name") or "") or None
        # WPML also stages a "translation" that is just the English copied
        # across. That is indistinguishable from untranslated on the storefront,
        # so treat it as missing and let an override win.
        if not label_ar or label_ar.strip() == label_en.strip():
            label_ar = ar_overrides.get(label_en) or label_ar
        proposals[str(pid)] = {
            "source_id": pid,
            "product": html.unescape(p.get("name") or ""),
            "category_id": best["id"],
            "label_en": label_en,
            "label_ar": label_ar,
            "from_categories": [c["slug"] for c in p.get("categories", [])],
        }
        dist[label_en] += 1

    missing_ar = [v for v in proposals.values() if not v["label_ar"]]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps({
        "_source": "Derived from the local migration staging DB by derive-category-labels.py. "
                   "PROPOSAL ONLY -- nothing has been written to the store.",
        "_rule": "Deepest non-merchandising WooCommerce category; ties broken toward the smaller category.",
        "excluded_slugs": sorted(EXCLUDED_SLUGS),
        "product_count": len(proposals),
        "distinct_labels": len(dist),
        "products_without_a_label": len(skipped),
        "labels_missing_arabic": len(missing_ar),
        "distribution": dict(dist.most_common()),
        "proposals": proposals,
        "skipped": skipped,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"products with a proposed label : {len(proposals)}")
    print(f"distinct labels                : {len(dist)}")
    print(f"no label (all excluded/none)   : {len(skipped)}")
    print(f"label has no Arabic            : {len(missing_ar)}")
    print("\ntop 15 labels:")
    for name, n in dist.most_common(15):
        print(f"  {n:4}  {name}")
    if skipped[:5]:
        print("\nfirst few without a label:")
        for s in skipped[:5]:
            print(f"  {s['source_id']}  {s['name']}  <- {s['categories']}")
    print(f"\nwritten: {args.out}")


if __name__ == "__main__":
    main()
