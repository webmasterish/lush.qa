#!/usr/bin/env python3
"""
Mint an OFFLINE Admin API access token (shpat_...) for the Dev Dashboard app via
the OAuth authorization-code flow, and write it to ../.env as
SHOPIFY_ADMIN_API_TOKEN.

Dev Dashboard apps don't expose a static Admin API token — you get one by
installing the app (OAuth). This does that headlessly:

  1. In the app's URL settings, add the redirect URL you'll use below
     (default https://example.com). Put the app's Client ID + Secret in ../.env:
         SHOPIFY_CLIENT_ID=...
         SHOPIFY_CLIENT_SECRET=shpss_...
  2. Print the authorize URL and open it in a browser logged into the store:
         python3 scripts/get_admin_token.py url
     Approve. The browser redirects to <redirect>?code=XXXX&... — the page may
     not load, but copy the FULL redirected URL (or just the code).
  3. Exchange the code for the token (writes it into ../.env):
         python3 scripts/get_admin_token.py exchange "<code-or-redirected-url>"

The offline token does not expire; re-run only if it is revoked or scopes change.
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent.parent / ".env"
REDIRECT_URI = "https://example.com"

SCOPES = ("read_customers,write_customers,write_draft_orders,read_draft_orders,read_files,"
          "write_files,write_inventory,read_inventory,read_legal_policies,write_legal_policies,"
          "read_locales,write_locales,read_metaobject_definitions,write_metaobject_definitions,"
          "read_metaobjects,write_metaobjects,read_online_store_navigation,"
          "write_online_store_navigation,read_online_store_pages,write_online_store_pages,"
          "write_order_edits,read_order_edits,read_orders,write_orders,read_all_orders,"
          "read_product_listings,write_product_listings,read_products,write_products,"
          "read_publications,write_publications,read_content,write_content,write_theme_code,"
          "read_translations,write_translations")


def env_get(key, default=None):
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip()
    return default


def env_set(key, value):
    lines = ENV.read_text().splitlines()
    out, found = [], False
    for line in lines:
        if line.strip().startswith(key + "="):
            out.append(f"{key}={value}")
            found = True
        else:
            out.append(line)
    if not found:
        out.append(f"{key}={value}")
    ENV.write_text("\n".join(out) + "\n")


def store():
    return env_get("SHOPIFY_STORE_DOMAIN")


def cmd_url():
    cid = env_get("SHOPIFY_CLIENT_ID")
    if not cid:
        sys.exit("Set SHOPIFY_CLIENT_ID in .env first.")
    params = {"client_id": cid, "scope": SCOPES, "redirect_uri": REDIRECT_URI, "grant_options[]": ""}
    url = f"https://{store()}/admin/oauth/authorize?" + urllib.parse.urlencode(params)
    print("1) Ensure this redirect URL is registered in the app:", REDIRECT_URI)
    print("2) Open this URL in a browser logged into the store, then Approve:\n")
    print(url)
    print("\n3) After approving, copy the redirected URL (or its ?code=...) and run:")
    print('   python3 scripts/get_admin_token.py exchange "<redirected-url-or-code>"')


def cmd_exchange(arg):
    cid = env_get("SHOPIFY_CLIENT_ID")
    secret = env_get("SHOPIFY_CLIENT_SECRET")
    if not cid or not secret:
        sys.exit("Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env first.")
    m = re.search(r"[?&]code=([^&]+)", arg)
    code = urllib.parse.unquote(m.group(1)) if m else arg.strip()
    body = urllib.parse.urlencode({"client_id": cid, "client_secret": secret, "code": code}).encode()
    req = urllib.request.Request(f"https://{store()}/admin/oauth/access_token", data=body,
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    token = data.get("access_token")
    if not token:
        sys.exit(f"No access_token in response: {data}")
    env_set("SHOPIFY_ADMIN_API_TOKEN", token)
    print(f"OK: wrote SHOPIFY_ADMIN_API_TOKEN ({token[:10]}...) to .env")
    print("granted scopes:", data.get("scope", "?"))


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("url", "exchange"):
        sys.exit(__doc__)
    if sys.argv[1] == "url":
        cmd_url()
    else:
        if len(sys.argv) < 3:
            sys.exit('Provide the code: exchange "<redirected-url-or-code>"')
        cmd_exchange(sys.argv[2])


if __name__ == "__main__":
    main()
