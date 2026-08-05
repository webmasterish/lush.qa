#!/usr/bin/env python3
"""Import lush.qa's blog posts into the Shopify `news` blog, English and Arabic.

Source is the live WooCommerce site's REST API (read-only). For each pair in
articles.json this creates the English article, attaches its featured image,
and registers the Arabic title/body/summary as a translation -- so Arabic is a
translation of one article, not a second article, which is how Shopify expects
a bilingual store to work.

HTML is kept but stripped: the WordPress markup is `div/p/em/br` carrying
theme CSS classes that mean nothing in Shopify. Tags and real links survive;
class, style, id and data-* do not.

    ./import-articles.py                # dry run: show what would be created
    ./import-articles.py --apply        # create them
    ./import-articles.py --show 5424    # print the cleaned HTML for one post

Credentials: WooCommerce store URL and the Shopify Admin token both come from
the migration tool's project env. The token needs write_content (articles) and
write_translations.
"""
import json, os, re, sys, urllib.request, pathlib, html as htmllib

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENV = REPO / 'shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env'
MANIFEST = HERE / 'articles.json'
LOCALE = 'ar'

# Attributes worth keeping. Everything else is presentational WordPress noise.
KEEP_ATTRS = {'href', 'src', 'alt', 'title', 'target', 'rel'}


def load_env():
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())


def wp(path):
    url = f"{os.environ['WOO_STORE_URL'].rstrip('/')}/wp-json/wp/v2/{path}"
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


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


def clean_html(raw):
    """Keep the structure, drop the WordPress theme's presentational cruft."""
    def strip_attrs(m):
        tag, attrs = m.group(1), m.group(2) or ''
        kept = [f'{k}="{v}"' for k, v in re.findall(r'([a-zA-Z-]+)\s*=\s*"([^"]*)"', attrs)
                if k.lower() in KEEP_ATTRS]
        return f"<{tag}{' ' + ' '.join(kept) if kept else ''}>"

    out = re.sub(r'<([a-zA-Z0-9]+)((?:\s[^>]*)?)>', strip_attrs, raw)
    out = re.sub(r'<div\s*>\s*</div>', '', out)          # emptied wrappers
    out = re.sub(r'\n{3,}', '\n\n', out)
    out = re.sub(r'[ \t]{2,}', ' ', out)
    return out.strip()


def fetch(post_id):
    p = wp(f'posts/{post_id}')
    img = None
    if p.get('featured_media'):
        try:
            m = wp(f"media/{p['featured_media']}?_fields=source_url,alt_text")
            img = {'url': m.get('source_url'), 'alt': m.get('alt_text') or ''}
        except Exception:
            pass
    author = 'LUSH'
    if p.get('author'):
        try:
            author = wp(f"users/{p['author']}?_fields=name").get('name') or author
        except Exception:
            pass          # author endpoint may require auth; the default is right anyway
    return {
        'author': author,
        'title': htmllib.unescape(p['title']['rendered']),
        'body': clean_html(p['content']['rendered']),
        'summary': htmllib.unescape(re.sub('<[^>]+>', '', p['excerpt']['rendered'])).strip(),
        'date': p['date'],
        'image': img,
    }


def register_translation(resource_id, values):
    """Same approach the migration tool uses: digests first, then register."""
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
    spec = json.loads(MANIFEST.read_text())

    if '--show' in sys.argv:
        print(fetch(int(sys.argv[sys.argv.index('--show') + 1]))['body'][:3000])
        return

    blog_handle = spec['_target_blog']
    blogs = {b['handle']: b['id'] for b in
             gql('{ blogs(first:50){ nodes { id handle } } }')['blogs']['nodes']}
    if blog_handle not in blogs:
        sys.exit(f"blog '{blog_handle}' not found on the store")

    existing = {a['handle'] for a in
                gql('{ articles(first:250){ nodes { handle } } }')['articles']['nodes']}

    apply = '--apply' in sys.argv
    for art in spec['articles']:
        if art['handle'] in existing:
            print(f"skip   {art['handle']} (already on the store)")
            continue
        en = fetch(art['en_id'])
        ar = fetch(art['ar_id'])
        print(f"\n{art['handle']}")
        print(f"   EN {en['title'][:58]}   body {len(en['body'])} chars")
        print(f"   AR {ar['title'][:58]}   body {len(ar['body'])} chars")
        print(f"   image {(en['image'] or {}).get('url', 'none').split('/')[-1]}   author {en['author']}")
        if not apply:
            continue

        # author is required and must not be null
        payload = {'blogId': blogs[blog_handle], 'title': en['title'],
                   'handle': art['handle'], 'body': en['body'],
                   'summary': en['summary'], 'publishDate': en['date'],
                   'isPublished': True, 'author': {'name': en['author']}}
        if en['image'] and en['image']['url']:
            payload['image'] = {'url': en['image']['url'], 'altText': en['image']['alt']}
        res = gql("""mutation($article: ArticleCreateInput!) {
            articleCreate(article: $article) {
              article { id handle } userErrors { field message } } }""",
            {'article': payload})['articleCreate']
        if res['userErrors']:
            sys.exit('articleCreate userErrors: ' + json.dumps(res['userErrors'])[:300])
        aid = res['article']['id']
        n = register_translation(aid, {'title': ar['title'], 'body': ar['body'],
                                       'summary_html': ar['summary']})
        print(f"   created {aid.split('/')[-1]}  +{n} Arabic fields")

    if not apply:
        print('\ndry run. re-run with --apply to create them.')


if __name__ == '__main__':
    main()
