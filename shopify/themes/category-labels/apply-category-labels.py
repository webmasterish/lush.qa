#!/usr/bin/env python3
"""Write the derived `custom.category_label` onto products, with its Arabic.

Input is `category-labels.json`, produced by derive-category-labels.py from the
local migration staging database. Run that first; this script never re-derives.

Products are matched on `dotaim_migration.source_id`, never on handle: 140 of
538 products share a name, so Shopify invented handles and the tidy one often
belongs to a draft.

Draft products are labelled too, unlike the badge backfill in
`labels/product-labels.py`. A badge is promotional and only means something on
a live product; a category label is intrinsic -- a draft's category does not
change when it is published -- so labelling drafts now avoids someone having to
remember a second pass later. `--active-only` restores the other behaviour.

    ./apply-category-labels.py              # dry run
    ./apply-category-labels.py --apply
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
# Admin API credentials, same file the badge backfill uses. NOT themes/.env,
# which holds Theme Access passwords and cannot talk to the Admin API.
ENV = REPO / "shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env"
PROPOSALS = HERE / "category-labels.json"

NAMESPACE = "custom"
KEY = "category_label"
MF_TYPE = "single_line_text_field"
SET_CHUNK = 25      # metafieldsSet accepts 25 per call
READ_CHUNK = 250    # translatableResourcesByIds page size


def load_env():
    for line in ENV.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def gql(query, variables=None, tries=4):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    url = (f"https://{os.environ['SHOPIFY_STORE_DOMAIN']}"
           f"/admin/api/{os.environ['SHOPIFY_API_VERSION']}/graphql.json")
    for attempt in range(tries):
        req = urllib.request.Request(url, data=body, headers={
            "X-Shopify-Access-Token": os.environ["SHOPIFY_ADMIN_API_TOKEN"],
            "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503) and attempt < tries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise
        if d.get("errors"):
            # THROTTLED comes back as a top-level error, not an HTTP status
            if any("THROTTLED" in json.dumps(x) for x in d["errors"]) and attempt < tries - 1:
                time.sleep(3 * (attempt + 1))
                continue
            raise SystemExit("GraphQL error: " + json.dumps(d["errors"], indent=2))
        return d["data"]
    raise SystemExit("exhausted retries")


def check(payload, key):
    errs = (payload.get(key) or {}).get("userErrors") or []
    if errs:
        raise SystemExit(f"{key} failed: " + json.dumps(errs, indent=2))
    return payload


def products_by_source_id():
    out, cursor = {}, None
    while True:
        d = gql("""query($after:String){ products(first:250, after:$after){
              nodes{ id handle title status
                     src: metafield(namespace:"dotaim_migration", key:"source_id"){ value } }
              pageInfo{ hasNextPage endCursor } } }""", {"after": cursor})["products"]
        for n in d["nodes"]:
            key = (n.get("src") or {}).get("value")
            if key:
                out[key] = n
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cursor = d["pageInfo"]["endCursor"]


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--active-only", action="store_true",
                    help="skip draft products (the badge-backfill behaviour)")
    args = ap.parse_args()

    load_env()
    spec = json.loads(PROPOSALS.read_text(encoding="utf-8"))
    proposals = spec["proposals"]
    print(f"{len(proposals)} proposed labels, {spec['distinct_labels']} distinct")

    catalogue = products_by_source_id()
    print(f"{len(catalogue)} Shopify products carry a source_id")

    work, unmatched, skipped_draft = [], [], 0
    for sid, p in proposals.items():
        prod = catalogue.get(sid)
        if not prod:
            unmatched.append(sid)
            continue
        if args.active_only and prod["status"] != "ACTIVE":
            skipped_draft += 1
            continue
        work.append((prod, p["label_en"], p["label_ar"]))

    print(f"  {len(work)} to write, {len(unmatched)} unmatched"
          + (f", {skipped_draft} drafts skipped" if args.active_only else ""))
    need_ar = [w for w in work if w[2] and w[2] != w[1]]
    print(f"  {len(need_ar)} of those also get Arabic")

    if not args.apply:
        for prod, en, ar in work[:5]:
            print(f"    {prod['handle'][:36]:38} {en:24} / {ar}")
        print("\ndry run. re-run with --apply.")
        return

    # 1. write the metafields in batches, keeping the ids that come back
    ids = {}
    for i, batch in enumerate(chunks(work, SET_CHUNK), 1):
        fields = [{"ownerId": prod["id"], "namespace": NAMESPACE, "key": KEY,
                   "type": MF_TYPE, "value": en} for prod, en, _ in batch]
        res = check(gql("""
          mutation($metafields:[MetafieldsSetInput!]!){
            metafieldsSet(metafields:$metafields){
              metafields{ id ownerType owner{ ... on Product { id } } }
              userErrors{ field message } } }
        """, {"metafields": fields}), "metafieldsSet")["metafieldsSet"]
        for mf in res["metafields"]:
            ids[mf["owner"]["id"]] = mf["id"]
        print(f"\r  metafields written: {min(i*SET_CHUNK, len(work))}/{len(work)}", end="")
    print()

    # 2. digests in bulk -- translationsRegister needs the digest of the value
    #    it is translating, and a per-product query would be 500+ round trips
    digests = {}
    targets = [ids[p["id"]] for p, _, _ in need_ar if p["id"] in ids]
    for batch in chunks(targets, READ_CHUNK):
        d = gql("""query($ids:[ID!]!){ translatableResourcesByIds(resourceIds:$ids, first:250){
                     nodes{ resourceId translatableContent{ key value digest } } } }""",
                {"ids": batch})["translatableResourcesByIds"]["nodes"]
        for n in d:
            src = next((c for c in n["translatableContent"] if c["key"] == "value"), None)
            if src:
                digests[n["resourceId"]] = src["digest"]
    print(f"  digests fetched: {len(digests)}/{len(targets)}")

    # 3. register the Arabic, one call per metafield (no bulk mutation exists)
    done = 0
    for prod, en, ar in need_ar:
        mid = ids.get(prod["id"])
        if not mid or mid not in digests:
            continue
        check(gql("""
          mutation($id:ID!, $translations:[TranslationInput!]!){
            translationsRegister(resourceId:$id, translations:$translations){
              userErrors{ field message } } }
        """, {"id": mid, "translations": [{
            "key": "value", "locale": "ar", "value": ar,
            "translatableContentDigest": digests[mid]}]}), "translationsRegister")
        done += 1
        if done % 25 == 0 or done == len(need_ar):
            print(f"\r  Arabic registered: {done}/{len(need_ar)}", end="")
    print(f"\n\ndone. {len(work)} labels, {done} with Arabic.")
    if unmatched:
        print(f"{len(unmatched)} proposals had no Shopify product: {unmatched[:8]}")


if __name__ == "__main__":
    main()
