#!/usr/bin/env python3
"""
Pull a small, representative slice of the live WooCommerce store (READ-ONLY) for
the Shopify demo seed, and snapshot it to __/wp/data/.

Selection:
  - top N products by units sold (full history), via the wc-analytics API
  - the top M product categories
  - the K most recent orders and their customers

Nothing is written to the WooCommerce site. Credentials come from ../.env
(WOO_STORE_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET).
"""
import base64
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV = HERE.parent / ".env"
OUT = HERE.parent / "__" / "wp" / "data"

TOP_PRODUCTS = 15
TOP_CATEGORIES = 6
RECENT_ORDERS = 3
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def load_env(path):
    env = {}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def main():
    env = load_env(ENV)
    base = env["WOO_STORE_URL"].rstrip("/")
    auth = base64.b64encode(
        f"{env['WOO_CONSUMER_KEY']}:{env['WOO_CONSUMER_SECRET']}".encode()
    ).decode()

    def get(path, **params):
        url = f"{base}/wp-json/{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"Authorization": f"Basic {auth}", "User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)

    OUT.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    # 1) top products by units sold (full history)
    top = get("wc-analytics/reports/products",
              after="2019-01-01T00:00:00", before=now.replace("+00:00", ""),
              orderby="items_sold", order="desc", per_page=TOP_PRODUCTS, extended_info="true")
    product_ids = [r["product_id"] for r in top if r.get("product_id")]
    print(f"top products selected: {len(product_ids)} -> {product_ids}")

    products, variations = [], {}
    for pid in product_ids:
        p = get(f"wc/v3/products/{pid}")
        products.append(p)
        if p.get("type") == "variable":
            variations[str(pid)] = get(f"wc/v3/products/{pid}/variations", per_page=100)

    # 2) top categories
    topcats = get("wc-analytics/reports/categories",
                  after="2019-01-01T00:00:00", before=now.replace("+00:00", ""),
                  orderby="items_sold", order="desc", per_page=TOP_CATEGORIES, extended_info="true")
    categories = []
    for r in topcats:
        cid = r.get("category_id")
        if cid:
            categories.append(get(f"wc/v3/products/categories/{cid}"))

    # 3) most recent orders + their customers
    orders = get("wc/v3/orders", orderby="date", order="desc", per_page=RECENT_ORDERS)
    customers = []
    seen = set()
    for o in orders:
        cid = o.get("customer_id") or 0
        if cid and cid not in seen:
            seen.add(cid)
            try:
                customers.append(get(f"wc/v3/customers/{cid}"))
            except Exception as e:
                print(f"  (customer {cid} not fetchable: {e})")
    # recent orders are often guest checkouts; also pull recent registered
    # customers so the Shopify Customers screen has real records to show.
    for c in get("wc/v3/customers", orderby="registered_date", order="desc", per_page=3):
        if c.get("id") and c["id"] not in seen:
            seen.add(c["id"])
            customers.append(c)

    snapshot = {
        "pulled_at": now,
        "source": base,
        "counts": {
            "products": len(products), "variable_products": len(variations),
            "categories": len(categories), "orders": len(orders), "customers": len(customers),
        },
    }
    for name, data in [("products", products), ("variations", variations),
                       ("categories", categories), ("orders", orders),
                       ("customers", customers), ("_manifest", snapshot)]:
        (OUT / f"{name}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))

    print("\nsnapshot written to", OUT)
    print(json.dumps(snapshot["counts"], indent=2))
    print("\nproducts:")
    for p in products:
        cats = ", ".join(c["name"] for c in p.get("categories", []))
        print(f"  - {p['name'][:38]:40} type={p['type']:8} price={p.get('price','?'):>5}  [{cats[:50]}]")
    print("\ncategories:", ", ".join(c["name"] for c in categories))
    print("recent orders:", ", ".join(f"#{o['number']}({o['date_created'][:10]},{o['total']} {o['currency']})" for o in orders))


if __name__ == "__main__":
    sys.exit(main())
