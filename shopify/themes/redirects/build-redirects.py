#!/usr/bin/env python3
"""Build and apply the 301 map from the WooCommerce site to Shopify.

Every URL the old site had is a link someone may still follow and a rank Google
has already assigned. Shopify serves a 404 for all of them unless a redirect
exists, so this is the last piece of the migration that is invisible until it
is missing.

The old site is down ("Error establishing a database connection", 2026-08-07),
so the URL inventory does not come from a crawl. `legacy-urls.txt` is the
Internet Archive's record of lush.qa -- every HTML page it ever captured with a
200 -- which is a better source anyway: it includes URLs the site had stopped
linking to but Google still knows.

Targets are resolved, in order:

  1. the fixed map (fixed-map.json)   -- CMS pages, blog, account, policies
  2. products      /shop/<slug>, /product/<slug>, /<slug>
  3. collections   /product-category/<slug>, /<family>/<slug>, /<slug>
  4. tags          /product-tag/<slug>, when a collection of that name exists

Products come from the migration database: `staging` holds the WooCommerce
payload including its `permalink`, and `id_map` holds the Shopify handle the
product was created with. That pairing is exact -- it does not guess from the
slug, which matters because 140 products share a name and Shopify invented
handles for them.

    ./build-redirects.py                 # resolve and report, write redirects.json
    ./build-redirects.py --unmatched     # list what did not resolve
    ./build-redirects.py --apply         # create the redirects on the store

Existing redirects are left alone: Shopify rejects a duplicate path, and this
skips any path the store already redirects.

The Admin token needs write_url_redirects.
"""
import json
import os
import pathlib
import re
import sqlite3
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
DB = REPO / 'shopify/migration_from_woocommerce/migration-tool/var/migration-tool.sqlite'
URLS = HERE / 'legacy-urls.txt'
FIXED = HERE / 'fixed-map.json'
OUT = HERE / 'redirects.json'

# Path prefixes that are the storefront's own furniture, not content.
IGNORE = ('/wp-', '/admin', '/index.php', '/.well-known', '/sitemap',
          '/etheme', '/staticblocks', '/size/', '/author/', '/ar/')


def load_env():
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())


def gql(query, variables=None):
    req = urllib.request.Request(
        f"https://{os.environ['SHOPIFY_STORE_DOMAIN']}/admin/api/"
        f"{os.environ['SHOPIFY_API_VERSION']}/graphql.json",
        data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
        method='POST',
        headers={'X-Shopify-Access-Token': os.environ['SHOPIFY_ADMIN_API_TOKEN'],
                 'Content-Type': 'application/json'})
    out = json.load(urllib.request.urlopen(req))
    if out.get('errors'):
        sys.exit('GraphQL error: ' + json.dumps(out['errors'])[:400])
    return out['data']


def norm(slug):
    """Compare slugs the way WordPress does not: case and separators vary."""
    return re.sub(r'[^a-z0-9]+', '-', (slug or '').lower()).strip('-')


def load_catalogue():
    """{normalised slug: shopify path} for products and collections."""
    con = sqlite3.connect(DB)
    products, collections = {}, {}

    handles = {(e, str(s)): h for e, s, h in con.execute(
        'select entity, source_id, target_handle from id_map')}

    for source_id, payload in con.execute(
            "select source_id, payload from staging where entity='products'"):
        handle = handles.get(('products', str(source_id)))
        if not handle:
            continue
        data = json.loads(payload)
        for slug in {data.get('slug'), (data.get('permalink') or '').rstrip('/').rsplit('/', 1)[-1]}:
            if slug:
                products[norm(slug)] = f'/products/{handle}'

    for source_id, payload in con.execute(
            "select source_id, payload from staging where entity='categories'"):
        handle = handles.get(('categories', str(source_id)))
        if not handle:
            continue
        data = json.loads(payload)
        for slug in {data.get('slug'), data.get('name')}:
            if slug:
                collections[norm(slug)] = f'/collections/{handle}'

    con.close()
    return products, collections


def resolve(paths, fixed, products, collections):
    resolved, unmatched = {}, []

    for path in paths:
        if path in fixed:
            resolved[path] = fixed[path]
            continue

        segments = [s for s in path.strip('/').split('/') if s]
        if not segments:
            continue
        last = norm(segments[-1])
        head = segments[0].lower()

        if head in ('shop', 'product'):
            target = products.get(last)
        elif head == 'product-category':
            target = collections.get(last)
        elif head == 'product-tag':
            # Tags were never migrated as a resource. Only redirect the ones
            # that happen to match a collection; sending the rest to a generic
            # listing would be a worse answer than a 404.
            target = collections.get(last)
        else:
            # Root-level and two-level paths: the old site served categories at
            # /Hair and /Hair/Shampoo, and some products at /snow-fairy.
            target = collections.get(last) or products.get(last)

        if target:
            resolved[path] = target
        else:
            unmatched.append(path)

    return resolved, unmatched


def existing_paths():
    paths, cursor = set(), None
    while True:
        data = gql("""query($after:String){ urlRedirects(first:250, after:$after){
            nodes { path } pageInfo { hasNextPage endCursor } } }""", {'after': cursor})
        block = data['urlRedirects']
        paths.update(n['path'] for n in block['nodes'])
        if not block['pageInfo']['hasNextPage']:
            break
        cursor = block['pageInfo']['endCursor']
    return paths


def main():
    apply = '--apply' in sys.argv
    show_unmatched = '--unmatched' in sys.argv

    fixed = json.loads(FIXED.read_text())['map']
    paths = [p.strip() for p in URLS.read_text().splitlines() if p.strip()]
    paths = [p for p in paths if not p.startswith(IGNORE) and p != '/']
    # A path with a space in it (an encoded %20 in the archive) is not a path
    # Shopify will accept, and there is exactly one: /Angels-on bare-skin.
    paths = [p for p in paths if ' ' not in p]

    products, collections = load_catalogue()
    resolved, unmatched = resolve(paths, fixed, products, collections)

    by_kind = {}
    for path, target in resolved.items():
        kind = target.split('/')[1] if target.startswith('/') else 'other'
        by_kind[kind] = by_kind.get(kind, 0) + 1

    print(f'legacy URLs considered   {len(paths)}')
    print(f'resolved                 {len(resolved)}   {by_kind}')
    print(f'unmatched                {len(unmatched)}')

    OUT.write_text(json.dumps({'_generated_from': 'legacy-urls.txt + the migration database',
                               'redirects': dict(sorted(resolved.items())),
                               'unmatched': sorted(unmatched)},
                              ensure_ascii=False, indent=2) + '\n')
    print(f'wrote {OUT.relative_to(REPO)}')

    if show_unmatched:
        print('\nunmatched:')
        for path in sorted(unmatched):
            print('  ', path)

    if not apply:
        print('\ndry run. re-run with --apply to create these on the store.')
        return

    load_env()
    # Shopify matches redirect paths case-insensitively and stores one slot per
    # path, so /Bath-and-Shower and /bath-and-shower cannot both exist. The old
    # site served both spellings; treat them as one.
    already = {p.lower() for p in existing_paths()}
    todo, skipped_case = {}, 0
    for path, target in resolved.items():
        key = path.lower()
        if key in already:
            skipped_case += 1
            continue
        already.add(key)
        todo[path] = target
    print(f'\n{len(already) - len(todo)} redirects already on the store; '
          f'creating {len(todo)}, skipping {skipped_case} that differ only by case')

    created = failed = 0
    for path, target in sorted(todo.items()):
        data = gql("""mutation($redirect: UrlRedirectInput!) {
            urlRedirectCreate(urlRedirect: $redirect) {
              urlRedirect { id } userErrors { field message } } }""",
                   {'redirect': {'path': path, 'target': target}})['urlRedirectCreate']
        if data['userErrors']:
            failed += 1
            print(f'  FAILED {path} -> {target}: {json.dumps(data["userErrors"])[:120]}')
        else:
            created += 1
        time.sleep(0.12)

    print(f'created {created}, failed {failed}')


if __name__ == '__main__':
    main()
