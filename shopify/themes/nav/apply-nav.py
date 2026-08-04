#!/usr/bin/env python3
"""Apply a versioned menu definition to the Lush Qatar store's navigation.

Navigation is surface C (see docs/theme-phase.md): store data with no file
representation and no undo. This script makes it reproducible instead —
main-menu.json is the source of truth, and re-running restores it.

Collections are referenced by handle, not ID, so the definition stays readable
and survives any collection being recreated.

    ./apply-nav.py                 # dry run: show what would be sent
    ./apply-nav.py --apply         # write it to the store

Credentials come from the migration tool's project env (the Admin API token
needs write_online_store_navigation).
"""
import json, os, sys, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
DEF = HERE / 'main-menu.json'


def load_env():
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())
    missing = [k for k in ('SHOPIFY_STORE_DOMAIN', 'SHOPIFY_API_VERSION', 'SHOPIFY_ADMIN_API_TOKEN')
               if not os.environ.get(k)]
    if missing:
        sys.exit(f"missing {', '.join(missing)} in {ENV}")


def gql(query, variables=None):
    req = urllib.request.Request(
        f"https://{os.environ['SHOPIFY_STORE_DOMAIN']}/admin/api/{os.environ['SHOPIFY_API_VERSION']}/graphql.json",
        data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
        method='POST',
        headers={'X-Shopify-Access-Token': os.environ['SHOPIFY_ADMIN_API_TOKEN'],
                 'Content-Type': 'application/json'})
    out = json.load(urllib.request.urlopen(req))
    if out.get('errors'):
        sys.exit('GraphQL error: ' + json.dumps(out['errors'])[:400])
    return out['data']


def main():
    load_env()
    spec = json.loads(DEF.read_text())

    collections = {c['handle']: c['id'] for c in
                   gql('{ collections(first:250){ nodes { id handle } } }')['collections']['nodes']}
    menus = {m['handle']: m['id'] for m in
             gql('{ menus(first:50){ nodes { id handle } } }')['menus']['nodes']}

    missing, items = [], []
    for top in spec['items']:
        if top['collection'] not in collections:
            missing.append(top['collection']); continue
        node = {'title': top['title'], 'type': 'COLLECTION',
                'resourceId': collections[top['collection']]}
        kids = []
        for ch in top.get('items', []):
            if ch['collection'] in collections:
                kids.append({'title': ch['title'], 'type': 'COLLECTION',
                             'resourceId': collections[ch['collection']]})
            else:
                missing.append(ch['collection'])
        if kids:
            node['items'] = kids
        items.append(node)

    total = sum(1 + len(i.get('items', [])) for i in items)
    print(f"{spec['handle']}: {len(items)} top-level, {total} links")
    if missing:
        print('  no such collection, skipped:', ', '.join(sorted(set(missing))))

    if '--apply' not in sys.argv:
        for i in items:
            print(f"    {i['title']:32} {len(i.get('items', []))} children")
        print('\ndry run. re-run with --apply to write to the store.')
        return

    if spec['handle'] not in menus:
        sys.exit(f"menu '{spec['handle']}' not found on the store")

    data = gql("""mutation($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
        menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
          menu { handle items { title items { title } } }
          userErrors { field message }
        } }""",
        {'id': menus[spec['handle']], 'title': spec['title'],
         'handle': spec['handle'], 'items': items})
    errs = data['menuUpdate']['userErrors']
    if errs:
        sys.exit('userErrors: ' + json.dumps(errs)[:400])
    menu = data['menuUpdate']['menu']
    print(f"\napplied. '{menu['handle']}' now has {len(menu['items'])} top-level items:")
    for it in menu['items']:
        print(f"    {it['title']:32} {len(it['items'])} children")


if __name__ == '__main__':
    main()
