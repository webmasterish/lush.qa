#!/usr/bin/env python3
"""Apply a versioned menu definition to the Lush Qatar store's navigation.

Navigation is surface C (see docs/theme-phase.md): store data with no file
representation and no undo. This script makes it reproducible instead —
main-menu.json is the source of truth, and re-running restores it.

Collections are referenced by handle, not ID, so the definition stays readable
and survives any collection being recreated.

    ./apply-nav.py                        # dry run for every definition
    ./apply-nav.py --apply                # write them to the store
    ./apply-nav.py --file about-lush-menu.json --apply   # just one
    ./apply-nav.py --export               # record every live menu into menus.json

Definitions are the *.json files beside this script (menus.json excepted -- that
is the export, not an authored definition). Items reference resources by handle
and are resolved to IDs at run time; HTTP items carry a url instead.

Credentials come from the migration tool's project env (the Admin API token
needs write_online_store_navigation).
"""
import json, os, sys, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
EXPORT_FILE = 'menus.json'


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


def export_menus():
    """Record every menu on the store, so surface C navigation is versioned.

    Menus have no file representation, no history and no undo. This captures
    what is actually live -- including menus built by hand in the admin -- so a
    deleted or mangled menu can be rebuilt from the repo.
    """
    data = gql("""{ menus(first: 50) { nodes { handle title
        items { title type url resourceId
          items { title type url resourceId
            items { title type url resourceId } } } } } }""")
    out = {'_source': 'Exported from the live store by apply-nav.py --export.',
           '_note': 'A record of what is live, including menus built in the admin. '
                    'main-menu.json remains the authored definition for the main menu.',
           'menus': data['menus']['nodes']}
    path = HERE / 'menus.json'
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    print(f"wrote {path.relative_to(REPO)}")
    for m in out['menus']:
        print(f"   {m['handle']:28} {len(m['items'])} top-level items")


def resolvers():
    """handle -> id lookups for every resource type a menu item can point at."""
    r = {'COLLECTION': {c['handle']: c['id'] for c in
                        gql('{ collections(first:250){ nodes { id handle } } }')['collections']['nodes']},
         'PAGE': {p['handle']: p['id'] for p in
                  gql('{ pages(first:250){ nodes { id handle } } }')['pages']['nodes']},
         'BLOG': {b['handle']: b['id'] for b in
                  gql('{ blogs(first:100){ nodes { id handle } } }')['blogs']['nodes']}}
    r['SHOP_POLICY'] = {p['type']: p['id'] for p in
                        gql('{ shop { shopPolicies { id type } } }')['shop']['shopPolicies']}
    return r


def build_items(nodes, res, missing, depth=0):
    out = []
    for n in nodes:
        t = n.get('type', 'COLLECTION')
        item = {'title': n['title'], 'type': t}
        if t == 'HTTP':
            item['url'] = n['url']
        elif t in res:
            key = n.get('handle') or n.get(t.lower()) or n.get('collection') or n.get('policy')
            if key not in res[t]:
                missing.append(f"{t}:{key}"); continue
            item['resourceId'] = res[t][key]
        kids = build_items(n.get('items', []), res, missing, depth + 1)
        if kids:
            item['items'] = kids
        out.append(item)
    return out


def apply_definition(path, res, menus, do_apply):
    spec = json.loads(path.read_text())
    missing = []
    items = build_items(spec['items'], res, missing)
    total = sum(1 + len(i.get('items', [])) for i in items)
    print(f"\n{spec['handle']}: {len(items)} top-level, {total} links   ({path.name})")
    if missing:
        print('   unresolved, skipped:', ', '.join(sorted(set(missing))))
    for i in items:
        print(f"    {i['title']:34} {len(i.get('items', []))} children")
    if not do_apply:
        return

    if spec['handle'] in menus:
        data = gql("""mutation($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
            menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
              menu { handle items { title } } userErrors { field message } } }""",
            {'id': menus[spec['handle']], 'title': spec['title'],
             'handle': spec['handle'], 'items': items})['menuUpdate']
    elif spec.get('create_if_missing'):
        data = gql("""mutation($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
            menuCreate(title: $title, handle: $handle, items: $items) {
              menu { handle items { title } } userErrors { field message } } }""",
            {'title': spec['title'], 'handle': spec['handle'], 'items': items})['menuCreate']
    else:
        sys.exit(f"menu '{spec['handle']}' does not exist and create_if_missing is not set")

    if data['userErrors']:
        sys.exit('userErrors: ' + json.dumps(data['userErrors'])[:400])
    print(f"   applied -> {len(data['menu']['items'])} top-level items live")


def main():
    load_env()
    if '--export' in sys.argv:
        export_menus(); return

    if '--file' in sys.argv:
        files = [HERE / sys.argv[sys.argv.index('--file') + 1]]
    else:
        files = sorted(f for f in HERE.glob('*.json') if f.name != EXPORT_FILE)

    res = resolvers()
    menus = {m['handle']: m['id'] for m in
             gql('{ menus(first:50){ nodes { id handle } } }')['menus']['nodes']}
    do_apply = '--apply' in sys.argv
    for f in files:
        apply_definition(f, res, menus, do_apply)
    if not do_apply:
        print('\ndry run. re-run with --apply to write to the store.')


if __name__ == '__main__':
    main()
