#!/usr/bin/env python3
"""Create or update Shopify pages from versioned definitions, with Arabic.

Pages are surface C content: they live only on the store. Each *.json here is
the authored source, so a page can be rebuilt or corrected from the repo rather
than retyped in the admin.

Arabic goes in as a translation of the same page (body_ar / title_ar), not as a
second page -- the same way the article importer handles the blog.

    ./apply-pages.py                  # dry run
    ./apply-pages.py --apply          # create or update
    ./apply-pages.py --file branches.json --apply

The Admin token needs write_online_store_pages and write_translations.
"""
import json, os, sys, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
LOCALE = 'ar'


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


def register_translation(resource_id, values):
    content = gql('query($id: ID!) { translatableResource(resourceId: $id) '
                  '{ translatableContent { key digest } } }',
                  {'id': resource_id})['translatableResource']['translatableContent']
    digests = {c['key']: c['digest'] for c in content}
    # Shopify's key names are not what you would guess: a page body is
    # body_html, not body. Map the obvious aliases, then report anything still
    # unmatched -- silently dropping a key looks like success and leaves the
    # field untranslated.
    payload, dropped = [], []
    for k, v in values.items():
        if not v:
            continue
        key = k if k in digests else next((a for a in (f'{k}_html', k.replace('_html', ''))
                                           if a in digests), None)
        if key is None:
            dropped.append(f"{k} (available: {', '.join(digests)})")
            continue
        payload.append({'key': key, 'value': v, 'locale': LOCALE,
                        'translatableContentDigest': digests[key]})
    if dropped:
        print('   WARNING: no translatable field for ' + '; '.join(dropped))
    if not payload:
        return 0
    res = gql("""mutation($id: ID!, $t: [TranslationInput!]!) {
        translationsRegister(resourceId: $id, translations: $t) {
          translations { key } userErrors { field message } } }""",
        {'id': resource_id, 't': payload})['translationsRegister']
    if res['userErrors']:
        sys.exit('translation userErrors: ' + json.dumps(res['userErrors'])[:300])
    return len(res['translations'])


def main():
    load_env()
    files = ([HERE / sys.argv[sys.argv.index('--file') + 1]] if '--file' in sys.argv
             else sorted(HERE.glob('*.json')))
    apply = '--apply' in sys.argv

    existing = {p['handle']: p['id'] for p in
                gql('{ pages(first:250){ nodes { id handle } } }')['pages']['nodes']}

    for f in files:
        spec = json.loads(f.read_text())
        h = spec['handle']
        action = 'update' if h in existing else 'create'
        print(f"{action:7} {h:20} {spec['title']:22} {len(spec['body'])} chars"
              f"{'  +ar' if spec.get('body_ar') else ''}")
        if not apply:
            continue

        if action == 'create':
            res = gql("""mutation($page: PageCreateInput!) {
                pageCreate(page: $page) { page { id handle } userErrors { field message } } }""",
                {'page': {'title': spec['title'], 'handle': h, 'body': spec['body'],
                          'isPublished': True}})['pageCreate']
        else:
            res = gql("""mutation($id: ID!, $page: PageUpdateInput!) {
                pageUpdate(id: $id, page: $page) { page { id handle } userErrors { field message } } }""",
                {'id': existing[h], 'page': {'title': spec['title'], 'body': spec['body']}})['pageUpdate']
        if res['userErrors']:
            sys.exit('userErrors: ' + json.dumps(res['userErrors'])[:300])

        pid = res['page']['id']
        n = register_translation(pid, {'title': spec.get('title_ar'), 'body': spec.get('body_ar')})
        print(f"        -> {pid.split('/')[-1]}  +{n} Arabic fields")

    if not apply:
        print('\ndry run. re-run with --apply.')


if __name__ == '__main__':
    main()
