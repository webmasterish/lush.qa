#!/usr/bin/env python3
"""One-off: bring the Terms and Privacy policies in line with what Ann approved.

Four separate problems, found by checking every policy in both languages rather
than only the page Ann named:

1. Customer care number. Ann asked for +974 44885202 -> +974 44874265. The
   English Terms was already done; the **Arabic Terms** and the **English
   Privacy** were not. English and Arabic policy text are separate resources,
   so editing one never touches the other, and the number also lives in the
   Privacy policy, which is easy to miss when the request says "terms".

2. Arabic phone formatting. Written without spaces (+97444874265) so bidi
   cannot split it and reorder the parts inside RTL text. Bassam's call.

3. Shipping costs. Both policies still quoted the pre-Shopify rates, "QAR 15
   minimum within Doha, QAR 22 outside Doha", which are not what the store
   charges and not what Ann approved.

4. Delivery time. English said "5 to 7 business days", Arabic said "3 to 5".
   They contradicted each other *and* the 1 to 2 business days now configured
   in Shipping and delivery.

Arabic bodies are re-registered after the English update so the translation is
not left flagged outdated by the digest change.

    ./update-policies-2026-08-12.py            # dry run
    ./update-policies-2026-08-12.py --apply
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
ENV = REPO / "shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env"

OLD_PHONE_VARIANTS = ["+974 44885202", "974 4488 5202", "974 44885202"]
PHONE_EN = "+974 44874265"
PHONE_AR = "+97444874265"      # no spaces: keeps it LTR inside RTL text

EN_EDITS = {
    "TERMS_OF_SERVICE": [
        ("please allow 5 to 7 business days for domestic shipping in Qatar.",
         "please allow 1 to 2 business days for domestic shipping in Qatar."),
        ("<p>Minimum shipping costs for domestic orders is as follows:</p>\n"
         "<p>QAR 15 minimum for delivery within Doha</p>\n"
         "<p>QAR 22 minimum for delivery outside Doha</p>",
         "<p>Domestic shipping costs are as follows:</p>\n"
         "<p>Free delivery on orders of QAR 300 and above</p>\n"
         "<p>QAR 20 for orders below QAR 300</p>"),
    ],
    "PRIVACY_POLICY": [],
}

AR_EDITS = {
    "TERMS_OF_SERVICE": [
        ("يُرجى الانتظار من 3 إلى 5 أيام عمل للشحن المحلي في قطر.",
         "يُرجى الانتظار من يوم إلى يومين من أيام العمل للشحن المحلي في قطر."),
        ("<p>الحد الأدنى لتكاليف الشحن للطلبات المحلية كما يلي:</p>\n"
         "<p>15 ريال قطري كحد أدنى للتوصيل داخل الدوحة</p>\n"
         "<p>22 ريال قطري كحد أدنى للتوصيل خارج الدوحة</p>",
         "<p>تكاليف الشحن للطلبات المحلية كما يلي:</p>\n"
         "<p>توصيل مجاني للطلبات بقيمة 300 ريال قطري فأكثر</p>\n"
         "<p>20 ريال قطري للطلبات التي تقل قيمتها عن 300 ريال قطري</p>"),
    ],
    "PRIVACY_POLICY": [],
}


def load_env():
    for line in ENV.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def gql(query, variables=None, tries=3):
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
                time.sleep(2 * (attempt + 1)); continue
            raise
        if d.get("errors"):
            raise SystemExit("GraphQL error: " + json.dumps(d["errors"], indent=2))
        return d["data"]
    raise SystemExit("exhausted retries")


def check(payload, key):
    errs = (payload.get(key) or {}).get("userErrors") or []
    if errs:
        raise SystemExit(f"{key} failed: " + json.dumps(errs, indent=2))
    return payload


def apply_edits(text, edits, phone):
    """Returns (new_text, notes). Raises if an expected anchor is missing."""
    notes = []
    for old, new in edits:
        if old not in text:
            raise SystemExit(f"anchor not found, aborting rather than guessing:\n{old[:120]}")
        text = text.replace(old, new)
        notes.append(f"replaced: {old.splitlines()[0][:70]}")
    for variant in OLD_PHONE_VARIANTS:
        if variant in text:
            text = text.replace(variant, phone)
            notes.append(f"phone: {variant!r} -> {phone!r}")
    if phone == PHONE_AR:
        # The Arabic Privacy already carried the right number but spaced, which
        # is what lets bidi split it. Longest form first so we never double up
        # the country code.
        for spaced in ("+974 44874265", "974 44874265"):
            if spaced in text:
                text = text.replace(spaced, phone)
                notes.append(f"phone format: {spaced!r} -> {phone!r}")
    return text, notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    load_env()

    pols = {p["type"]: p for p in
            gql("{ shop { shopPolicies { id type body } } }")["shop"]["shopPolicies"]}

    plan = []
    for ptype in ("TERMS_OF_SERVICE", "PRIVACY_POLICY"):
        p = pols[ptype]
        en_new, en_notes = apply_edits(p["body"], EN_EDITS[ptype], PHONE_EN)

        tr = gql("""query($id:ID!){ translatableResource(resourceId:$id){
                     translations(locale:"ar"){ key value } } }""",
                 {"id": p["id"]})["translatableResource"]["translations"]
        ar_old = next((x["value"] for x in tr if x["key"] == "body"), None)
        ar_new, ar_notes = (apply_edits(ar_old, AR_EDITS[ptype], PHONE_AR)
                            if ar_old else (None, ["no Arabic body"]))

        plan.append((ptype, p, en_new, en_notes, ar_new, ar_notes))
        print(f"=== {ptype}")
        for n in en_notes: print(f"    EN  {n}")
        for n in ar_notes: print(f"    AR  {n}")
        if not en_notes and not ar_notes:
            print("    nothing to change")

    if not args.apply:
        print("\ndry run. re-run with --apply.")
        return

    for ptype, p, en_new, en_notes, ar_new, ar_notes in plan:
        if en_notes and en_new != p["body"]:
            check(gql("""mutation($input:ShopPolicyInput!){
                     shopPolicyUpdate(shopPolicy:$input){
                       shopPolicy{ id } userErrors{ field message } } }""",
                      # ShopPolicyInput is keyed by policy TYPE, not by id
                      {"input": {"type": ptype, "body": en_new}}), "shopPolicyUpdate")
            print(f"{ptype}: English updated")

        if ar_new is None:
            continue
        # digest changes when the English body changes, so read it back now.
        content = gql("""query($id:ID!){ translatableResource(resourceId:$id){
                          translatableContent{ key digest } } }""",
                      {"id": p["id"]})["translatableResource"]["translatableContent"]
        digest = next((c["digest"] for c in content if c["key"] == "body"), None)
        check(gql("""mutation($id:ID!,$t:[TranslationInput!]!){
                 translationsRegister(resourceId:$id, translations:$t){
                   userErrors{ field message } } }""",
                  {"id": p["id"], "t": [{"key": "body", "locale": "ar",
                                         "value": ar_new,
                                         "translatableContentDigest": digest}]}),
              "translationsRegister")
        print(f"{ptype}: Arabic re-registered against the current digest")

    print("\ndone.")


if __name__ == "__main__":
    main()
