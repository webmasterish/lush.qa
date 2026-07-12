#!/usr/bin/env python3
"""
Push the demo seed from __/wp/data/ into the Shopify dev store via the Admin API
(through `shopify store execute`). Idempotent: created IDs are tracked in
__/wp/data/_shopify_state.json so steps compose and re-runs skip existing items.

Usage:
  push_demo_seed.py collections
  push_demo_seed.py products [--limit N]
  push_demo_seed.py assign
  push_demo_seed.py customers
  push_demo_seed.py orders
  push_demo_seed.py all
  push_demo_seed.py wipe        # delete everything this seed created (disposable)

All demo objects are tagged 'demo-seed' where the API allows, so the seed can be
identified and removed before the real migration.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "__" / "wp" / "data"
STATE_FILE = DATA / "_shopify_state.json"
ENV = HERE.parent / ".env"
TAG = "demo-seed"

# our 6 demo collections (Woo category name -> just the name; created as custom collections)
def env_val(key):
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip()
    raise KeyError(key)

STORE = env_val("SHOPIFY_STORE_DOMAIN")


def load(name):
    return json.load(open(DATA / f"{name}.json"))


def state():
    if STATE_FILE.exists():
        return json.load(open(STATE_FILE))
    return {"collections": {}, "products": {}, "customers": {}, "orders": []}


def save_state(s):
    STATE_FILE.write_text(json.dumps(s, indent=2, ensure_ascii=False))


def gql(query, variables=None, mutate=False):
    tmp = DATA / "_last_response.json"
    args = ["shopify", "store", "execute", "--store", STORE, "--json",
            "-q", query, "--output-file", str(tmp)]
    if variables is not None:
        args += ["--variables", json.dumps(variables)]
    if mutate:
        args += ["--allow-mutations"]
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"CLI error: {r.stderr[-500:]}")
    return json.load(open(tmp))


def check_errors(payload, field):
    node = payload.get(field, {}) or {}
    errs = node.get("userErrors") or []
    if errs:
        raise RuntimeError(f"{field} userErrors: {errs}")
    return node


# ---------------------------------------------------------------- collections
def do_collections():
    s = state()
    cats = load("categories")
    q = "mutation C($input: CollectionInput!){ collectionCreate(input:$input){ collection{ id title handle } userErrors{ field message } } }"
    for c in cats:
        name = c["name"]
        if name in s["collections"]:
            print(f"  = collection exists: {name}")
            continue
        inp = {"title": name}
        desc = (c.get("description") or "").strip()
        if desc:
            inp["descriptionHtml"] = desc
        node = check_errors(gql(q, {"input": inp}, mutate=True), "collectionCreate")
        gid = node["collection"]["id"]
        s["collections"][name] = gid
        print(f"  + collection: {name} -> {gid}")
    save_state(s)


# ------------------------------------------------------------------- products
def build_product_input(p, variations):
    real_imgs = [i for i in p.get("images", []) if "placeholder" not in (i.get("src") or "")]
    inp = {
        "title": p["name"],
        "handle": p["slug"],
        "descriptionHtml": p.get("description") or p.get("short_description") or "",
        "vendor": "Lush",
        "productType": (p["categories"][0]["name"] if p.get("categories") else ""),
        "status": "ACTIVE",
        "tags": [TAG] + [t["name"] for t in p.get("tags", [])],
    }
    if real_imgs:
        inp["files"] = [{"originalSource": i["src"], "contentType": "IMAGE",
                         "alt": i.get("alt") or p["name"]} for i in real_imgs[:5]]
    var_list = variations.get(str(p["id"]), [])
    variants = []
    if p.get("type") == "variable" and var_list:
        # option name -> ordered unique values (from the actual variations)
        opts = {}
        for v in var_list:
            for a in v.get("attributes", []):
                opts.setdefault(a["name"], [])
                if a.get("option") and a["option"] not in opts[a["name"]]:
                    opts[a["name"]].append(a["option"])
        option_names = [n for n, vals in opts.items() if vals]
        for v in var_list:
            ov = [{"optionName": a["name"], "name": a["option"]}
                  for a in v.get("attributes", []) if a.get("option") and a["name"] in option_names]
            if len(ov) != len(option_names):
                continue  # variation doesn't fully specify the options
            variant = {"optionValues": ov, "price": str(v.get("price") or p.get("price") or "0")}
            if v.get("sku"):
                variant["sku"] = v["sku"]
            variants.append(variant)
        if variants:
            inp["productOptions"] = [{"name": n, "values": [{"name": val} for val in opts[n]]}
                                     for n in option_names]
            inp["variants"] = variants
            return inp
    # simple product (or variable with no usable variants): single default variant
    inp["productOptions"] = [{"name": "Title", "values": [{"name": "Default Title"}]}]
    variant = {"optionValues": [{"optionName": "Title", "name": "Default Title"}],
               "price": str(p.get("price") or "0")}
    if p.get("sku"):
        variant["sku"] = p["sku"]
    inp["variants"] = [variant]
    return inp


def do_products(limit=0):
    s = state()
    products = load("products")
    variations = load("variations")
    q = ("mutation P($input: ProductSetInput!){ productSet(synchronous:true, input:$input){ "
         "product{ id handle title variantsCount{count} media(first:1){nodes{id}} } "
         "userErrors{ field message } } }")
    done = 0
    for p in products:
        pid = str(p["id"])
        if pid in s["products"]:
            print(f"  = product exists: {p['name']}")
            continue
        if limit and done >= limit:
            break
        inp = build_product_input(p, variations)
        node = check_errors(gql(q, {"input": inp}, mutate=True), "productSet")
        prod = node["product"]
        s["products"][pid] = {"gid": prod["id"], "handle": prod["handle"],
                              "categories": [c["name"] for c in p.get("categories", [])]}
        print(f"  + product: {prod['title'][:36]:38} variants={prod['variantsCount']['count']} "
              f"media={len(prod['media']['nodes'])}")
        done += 1
        save_state(s)
    save_state(s)


# ----------------------------------------------------------- collection assign
def do_assign():
    s = state()
    q = ("mutation A($id: ID!, $ids: [ID!]!){ collectionAddProducts(id:$id, productIds:$ids){ "
         "collection{ id title productsCount{count} } userErrors{ field message } } }")
    # collection name -> [product gids]
    buckets = {}
    for pid, info in s["products"].items():
        for cat in info.get("categories", []):
            if cat in s["collections"]:
                buckets.setdefault(cat, []).append(info["gid"])
    for name, gids in buckets.items():
        node = check_errors(gql(q, {"id": s["collections"][name], "ids": gids}, mutate=True),
                            "collectionAddProducts")
        print(f"  ~ {name}: {node['collection']['productsCount']['count']} products")


# ------------------------------------------------------------------ customers
def do_customers():
    s = state()
    custs = load("customers")
    q = ("mutation C($input: CustomerInput!){ customerCreate(input:$input){ customer{ id email } "
         "userErrors{ field message } } }")
    for c in custs:
        email = (c.get("email") or "").strip()
        if not email or email in s["customers"]:
            continue
        b = c.get("billing") or {}
        inp = {"email": email, "tags": [TAG]}
        if c.get("first_name"):
            inp["firstName"] = c["first_name"]
        if c.get("last_name"):
            inp["lastName"] = c["last_name"]
        addr = {k2: b.get(k1) for k1, k2 in [
            ("address_1", "address1"), ("address_2", "address2"), ("city", "city"),
            ("postcode", "zip"), ("country", "countryCode"), ("phone", "phone")] if b.get(k1)}
        if addr:
            inp["addresses"] = [addr]
        try:
            node = check_errors(gql(q, {"input": inp}, mutate=True), "customerCreate")
            s["customers"][email] = node["customer"]["id"]
            print(f"  + customer: {email}")
        except RuntimeError as e:
            print(f"  ! customer {email}: {e}")
    save_state(s)


# --------------------------------------------------------------------- orders
def do_orders():
    s = state()
    orders = load("orders")
    q = ("mutation O($order: OrderCreateOrderInput!){ orderCreate(order:$order){ order{ id name } "
         "userErrors{ field message } } }")
    for o in orders:
        num = str(o["number"])
        if num in [x.get("woo_number") for x in s["orders"]]:
            continue
        cur = o.get("currency", "QAR")
        line_items = [{"title": li["name"], "quantity": li["quantity"],
                       "priceSet": {"shopMoney": {"amount": str(li.get("price") or "0"), "currencyCode": cur}}}
                      for li in o.get("line_items", [])]
        b = o.get("billing") or {}
        order = {
            "currency": cur,
            "lineItems": line_items,
            "financialStatus": "PAID",
            "processedAt": o.get("date_created_gmt") and o["date_created_gmt"] + "Z",
            "tags": [TAG],
        }
        if b.get("email"):
            order["email"] = b["email"]
        addr = {k2: b.get(k1) for k1, k2 in [
            ("first_name", "firstName"), ("last_name", "lastName"), ("address_1", "address1"),
            ("city", "city"), ("postcode", "zip"), ("country", "countryCode"), ("phone", "phone")] if b.get(k1)}
        if addr:
            order["billingAddress"] = addr
        try:
            node = check_errors(gql(q, {"order": order}, mutate=True), "orderCreate")
            s["orders"].append({"woo_number": num, "gid": node["order"]["id"], "name": node["order"]["name"]})
            print(f"  + order: {node['order']['name']} (woo #{num})")
        except RuntimeError as e:
            print(f"  ! order #{num}: {e}")
    save_state(s)


# ----------------------------------------------------------------------- wipe
def do_wipe():
    s = state()
    plan = [
        ("product", [v["gid"] for v in s["products"].values()],
         "mutation($id:ID!){ productDelete(input:{id:$id}){ deletedProductId userErrors{message} } }"),
        ("collection", list(s["collections"].values()),
         "mutation($id:ID!){ collectionDelete(input:{id:$id}){ deletedCollectionId userErrors{message} } }"),
        ("customer", list(s["customers"].values()),
         "mutation($id:ID!){ customerDelete(input:{id:$id}){ deletedCustomerId userErrors{message} } }"),
        ("order", [o["gid"] for o in s["orders"]],
         "mutation($id:ID!){ orderDelete(orderId:$id){ deletedId userErrors{message} } }"),
    ]
    for label, ids, q in plan:
        for gid in ids:
            try:
                gql(q, {"id": gid}, mutate=True)
                print(f"  - deleted {label}: {gid}")
            except Exception as e:
                print(f"  ! {label} {gid}: {e}")
    save_state({"collections": {}, "products": {}, "customers": {}, "orders": []})
    print("state cleared.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("step", choices=["collections", "products", "assign", "customers", "orders", "all", "wipe"])
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    if a.step == "wipe":
        print("== wipe ==")
        do_wipe()
        return
    steps = ["collections", "products", "assign", "customers", "orders"] if a.step == "all" else [a.step]
    for st in steps:
        print(f"== {st} ==")
        {"collections": do_collections, "products": lambda: do_products(a.limit),
         "assign": do_assign, "customers": do_customers, "orders": do_orders}[st]()


if __name__ == "__main__":
    sys.exit(main())
