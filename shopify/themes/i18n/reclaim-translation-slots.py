#!/usr/bin/env python3
"""Free translation slots on the theme locale resource, with a backup.

A translatable resource holds at most **3,400 translated keys** -- Shopify
rejects the rest with TOO_MANY_KEYS_FOR_RESOURCE. The theme locale content
resource has 4,458 translatable keys, so on a bilingual store the last thousand
simply cannot be translated. Which thousand is a choice.

Translate & Adapt's auto-translate made that choice badly here: it filled the
Shopify-hosted **account screens** (payment methods, order details, B2B) and
left the checkout's "Pay now" and "Continue to shipping" in English. This
removes translations from screens a shopper rarely opens, so the checkout --
which every buyer reads on every order -- can have them.

Every removed key is written to reclaimed-<locale>.json first, so the decision
is reversible: feed that file back through translationsRegister to restore.

    ./reclaim-translation-slots.py            # what would be freed
    ./reclaim-translation-slots.py --apply    # back up, then free

Needs write_translations.
"""
import json
import os
import pathlib
import sys
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
TOML = REPO / 'shopify/themes/be-yours/shopify.theme.toml'
LOCALE = 'ar'
BACKUP = HERE / f'reclaimed-{LOCALE}.json'

# Screens a Lush Qatar shopper meets rarely or never, ranked below the checkout.
# B2B is not in use at all; saved payment methods may not even be offered by a
# local Qatar gateway; order details is reachable but well past the purchase.
RECLAIM = [
    'customer_accounts.B2B.',
    'customer_accounts.payment_methods.',
    'customer_accounts.order_details.',
]


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


def theme_id():
    section = None
    for line in TOML.read_text().splitlines():
        line = line.strip()
        if line.startswith('['):
            section = line
        elif line.startswith('theme') and section and 'build' in section:
            return line.split('=', 1)[1].strip().strip('"')
    sys.exit(f'no build theme id in {TOML}')


def main():
    apply = '--apply' in sys.argv
    load_env()

    gid = f'gid://shopify/OnlineStoreThemeLocaleContent/{theme_id()}'
    node = gql("""query($ids:[ID!]!){ translatableResourcesByIds(resourceIds:$ids, first:1){
        nodes{ resourceId translations(locale:"%s"){ key value } } } }""" % LOCALE,
               {'ids': [gid]})['translatableResourcesByIds']['nodes'][0]

    current = {t['key']: t['value'] for t in node['translations']}
    doomed = {k: v for k, v in current.items() if any(k.startswith(p) for p in RECLAIM)}

    print(f'translated keys now  {len(current)} / 3400   (slots free: {3400 - len(current)})')
    print(f'to reclaim           {len(doomed)}')
    for prefix in RECLAIM:
        print(f'   {sum(1 for k in doomed if k.startswith(prefix)):4}  {prefix}')
    print(f'slots after          {3400 - len(current) + len(doomed)}')

    if not apply:
        print('\ndry run. re-run with --apply to back up and free.')
        return

    BACKUP.write_text(json.dumps({
        '_source': f'Translations removed from {gid} to free slots under the '
                   f'3,400-key cap. Re-register these to restore them.',
        '_locale': LOCALE,
        'strings': dict(sorted(doomed.items())),
    }, ensure_ascii=False, indent=1) + '\n')
    print(f'\nbacked up {len(doomed)} translations to {BACKUP.relative_to(REPO)}')

    keys = sorted(doomed)
    removed = 0
    for i in range(0, len(keys), 50):
        batch = keys[i:i + 50]
        res = gql("""mutation($id:ID!,$keys:[String!]!,$locales:[String!]!){
            translationsRemove(resourceId:$id, translationKeys:$keys, locales:$locales){
              translations{ key } userErrors{ field message } } }""",
                  {'id': node['resourceId'], 'keys': batch, 'locales': [LOCALE]})['translationsRemove']
        if res['userErrors']:
            sys.exit('userErrors: ' + json.dumps(res['userErrors'])[:300])
        removed += len(res['translations'])

    print(f'removed {removed}')


if __name__ == '__main__':
    main()
