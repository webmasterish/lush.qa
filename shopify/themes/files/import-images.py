#!/usr/bin/env python3
"""Import homepage imagery from the WooCommerce site into Shopify's Files.

Content > Files is surface C (see docs/theme-phase.md): store data with no file
representation. homepage-images.json is the versioned record of what was
imported and why; this script applies it.

Shopify fetches each source URL itself (fileCreate accepts an external
originalSource), so nothing is downloaded or stored in the repo. The filename
is set explicitly because theme settings reference files as
shopify://shop_images/<filename> -- rename one here and index.json must follow.

Re-running is safe: files already present are reported and skipped, never
duplicated.

    ./import-images.py              # dry run: show what would be imported
    ./import-images.py --apply      # import
    ./import-images.py --refs       # print the shopify:// refs for index.json

Credentials come from the migration tool's project env; the Admin API token
needs write_files.
"""
import json, os, sys, time, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
MANIFEST = HERE / 'homepage-images.json'


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


def existing_filenames():
    """Filenames already in Content > Files, so a re-run does not duplicate."""
    names, cursor = set(), None
    while True:
        data = gql("""query($after: String) {
            files(first: 250, after: $after) {
              nodes { ... on MediaImage { id image { url } } }
              pageInfo { hasNextPage endCursor }
            } }""", {'after': cursor})
        for n in data['files']['nodes']:
            url = (n or {}).get('image', {}).get('url') if n else None
            if url:
                names.add(url.split('/')[-1].split('?')[0])
        page = data['files']['pageInfo']
        if not page['hasNextPage']:
            return names
        cursor = page['endCursor']


def main():
    spec = json.loads(MANIFEST.read_text())
    wanted = spec['files']

    if '--refs' in sys.argv:
        print('Paste into templates/index.json:')
        for f in wanted:
            print(f"  {f['used_by']:52} shopify://shop_images/{f['filename']}")
        return

    load_env()
    have = existing_filenames()
    todo = [f for f in wanted if f['filename'] not in have]
    skip = [f for f in wanted if f['filename'] in have]

    print(f"manifest: {len(wanted)} images   already in Files: {len(skip)}   to import: {len(todo)}")
    for f in skip:
        print(f"   skip   {f['filename']}")
    for f in todo:
        print(f"   import {f['filename']:34} <- {f['source_url'].split('/uploads/')[-1]}")

    if not todo:
        print('\nnothing to do.')
        return
    if '--apply' not in sys.argv:
        print('\ndry run. re-run with --apply to import.')
        return

    data = gql("""mutation($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files { id fileStatus alt ... on MediaImage { image { width height } } }
          userErrors { field message }
        } }""",
        {'files': [{'contentType': 'IMAGE', 'originalSource': f['source_url'],
                    'filename': f['filename'], 'alt': f['alt']} for f in todo]})
    errs = data['fileCreate']['userErrors']
    if errs:
        sys.exit('userErrors: ' + json.dumps(errs)[:400])

    ids = [f['id'] for f in data['fileCreate']['files']]
    print(f"\nsubmitted {len(ids)} files; waiting for processing...")

    # Shopify fetches the source asynchronously, so poll until each is READY.
    for attempt in range(30):
        time.sleep(2)
        nodes = gql("""query($ids: [ID!]!) {
            nodes(ids: $ids) { ... on MediaImage { id fileStatus fileErrors { message }
              image { url } } } }""", {'ids': ids})['nodes']
        pending = [n for n in nodes if n and n['fileStatus'] == 'PROCESSING']
        if not pending:
            for n in nodes:
                if not n:
                    continue
                name = (n.get('image') or {}).get('url', '').split('/')[-1].split('?')[0]
                err = '; '.join(e['message'] for e in (n.get('fileErrors') or []))
                print(f"   {n['fileStatus']:11} {name or n['id']} {err}")
            break
    else:
        print('   still processing after 60s - check Content > Files in the admin.')

    print('\nrefs for templates/index.json:')
    for f in wanted:
        print(f"   {f['used_by']:52} shopify://shop_images/{f['filename']}")


if __name__ == '__main__':
    main()
