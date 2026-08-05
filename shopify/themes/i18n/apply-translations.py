#!/usr/bin/env python3
"""Register Arabic translations for the content we authored: menus and theme text.

ar.json is the versioned dictionary, keyed on the English string. This walks the
store's translatable resources and, wherever an untranslated string matches an
entry, registers the Arabic. Matching on value rather than on resource id means
the same phrase is translated consistently everywhere it appears, and the
dictionary stays readable and reviewable.

Deliberately partial: Be Yours demo strings in unused templates are not in the
dictionary and are left alone. Products and collections are migration data and
are handled separately -- collection titles here come from the migration's own
Arabic, so menus read the same as the collection pages they point at.

    ./apply-translations.py            # dry run: what would be registered
    ./apply-translations.py --apply    # register
    ./apply-translations.py --missing  # untranslated strings NOT in ar.json

Needs write_translations.
"""
import json, os, re, sys, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
DICT = HERE / 'ar.json'

TYPES = ['MENU', 'LINK', 'ONLINE_STORE_THEME_SECTION_GROUP',
         'ONLINE_STORE_THEME_JSON_TEMPLATE', 'ONLINE_STORE_THEME_SETTINGS_CATEGORY']


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
        sys.exit('GraphQL error: ' + json.dumps(out['errors'])[:400])
    return out['data']


QUERY = """query($t: TranslatableResourceType!, $after: String) {
  translatableResources(resourceType: $t, first: 50, after: $after) {
    nodes { resourceId translatableContent { key value digest } translations(locale:"ar"){ key } }
    pageInfo { hasNextPage endCursor } } }"""


def main():
    load_env()
    spec = json.loads(DICT.read_text())
    locale = spec.get('_locale', 'ar')
    table = {**spec.get('from_collections', {}), **spec.get('authored', {})}
    apply = '--apply' in sys.argv
    show_missing = '--missing' in sys.argv

    total_hits = total_written = 0
    missing = {}

    for rtype in TYPES:
        cursor = None
        while True:
            page = gql(QUERY, {'t': rtype, 'after': cursor})['translatableResources']
            for node in page['nodes']:
                done = {t['key'] for t in node['translations']}
                payload = []
                for c in node['translatableContent']:
                    val = (c['value'] or '').strip()
                    if not val or c['key'] in done or c['key'] == 'handle':
                        continue
                    # Not prose: resource refs, asset paths, dates, colours.
                    if re.match(r'^(shopify://|https?://|#[0-9a-fA-F]{3,8}$|[\d\-/.,:\s]+$)', val):
                        continue
                    ar = table.get(val)
                    if ar is None:
                        missing.setdefault(val, rtype)
                        continue
                    payload.append({'key': c['key'], 'value': ar, 'locale': locale,
                                    'translatableContentDigest': c['digest']})
                if not payload:
                    continue
                total_hits += len(payload)
                if apply:
                    res = gql("""mutation($id: ID!, $t: [TranslationInput!]!) {
                        translationsRegister(resourceId: $id, translations: $t) {
                          translations { key } userErrors { field message } } }""",
                        {'id': node['resourceId'], 't': payload})['translationsRegister']
                    if res['userErrors']:
                        sys.exit('userErrors: ' + json.dumps(res['userErrors'])[:300])
                    total_written += len(res['translations'])
            if not page['pageInfo']['hasNextPage']:
                break
            cursor = page['pageInfo']['endCursor']

    if show_missing:
        print(f"{len(missing)} untranslated strings are NOT in ar.json:\n")
        for val, rtype in list(missing.items())[:60]:
            print(f"  [{rtype.replace('ONLINE_STORE_THEME_', '')[:14]:14}] {' '.join(val.split())[:78]}")
        return

    print(f"matched {total_hits} strings against ar.json ({len(table)} entries)")
    print(f"not in the dictionary, left alone: {len(missing)}  (see --missing)")
    if apply:
        print(f"registered: {total_written}")
    else:
        print('\ndry run. re-run with --apply to register.')


if __name__ == '__main__':
    main()
