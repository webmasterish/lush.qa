#!/usr/bin/env python3
"""Move images that product descriptions still hotlink from lush.qa into Shopify.

The migration carried product descriptions across verbatim, and 145 of them
embed `<img src="https://lush.qa/...">`. Two eras of the old site are in there:

  /wp-content/uploads/...   74 images, the WordPress era -- **still serving**
  /image/catalog/...        71 images, the OpenCart era  -- already 404

The WordPress ones work today only because lush.qa still answers for static
files while its database is down. **At DNS cutover lush.qa points at Shopify
and every one of them breaks permanently**, which is why this is launch work
and not cleanup.

The dead OpenCart ones are mostly the Arabic descriptions. 33 of the 71 are the
same photograph as an English one under a different path, matched on filename,
so they can point at the same rehosted file. The rest are gone: not on the
server, not in the Internet Archive (checked 2026-08-07). Those are reported,
and `--drop-unresolved` strips the tag, on the grounds that no image beats a
broken one.

Shopify fetches each source itself through fileCreate, so nothing is downloaded
here. Arabic descriptions are a translation of the product, registered against
the English body_html digest -- not a second product.

    ./rehost-legacy-images.py                    # report, write the manifest
    ./rehost-legacy-images.py --apply            # upload and rewrite
    ./rehost-legacy-images.py --apply --drop-unresolved

The Admin token needs write_files, write_products and write_translations.
"""
import json
import os
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
MANIFEST = HERE / 'legacy-images.json'

IMG = re.compile(r'<img[^>]+src="(https?://[^"]*lush\.qa[^"]*)"[^>]*>', re.I)
SRC = re.compile(r'(https?://[^"]*lush\.qa[^"]*)', re.I)


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


def basename(url, loose=False):
    """Filename, normalised enough to match the same photo across both eras."""
    name = urllib.parse.unquote(url).rsplit('/', 1)[-1]
    name = re.sub(r'\.(jpe?g|png|webp)$', '', name, flags=re.I)
    name = re.sub(r'-[0-9a-f]{3}$', '', name)      # WordPress cache-buster
    if loose:
        name = re.sub(r'[-_]?\d+$', '', name)
    return re.sub(r'[^a-z0-9]+', '', name.lower())


def collect():
    """Every product whose English or Arabic description hotlinks lush.qa."""
    found, cursor = [], None
    while True:
        data = gql("""query($c:String){ products(first:100, after:$c){
            pageInfo{ hasNextPage endCursor }
            nodes{ id handle descriptionHtml
                   translations(locale:"ar"){ key value } } } }""", {'c': cursor})['products']
        for p in data['nodes']:
            arabic = next((t['value'] for t in p['translations'] if t['key'] == 'body_html'), None)
            if SRC.search(p['descriptionHtml'] or '') or SRC.search(arabic or ''):
                found.append({'id': p['id'], 'handle': p['handle'],
                              'en': p['descriptionHtml'] or '', 'ar': arabic})
        if not data['pageInfo']['hasNextPage']:
            break
        cursor = data['pageInfo']['endCursor']
    return found


def digests(product_ids):
    """body_html digest per product -- translationsRegister will not take a
    translation without the digest of the source it was made from."""
    out = {}
    for i in range(0, len(product_ids), 50):
        batch = product_ids[i:i + 50]
        nodes = gql("""query($ids:[ID!]!){ translatableResourcesByIds(resourceIds:$ids, first:50){
            nodes{ resourceId translatableContent{ key digest } } } }""",
                    {'ids': batch})['translatableResourcesByIds']['nodes']
        for n in nodes:
            for c in n['translatableContent']:
                if c['key'] == 'body_html':
                    out[n['resourceId']] = c['digest']
    return out


def upload(url):
    """Hand Shopify the URL and let it fetch. Returns the CDN url when ready."""
    created = gql("""mutation($files:[FileCreateInput!]!){ fileCreate(files:$files){
        files{ id fileStatus alt } userErrors{ field message } } }""",
                  {'files': [{'originalSource': url, 'contentType': 'IMAGE',
                              'alt': urllib.parse.unquote(url).rsplit('/', 1)[-1]}]})['fileCreate']
    if created['userErrors']:
        return None, json.dumps(created['userErrors'])[:160]
    file_id = created['files'][0]['id']

    for _ in range(30):
        time.sleep(1.5)
        node = gql("""query($id:ID!){ node(id:$id){ ... on MediaImage {
            fileStatus fileErrors{ message } image{ url } } } }""", {'id': file_id})['node']
        if node['fileStatus'] == 'READY' and node['image']:
            return node['image']['url'], None
        if node['fileStatus'] == 'FAILED':
            return None, '; '.join(e['message'] for e in node['fileErrors'])[:160]
    return None, 'still processing after 45s'


def main():
    apply = '--apply' in sys.argv
    drop = '--drop-unresolved' in sys.argv
    load_env()

    products = collect()
    urls = {}
    for p in products:
        for html in (p['en'], p['ar']):
            for tag in IMG.finditer(html or ''):
                urls.setdefault(tag.group(1), []).append(p['handle'])

    live = {u for u in urls if '/wp-content/' in u}
    dead = {u for u in urls if u not in live}

    strict = {basename(u): u for u in live}
    loose = {basename(u, True): u for u in live}
    twin = {}
    for u in dead:
        match = strict.get(basename(u)) or loose.get(basename(u, True))
        if match:
            twin[u] = match
    unresolved = sorted(dead - set(twin))

    print(f'products with hotlinked images   {len(products)}')
    print(f'distinct image urls              {len(urls)}')
    print(f'  still serving from lush.qa     {len(live)}   (break at DNS cutover)')
    print(f'  already 404, same photo as an English one {len(twin)}')
    print(f'  already 404, unrecoverable     {len(unresolved)}')

    MANIFEST.write_text(json.dumps({
        '_source': 'Generated by rehost-legacy-images.py',
        'live_sources': sorted(live),
        'dead_with_twin': {k: v for k, v in sorted(twin.items())},
        'unrecoverable': unresolved,
    }, ensure_ascii=False, indent=1) + '\n')
    print(f'wrote {MANIFEST.relative_to(REPO)}')

    if not apply:
        print('\ndry run. re-run with --apply to upload and rewrite.')
        return

    print(f'\nuploading {len(live)} images to Files')
    cdn, failed = {}, {}
    for i, url in enumerate(sorted(live), 1):
        new, err = upload(url)
        if new:
            cdn[url] = new
        else:
            failed[url] = err
            print(f'  FAILED {url[-60:]}: {err}')
        if i % 10 == 0:
            print(f'  {i}/{len(live)}')
    print(f'uploaded {len(cdn)}, failed {len(failed)}')

    replacements = dict(cdn)
    for old, source in twin.items():
        if source in cdn:
            replacements[old] = cdn[source]

    body_digests = digests([p['id'] for p in products])
    updated = translated = 0

    for p in products:
        new_en = p['en']
        for old, new in replacements.items():
            new_en = new_en.replace(old, new)
        if drop:
            new_en = IMG.sub(lambda m: '' if SRC.search(m.group(1)) else m.group(0), new_en)

        if new_en != p['en']:
            res = gql("""mutation($input:ProductInput!){ productUpdate(input:$input){
                userErrors{ field message } } }""",
                      {'input': {'id': p['id'], 'descriptionHtml': new_en}})['productUpdate']
            if res['userErrors']:
                print(f"  product {p['handle']}: {json.dumps(res['userErrors'])[:120]}")
            else:
                updated += 1

        if p['ar']:
            new_ar = p['ar']
            for old, new in replacements.items():
                new_ar = new_ar.replace(old, new)
            if drop:
                new_ar = IMG.sub(lambda m: '' if SRC.search(m.group(1)) else m.group(0), new_ar)

            digest = body_digests.get(p['id'])
            if new_ar != p['ar'] and digest:
                res = gql("""mutation($id:ID!,$t:[TranslationInput!]!){
                    translationsRegister(resourceId:$id, translations:$t){
                      userErrors{ field message } } }""",
                          {'id': p['id'], 't': [{'key': 'body_html', 'value': new_ar,
                                                 'locale': 'ar',
                                                 'translatableContentDigest': digest}]})['translationsRegister']
                if res['userErrors']:
                    print(f"  product {p['handle']} [ar]: {json.dumps(res['userErrors'])[:120]}")
                else:
                    translated += 1
        time.sleep(0.1)

    print(f'\nrewrote {updated} English descriptions and {translated} Arabic ones')
    if unresolved and not drop:
        print(f'{len(unresolved)} images stay broken -- re-run with --drop-unresolved to strip those tags')


if __name__ == '__main__':
    main()
