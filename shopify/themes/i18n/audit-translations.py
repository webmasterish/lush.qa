#!/usr/bin/env python3
"""Report what is still missing an Arabic translation on the Lush Qatar store.

Translation gaps do not announce themselves: a heading typed into the theme
editor, a menu item, a policy or a new page simply renders in English on the
Arabic storefront. Everything we add is a potential gap, so this asks Shopify
directly rather than relying on anyone remembering.

Shopify exposes every translatable string through translatableResources, and
each translation carries an `outdated` flag that Shopify sets when the source
string changes after translation. This reports both gaps and stale entries.

    ./audit-translations.py                # summary per resource type
    ./audit-translations.py --detail       # list the untranslated strings
    ./audit-translations.py --type MENU    # narrow to one resource type

Theme strings that live in locales/ar.json are NOT covered here -- those are
surface A, versioned in git, and checked by `theme check`. This covers store
content: menus, policies, pages, products, collections, and anything typed into
the theme editor.
"""
import json, os, re, sys, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
LOCALE = 'ar'

# Ordered roughly by how visible a gap would be to a shopper.
TYPES = ['MENU', 'LINK', 'SHOP_POLICY', 'ONLINE_STORE_THEME_SECTION_GROUP',
         'ONLINE_STORE_THEME_JSON_TEMPLATE', 'ONLINE_STORE_THEME_SETTINGS_CATEGORY',
         'PAGE', 'BLOG', 'ARTICLE', 'COLLECTION', 'PRODUCT']


def load_env():
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())


def gql(query, variables=None):
    req = urllib.request.Request(
        f"https://{os.environ['SHOPIFY_STORE_DOMAIN']}/admin/api/{os.environ['SHOPIFY_API_VERSION']}/graphql.json",
        data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
        method='POST',
        headers={'X-Shopify-Access-Token': os.environ['SHOPIFY_ADMIN_API_TOKEN'],
                 'Content-Type': 'application/json'})
    out = json.load(urllib.request.urlopen(req))
    if out.get('errors'):
        msg = json.dumps(out['errors'])
        # Only a genuine scope/permission problem is tolerated per type. Anything
        # else -- a wrong field name, a bad enum -- must be loud: an audit that
        # silently reports "no access" for everything is worse than no audit.
        if 'ACCESS_DENIED' in msg:
            return None
        sys.exit('GraphQL error: ' + msg[:400])
    return out['data']


QUERY = """query($type: TranslatableResourceType!, $locale: String!, $after: String) {
  translatableResources(resourceType: $type, first: 50, after: $after) {
    nodes {
      resourceId
      translatableContent { key value digest }
      translations(locale: $locale) { key value outdated }
    }
    pageInfo { hasNextPage endCursor }
  } }"""

# Keys whose "value" is not prose - translating them is meaningless.
SKIP_KEYS = {'handle', 'json_value', 'meta_description', 'meta_title'}

# Values that are not prose: resource references, asset paths, dates, numbers.
# Counting these as translation gaps makes the report dishonest.
NOT_PROSE = re.compile(r'^(shopify://|https?://|#[0-9a-fA-F]{3,8}$|[\d\-/.,:\s]+$)')


def audit(rtype, detail=False):
    missing, stale, translated, cursor = [], [], 0, None
    while True:
        data = gql(QUERY, {'type': rtype, 'locale': LOCALE, 'after': cursor})
        if data is None:
            return None
        res = data['translatableResources']
        for node in res['nodes']:
            done = {t['key']: t for t in node['translations']}
            for c in node['translatableContent']:
                val = (c['value'] or '').strip()
                if c['key'] in SKIP_KEYS or not val or NOT_PROSE.match(val):
                    continue
                if NOT_PROSE.match((c['value'] or '').strip()):
                    continue
                t = done.get(c['key'])
                if not t:
                    missing.append((node['resourceId'], c['key'], c['value']))
                elif t.get('outdated'):
                    stale.append((node['resourceId'], c['key'], c['value']))
                else:
                    translated += 1
        if not res['pageInfo']['hasNextPage']:
            break
        cursor = res['pageInfo']['endCursor']
    return missing, stale, translated


def main():
    load_env()
    detail = '--detail' in sys.argv
    types = TYPES
    if '--type' in sys.argv:
        types = [sys.argv[sys.argv.index('--type') + 1].upper()]

    print(f"Arabic ({LOCALE}) translation audit\n")
    print(f"{'resource type':40} {'translated':>10} {'missing':>8} {'stale':>6}")
    print('-' * 68)
    grand_missing = 0
    for t in types:
        result = audit(t, detail)
        if result is None:
            print(f"{t:40} {'unsupported / no access':>26}")
            continue
        missing, stale, translated = result
        grand_missing += len(missing)
        flag = '  <-- needs work' if missing or stale else ''
        print(f"{t:40} {translated:>10} {len(missing):>8} {len(stale):>6}{flag}")
        if detail and (missing or stale):
            for rid, key, val in (missing + stale)[:40]:
                v = ' '.join(str(val).split())[:70]
                print(f"      {key:28} {v}")
    print('-' * 68)
    print(f"{'total strings missing Arabic':40} {grand_missing:>10}")
    if grand_missing:
        print("\nRun with --detail to see them. Translate in Translate & Adapt, or via\n"
              "translationsRegister for anything scripted.")


if __name__ == '__main__':
    main()
