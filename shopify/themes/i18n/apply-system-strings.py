#!/usr/bin/env python3
"""Register Arabic for Shopify's own storefront system strings.

Translate & Adapt calls these "Theme content > Checkout & system". They are not
theme strings and they are not in `locales/*.json`: they live on the store as
translations of the `ONLINE_STORE_THEME_LOCALE_CONTENT` resource, keyed by
Shopify's own key, and **Shopify serves English until each key is overridden**.
Verified on the live store 2026-08-07 -- the Arabic checkout renders in English
except for the keys that carry an override.

Keyed by key rather than by English value, unlike apply-translations.py: the
values repeat (three different keys read "Products") and getting the wrong one
is silent.

    ./apply-system-strings.py           # dry run, with a placeholder check
    ./apply-system-strings.py --apply   # register

Needs write_translations.
"""
import json
import os
import pathlib
import re
import sys
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
STRINGS = HERE / 'system-strings-ar.json'

PLACEHOLDER = re.compile(r'%\{[a-z_]+\}')


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


TOML = REPO / 'shopify/themes/be-yours/shopify.theme.toml'


def live_theme_id():
    """The build/live theme id, read from shopify.theme.toml.

    Not queried from the API: the migration app's token has no `read_themes`
    scope and does not need one for anything else, so the theme id comes from
    the same file the CLI uses.
    """
    section = None
    for line in TOML.read_text().splitlines():
        line = line.strip()
        if line.startswith('['):
            section = line
        elif line.startswith('theme') and section and 'build' in section:
            return line.split('=', 1)[1].strip().strip('"')
    sys.exit(f'no build theme id in {TOML}')


def theme_locale_resource():
    """The theme's locale-content resource, with every key's current digest."""
    theme = {'name': 'build theme from shopify.theme.toml', 'id': live_theme_id()}
    gid = f"gid://shopify/OnlineStoreThemeLocaleContent/{theme['id']}"
    node = gql("""query($ids:[ID!]!){ translatableResourcesByIds(resourceIds:$ids, first:1){
        nodes { resourceId translatableContent { key value digest }
                translations(locale:"ar"){ key value } } } }""",
               {'ids': [gid]})['translatableResourcesByIds']['nodes'][0]
    return theme, node


def main():
    apply = '--apply' in sys.argv
    load_env()

    wanted = json.loads(STRINGS.read_text())['strings']
    theme, node = theme_locale_resource()
    source = {c['key']: c for c in node['translatableContent']}
    current = {t['key']: t['value'] for t in node['translations']}

    print(f"theme: {theme['name']}")
    print(f"{len(source)} translatable keys on the store, {len(current)} with Arabic")

    payload, skipped, problems = [], 0, []
    for key, arabic in wanted.items():
        content = source.get(key)
        if not content:
            problems.append((key, 'no such key on the store'))
            continue

        # A dropped placeholder renders as literal text to a customer, and a
        # renamed one renders as nothing at all. Neither is visible from here,
        # so check before writing rather than after.
        want = set(PLACEHOLDER.findall(content['value'] or ''))
        got = set(PLACEHOLDER.findall(arabic))
        if want != got:
            problems.append((key, f'placeholders {sorted(want)} -> {sorted(got)}'))
            continue

        if current.get(key) == arabic:
            skipped += 1
            continue

        payload.append({'key': key, 'value': arabic, 'locale': 'ar',
                        'translatableContentDigest': content['digest']})

    if problems:
        print(f'\n{len(problems)} NOT registered:')
        for key, why in problems:
            print(f'  {key:60} {why}')

    print(f'\nto register {len(payload)}, already correct {skipped}')

    if not apply:
        print('\ndry run. re-run with --apply to register.')
        return

    written = 0
    for i in range(0, len(payload), 100):   # translationsRegister caps at 100
        batch = payload[i:i + 100]
        res = gql("""mutation($id: ID!, $t: [TranslationInput!]!) {
            translationsRegister(resourceId: $id, translations: $t) {
              translations { key } userErrors { field message } } }""",
                  {'id': node['resourceId'], 't': batch})['translationsRegister']
        if res['userErrors']:
            sys.exit('userErrors: ' + json.dumps(res['userErrors'])[:400])
        written += len(res['translations'])

    print(f'registered: {written}')


if __name__ == '__main__':
    main()
