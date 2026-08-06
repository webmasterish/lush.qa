#!/usr/bin/env python3
"""Import harvested ingredients into Shopify as blog articles with metafields.

Reads `ingredients.json` (produced by `harvest-ingredients.py parse`) and
creates, on the Qatar store:

  - a blog to hold them (default handle `ingredients`)
  - one article per ingredient, with its featured image pulled from lush.com
    and re-hosted on Shopify, since CDN references are per-store
  - the three article metafields the theme reads
  - the Arabic translation of title and body

Idempotent by article handle: an existing article is updated, not duplicated.

    ./import-ingredients.py --dry-run          # show what would happen
    ./import-ingredients.py                    # create/update everything
    ./import-ingredients.py --slug lemon-oil   # just one

Wiring products to their ingredients is a separate step -- see
`--wire-product`, which takes a product handle and sets `custom.ingredients`
and `custom.ingredients_cards` from `slugs.json`.

Credentials come from the migration tool's project env; the token already has
write_content and write_products.
"""
import argparse
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
BLOG_HANDLE = 'ingredients'
BLOG_TITLE = 'Ingredients'
TEMPLATE_SUFFIX = 'ingredient-blog-post'


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


def user_errors(payload, *keys):
    for key in keys:
        node = payload.get(key) or {}
        errs = node.get('userErrors') or []
        if errs:
            raise SystemExit(f'{key} failed: {json.dumps(errs, indent=2)}')
    return payload


# --------------------------------------------------------------------------

def ensure_blog(dry):
    found = gql("""
      query($q: String!) { blogs(first: 10, query: $q) { nodes { id handle title } } }
    """, {'q': f'handle:{BLOG_HANDLE}'})['blogs']['nodes']
    for b in found:
        if b['handle'] == BLOG_HANDLE:
            print(f'  blog exists: {b["handle"]} ({b["id"]})')
            return b['id']
    if dry:
        print(f'  would create blog: {BLOG_HANDLE}')
        return None
    d = user_errors(gql("""
      mutation($blog: BlogCreateInput!) {
        blogCreate(blog: $blog) { blog { id handle } userErrors { field message } } }
    """, {'blog': {'title': BLOG_TITLE, 'handle': BLOG_HANDLE}}), 'blogCreate')
    blog = d['blogCreate']['blog']
    print(f'  created blog: {blog["handle"]} ({blog["id"]})')
    return blog['id']


def find_article(blog_id, handle):
    nodes = gql("""
      query($q: String!) { articles(first: 5, query: $q) { nodes { id handle blog { id } } } }
    """, {'q': f'handle:{handle}'})['articles']['nodes']
    for a in nodes:
        if a['handle'] == handle and a['blog']['id'] == blog_id:
            return a['id']
    return None


def upsert_article(blog_id, art, dry):
    handle = art['handle']
    en = art['translations'].get('en') or {}
    existing = find_article(blog_id, handle)

    fields = [
        {'namespace': 'custom', 'key': 'ingredient_type',
         'type': 'single_line_text_field',
         'value': art['metafields']['custom.ingredient_type']},
    ]
    if art['metafields'].get('custom.ingredient_subtitle'):
        fields.append({'namespace': 'custom', 'key': 'ingredient_subtitle',
                       'type': 'single_line_text_field',
                       'value': art['metafields']['custom.ingredient_subtitle']})
    benefits = art['metafields'].get('custom.ingredient_benefits') or []
    if benefits:
        fields.append({'namespace': 'custom', 'key': 'ingredient_benefits',
                       'type': 'list.single_line_text_field',
                       'value': json.dumps(benefits)})

    payload = {
        'title': en.get('title') or handle,
        'handle': handle,
        'body': en.get('body_html') or '',
        'isPublished': True,
        # articleCreate rejects a null author. 'LUSH' matches the blog import.
        'author': {'name': 'LUSH'},
        # templates/article.ingredient-blog-post.json
        'templateSuffix': TEMPLATE_SUFFIX,
        'metafields': fields,
    }
    if art.get('image'):
        payload['image'] = {'url': art['image'], 'altText': en.get('title') or handle}

    if dry:
        action = 'update' if existing else 'create'
        print(f'  would {action}: {handle:26} type={art["metafields"]["custom.ingredient_type"]:9} '
              f'benefits={len(benefits)} image={"yes" if art.get("image") else "no"}')
        return None

    if existing:
        payload['id'] = existing
        d = user_errors(gql("""
          mutation($article: ArticleUpdateInput!, $id: ID!) {
            articleUpdate(article: $article, id: $id) {
              article { id handle } userErrors { field message } } }
        """, {'article': {k: v for k, v in payload.items() if k != 'id'}, 'id': existing}),
            'articleUpdate')
        article_id = d['articleUpdate']['article']['id']
        print(f'  updated: {handle}')
    else:
        payload['blogId'] = blog_id
        d = user_errors(gql("""
          mutation($article: ArticleCreateInput!) {
            articleCreate(article: $article) {
              article { id handle } userErrors { field message } } }
        """, {'article': payload}), 'articleCreate')
        article_id = d['articleCreate']['article']['id']
        print(f'  created: {handle}')
    return article_id


def translate_article(article_id, art, dry):
    ar = art['translations'].get('ar') or {}
    en = art['translations'].get('en') or {}
    if not ar.get('title') or ar.get('title') == en.get('title'):
        return 0

    digests = gql("""
      query($id: ID!) { translatableResource(resourceId: $id) {
        translatableContent { key value digest locale } } }
    """, {'id': article_id})['translatableResource']['translatableContent']
    by_key = {c['key']: c for c in digests}

    # Shopify's translatable keys for an Article are `title` and `body_html`.
    wanted = {'title': ar.get('title'), 'body_html': ar.get('body_html')}
    payload = []
    for key, value in wanted.items():
        src = by_key.get(key)
        if not src or not value:
            continue
        payload.append({'key': key, 'value': value, 'locale': 'ar',
                        'translatableContentDigest': src['digest']})
    if not payload:
        return 0
    if dry:
        print(f'      would translate to ar: {", ".join(p["key"] for p in payload)}')
        return len(payload)
    user_errors(gql("""
      mutation($id: ID!, $translations: [TranslationInput!]!) {
        translationsRegister(resourceId: $id, translations: $translations) {
          userErrors { field message } } }
    """, {'id': article_id, 'translations': payload}), 'translationsRegister')
    print(f'      translated to ar: {", ".join(p["key"] for p in payload)}')
    return len(payload)


def cmd_import(args):
    path = HERE / 'ingredients.json'
    if not path.exists():
        sys.exit('ingredients.json not found -- run `harvest-ingredients.py parse` first')
    articles = json.loads(path.read_text(encoding='utf-8'))['articles']
    if args.slug:
        articles = [a for a in articles if a['handle'] in args.slug]
        if not articles:
            sys.exit(f'no such slug in ingredients.json: {args.slug}')

    print(f'{"DRY RUN -- " if args.dry_run else ""}importing {len(articles)} ingredient(s)')
    blog_id = ensure_blog(args.dry_run)
    if blog_id is None and not args.dry_run:
        sys.exit('no blog')

    translated = 0
    for art in articles:
        article_id = upsert_article(blog_id, art, args.dry_run)
        if article_id or args.dry_run:
            translated += translate_article(article_id, art, args.dry_run) if article_id else 0
        time.sleep(0.3)
    print(f'done. {translated} Arabic field(s) registered.')


def cmd_wire(args):
    """Set custom.ingredients / custom.ingredients_cards on one product."""
    slugs = json.loads((HERE / 'slugs.json').read_text(encoding='utf-8'))
    product = gql("""
      query($h: String!) { productByIdentifier(identifier: {handle: $h}) { id title handle } }
    """, {'h': args.wire_product})['productByIdentifier']
    if not product:
        sys.exit(f'no product with handle {args.wire_product}')

    wanted = args.ingredients or []
    if not wanted:
        sys.exit('pass --ingredients slug [slug ...]')

    ids = []
    for slug in wanted:
        nodes = gql("""
          query($q: String!) { articles(first: 5, query: $q) { nodes { id handle } } }
        """, {'q': f'handle:{slug}'})['articles']['nodes']
        match = next((n['id'] for n in nodes if n['handle'] == slug), None)
        if not match:
            sys.exit(f'no article for ingredient {slug} -- import it first')
        ids.append(match)

    cards = ids[:args.card_count]
    fields = [
        {'ownerId': product['id'], 'namespace': 'custom', 'key': 'ingredients',
         'type': 'list.article_reference', 'value': json.dumps(ids)},
        {'ownerId': product['id'], 'namespace': 'custom', 'key': 'ingredients_cards',
         'type': 'list.article_reference', 'value': json.dumps(cards)},
    ]
    if args.dry_run:
        print(f'  would wire {product["handle"]}: {len(ids)} ingredients, {len(cards)} cards')
        return
    user_errors(gql("""
      mutation($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { key } userErrors { field message } } }
    """, {'metafields': fields}), 'metafieldsSet')
    print(f'  wired {product["handle"]}: {len(ids)} ingredients, {len(cards)} cards')


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--slug', nargs='*', help='limit to these ingredient handles')
    p.add_argument('--wire-product', metavar='HANDLE',
                   help='set the ingredient metafields on this product instead of importing')
    p.add_argument('--ingredients', nargs='*', help='ingredient handles for --wire-product')
    p.add_argument('--card-count', type=int, default=3,
                   help='how many of them also go in the cards grid (default 3)')
    args = p.parse_args()
    load_env()
    (cmd_wire if args.wire_product else cmd_import)(args)


if __name__ == '__main__':
    main()
