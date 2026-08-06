#!/usr/bin/env python3
"""Product tile labels — the badges Be Yours renders on product cards.

Be Yours already ships per-product labels: `snippets/card-product.liquid` reads
the product metafields `theme.label` (a list) and `theme.label_color`, renders
one badge per value inside `.card__badge`, and picks black or white text by
contrast against the chosen color. `snippets/mega-showcase-card.liquid` shows
the first one. Lush KSA and Lush Lebanon both run on this same mechanism, which
is why Lebanon's brand CSS targets `.card__badge .badge`.

Note the namespace is literally called `theme`. It is an ordinary product
metafield set in the admin under Product > Metafields, not a theme setting.

    ./product-labels.py define              # create the two definitions
    ./product-labels.py set --handle x --labels Vegan Bestseller
    ./product-labels.py backfill --dry-run  # from the WooCommerce staging data
    ./product-labels.py show --handle x     # what a product currently carries

Backfill sources, measured against the 538-product staging set:

    Limited Edition   tag `Limited Edition`        11 products (all drafts)
    Bestseller        category `Best Sellers`      29
    New               category `New Products`     162
    Vegan             nothing structured in Woo -- needs Dee to designate

Arabic: the theme prints the metafield value verbatim, so each label value
needs a translation registered per product. `set` and `backfill` do that from
the AR map below, so the Arabic storefront shows Arabic badges.
"""
import argparse
import collections
import json
import os
import pathlib
import sqlite3
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
DB = REPO / 'shopify/migration_from_woocommerce/migration-tool/var/migration-tool.sqlite'

NAMESPACE = 'theme'
DEFAULT_COLOR = '#ffb503'          # the Lush highlight yellow already used in the theme

# The controlled vocabulary and its Arabic. Kept here rather than in the store
# so the wording is versioned and reviewable.
AR = {
    'Vegan': 'نباتي',
    'Bestseller': 'الأكثر مبيعًا',
    'New': 'جديد',
    'Limited Edition': 'إصدار محدود',
}

# WooCommerce signal -> label
BACKFILL = [
    ('tag', 'Limited Edition', 'Limited Edition'),
    ('category', 'Best Sellers', 'Bestseller'),
    ('category', 'New Products', 'New'),
]


def load_env():
    for line in ENV.read_text().splitlines():
        if '=' in line and not line.strip().startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())


def gql(query, variables=None, tries=3):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    url = (f"https://{os.environ['SHOPIFY_STORE_DOMAIN']}"
           f"/admin/api/{os.environ['SHOPIFY_API_VERSION']}/graphql.json")
    for attempt in range(tries):
        req = urllib.request.Request(url, data=body, headers={
            'X-Shopify-Access-Token': os.environ['SHOPIFY_ADMIN_API_TOKEN'],
            'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503) and attempt < tries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise
        if d.get('errors'):
            raise SystemExit(f'GraphQL error: {json.dumps(d["errors"], indent=2)}')
        return d['data']
    raise SystemExit('exhausted retries')


def check(payload, key):
    errs = (payload.get(key) or {}).get('userErrors') or []
    if errs:
        raise SystemExit(f'{key} failed: {json.dumps(errs, indent=2)}')
    return payload


# NOTE: definitions created through the API default to `storefront: NONE`,
# unlike ones created in the admin UI, which default to PUBLIC_READ. Without
# PUBLIC_READ the theme's Liquid cannot read the metafield and the badge
# renders as an empty div with no error anywhere. Always set it explicitly.
ACCESS = {'storefront': 'PUBLIC_READ'}

DEFINITIONS = [
    {'name': 'Product label', 'namespace': NAMESPACE, 'key': 'label',
     'type': 'list.single_line_text_field', 'ownerType': 'PRODUCT',
     'access': ACCESS,
     'description': 'Badges shown on the product tile, e.g. Vegan, Bestseller.'},
    {'name': 'Product label color', 'namespace': NAMESPACE, 'key': 'label_color',
     'type': 'color', 'ownerType': 'PRODUCT',
     'access': ACCESS,
     'description': 'Background for this product\'s tile badges. Text color is '
                    'chosen automatically for contrast.'},
]


def cmd_define(args):
    existing = {
        (d['namespace'], d['key'])
        for d in gql("""query{ metafieldDefinitions(first:100, ownerType: PRODUCT){
             nodes{ namespace key } } }""")['metafieldDefinitions']['nodes']
    }
    for definition in DEFINITIONS:
        pair = (definition['namespace'], definition['key'])
        if pair in existing:
            print(f'  exists: {pair[0]}.{pair[1]}')
            continue
        if args.dry_run:
            print(f'  would create: {pair[0]}.{pair[1]} ({definition["type"]})')
            continue
        check(gql("""
          mutation($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
              createdDefinition { namespace key type { name } }
              userErrors { field message code } } }
        """, {'definition': definition}), 'metafieldDefinitionCreate')
        print(f'  created: {pair[0]}.{pair[1]} ({definition["type"]})')


def product_by_handle(handle):
    p = gql("""query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id title handle } }""",
            {'h': handle})['productByIdentifier']
    if not p:
        sys.exit(f'no product with handle {handle}')
    return p


def apply_labels(product, labels, color, dry):
    unknown = [l for l in labels if l not in AR]
    if unknown:
        print(f'    note: no Arabic for {unknown} -- add it to AR in this script')
    if dry:
        print(f'  would set {product["handle"]}: {labels} color={color}')
        return
    fields = [{'ownerId': product['id'], 'namespace': NAMESPACE, 'key': 'label',
               'type': 'list.single_line_text_field', 'value': json.dumps(labels)}]
    if color:
        fields.append({'ownerId': product['id'], 'namespace': NAMESPACE, 'key': 'label_color',
                       'type': 'color', 'value': color})
    check(gql("""
      mutation($metafields:[MetafieldsSetInput!]!){
        metafieldsSet(metafields:$metafields){ metafields{ key } userErrors{ field message } } }
    """, {'metafields': fields}), 'metafieldsSet')
    print(f'  set {product["handle"]}: {labels} color={color}')
    register_arabic(product, labels)


def register_arabic(product, labels):
    """The theme prints label values verbatim, so Arabic is per product.

    A metafield is its own translatable resource, addressed by the metafield's
    GID rather than the product's, with a single translatable key `value`. For
    a list type that value is the JSON array, so the translation is the array
    of Arabic strings, not a plain string.
    """
    arabic = [AR.get(l, l) for l in labels]
    if arabic == labels:
        return
    mf = gql("""query($h:String!){ productByIdentifier(identifier:{handle:$h}){
                  metafield(namespace:"%s", key:"label"){ id } } }""" % NAMESPACE,
             {'h': product['handle']})['productByIdentifier']['metafield']
    if not mf:
        print('    Arabic skipped: label metafield not found')
        return
    content = gql("""query($id:ID!){ translatableResource(resourceId:$id){
        translatableContent{ key value digest locale } } }""",
                  {'id': mf['id']})['translatableResource']['translatableContent']
    src = next((c for c in content if c['key'] == 'value'), None)
    if not src:
        print('    Arabic skipped: metafield exposes no translatable value')
        return
    check(gql("""
      mutation($id:ID!, $translations:[TranslationInput!]!){
        translationsRegister(resourceId:$id, translations:$translations){
          userErrors{ field message } } }
    """, {'id': mf['id'], 'translations': [{
        'key': 'value', 'locale': 'ar',
        'value': json.dumps(arabic, ensure_ascii=False),
        'translatableContentDigest': src['digest']}]}),
        'translationsRegister')
    print(f'    ar: {arabic}')


def cmd_set(args):
    apply_labels(product_by_handle(args.handle), args.labels, args.color, args.dry_run)


def cmd_show(args):
    p = gql("""query($h:String!){ productByIdentifier(identifier:{handle:$h}){
        id title handle
        label: metafield(namespace:"theme", key:"label"){ value }
        color: metafield(namespace:"theme", key:"label_color"){ value } } }""",
            {'h': args.handle})['productByIdentifier']
    if not p:
        sys.exit(f'no product with handle {args.handle}')
    print(f'  {p["handle"]}: label={(p.get("label") or {}).get("value")} '
          f'color={(p.get("color") or {}).get("value")}')


def woo_labels():
    """WooCommerce product id -> labels, from the staging data.

    Keyed on the Woo id, NOT the slug. 140 of Qatar's 538 products share a name
    with another product (Snow Fairy x10, Sleepy x8), so Shopify handed out
    handles like `banoffee-pie-2`, and slug and handle do not line up. Matching
    on the slug silently labels the wrong product -- during testing it put a
    New badge on a draft while the live product went unlabelled.
    """
    db = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
    out = collections.defaultdict(list)
    for (source_id, payload) in db.execute(
            "SELECT source_id, payload FROM staging WHERE entity='products' AND lang='en'"):
        d = json.loads(payload)
        tags = {t.get('name') for t in (d.get('tags') or [])}
        cats = {c.get('name') for c in (d.get('categories') or [])}
        for kind, source, label in BACKFILL:
            if (source in tags) if kind == 'tag' else (source in cats):
                out[str(source_id)].append(label)
    return out


def products_by_source_id():
    """Shopify products keyed by the dotaim_migration.source_id we stamped on."""
    out, cursor = {}, None
    while True:
        d = gql("""query($after:String){ products(first:250, after:$after){
              nodes{ id handle title status
                     src: metafield(namespace:"dotaim_migration", key:"source_id"){ value } }
              pageInfo{ hasNextPage endCursor } } }""", {'after': cursor})['products']
        for n in d['nodes']:
            key = (n.get('src') or {}).get('value')
            if key:
                out[key] = n
        if not d['pageInfo']['hasNextPage']:
            return out
        cursor = d['pageInfo']['endCursor']


def cmd_backfill(args):
    mapping = woo_labels()
    print(f'{len(mapping)} products carry at least one label in the Woo data')
    counts = collections.Counter(l for labels in mapping.values() for l in labels)
    print(f'  {dict(counts)}')
    catalogue = products_by_source_id()
    resolved = {sid: catalogue[sid] for sid in mapping if sid in catalogue}
    missing = [sid for sid in mapping if sid not in catalogue]
    print(f'  {len(resolved)} matched to Shopify products, {len(missing)} unmatched')
    live = {sid: p for sid, p in resolved.items() if p['status'] == 'ACTIVE'}
    print(f'  {len(live)} of those are ACTIVE'
          f'{"" if args.include_drafts else " -- drafts skipped, pass --include-drafts to change"}')
    targets = resolved if args.include_drafts else live

    if args.dry_run:
        for sid, p in list(targets.items())[:10]:
            print(f'    {p["handle"]:38} {mapping[sid]}')
        if len(targets) > 10:
            print(f'    ... and {len(targets) - 10} more')
        return
    for sid, product in targets.items():
        apply_labels(product, mapping[sid], args.color, False)
        time.sleep(0.25)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--color', default=DEFAULT_COLOR)
    p.add_argument('--include-drafts', action='store_true',
                   help='label draft products too (default: ACTIVE only)')
    sub = p.add_subparsers(dest='command', required=True)
    sub.add_parser('define')
    s = sub.add_parser('set'); s.add_argument('--handle', required=True); s.add_argument('--labels', nargs='+', required=True)
    s = sub.add_parser('show'); s.add_argument('--handle', required=True)
    sub.add_parser('backfill')
    args = p.parse_args()
    load_env()
    {'define': cmd_define, 'set': cmd_set, 'show': cmd_show, 'backfill': cmd_backfill}[args.command](args)


if __name__ == '__main__':
    main()
