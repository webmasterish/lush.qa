#!/usr/bin/env python3
"""Build the Lush Qatar ingredient encyclopaedia from Lush's own ingredient library.

The theme's ingredients feature reads blog articles, not text: each product
points at a list of articles, and each article carries the ingredient's type,
Latin name and benefits. Something has to create ~450 of those articles in two
languages. That is what this does.

Qatar's WooCommerce product descriptions already name every ingredient, as
links to `lush.com/uk/en/i/<slug>`. Those pages are Lush HQ's own ingredient
library, they publish an Arabic version at `/uk/ar/i/<slug>`, and the content
maps one-to-one onto the metafields the theme reads. So the products tell us
*which* ingredients, and lush.com tells us *what they are*.

    ./harvest-ingredients.py slugs     # WooCommerce -> slugs.json (no network)
    ./harvest-ingredients.py parse     # cache/*.json -> ingredients.json
    ./harvest-ingredients.py report    # coverage of whatever has been parsed

THE FETCH STEP IS DELIBERATELY NOT AUTOMATED HERE. Two reasons. It needs Lush
HQ's agreement, which is Dee's conversation and was not settled when this was
written; and `www.lush.com` returns 403 to every non-browser client regardless
of user-agent, so it needs a real browser rather than urllib. See `fetch.md`
for the exact browser snippet, which is proven and produced `cache/`.

Pipeline, once the pages are cached:

    lush.com page  ->  Shopify
    ---------------------------------------------------------------
    page.title                 article title            (en)
    page.translation.title     article title            (ar)
    page.content               article body, EditorJS   (en)
    page.translation.content   article body, EditorJS   (ar)
    inci_name                  custom.ingredient_subtitle
    ingredient_properties      custom.ingredient_type   Natural|Synthetic
    benefit_1..3               custom.ingredient_benefits (list)
    ingredient_image           article featured image

`ingredient_type` stays English on purpose. `snippets/lush-ingredients-list.liquid`
compares it against "Natural" to pick a color, so it is a controlled
vocabulary, not display text. The Arabic words come from locale keys.
"""
import argparse
import collections
import html
import json
import pathlib
import re
import sqlite3
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
DB = REPO / 'shopify/migration_from_woocommerce/migration-tool/var/migration-tool.sqlite'
CACHE = HERE / 'cache'
MEDIA_BASE = 'https://unicorn.lush.com/media/'

# The ingredient links WooCommerce carries, and the per-ingredient CSS class
# that encodes Natural vs Synthetic. The class hashes come from lush.com's
# build; two generations appear in the scraped descriptions.
INGREDIENT_LINK = re.compile(
    r'<a[^>]*class="([^"]*)"[^>]*href="https://www\.lush\.com/[^/]+/[^/]+/i/([^"#?]+)[^"]*"[^>]*>(.*?)</a>',
    re.S,
)
NATURAL_CLASSES = {'bmjLQM', 'eUdfyy'}
SYNTHETIC_CLASSES = {'iDyjJK', 'HHFgJ'}


# --------------------------------------------------------------------------
# slugs: what Qatar actually sells, straight from the WooCommerce staging DB
# --------------------------------------------------------------------------

def cmd_slugs(args):
    if not DB.exists():
        sys.exit(f'staging database not found: {DB}')

    db = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
    rows = db.execute(
        "SELECT source_id, payload FROM staging WHERE entity='products' AND lang='en'"
    ).fetchall()

    ingredients = {}
    products = {}

    for source_id, payload in rows:
        product = json.loads(payload)
        seen = []
        for match in INGREDIENT_LINK.finditer(product.get('description') or ''):
            classes, slug, label = match.group(1), match.group(2), match.group(3)
            if 'p-ingredients-styles__Ingredient' not in classes:
                continue

            label = html.unescape(re.sub(r'<[^>]+>', '', label)).strip().rstrip(',').strip()
            entry = ingredients.setdefault(slug, {
                'slug': slug,
                'label_en': label,
                'type_from_woocommerce': None,
                'product_count': 0,
            })
            if len(label) > len(entry['label_en'] or ''):
                entry['label_en'] = label

            tokens = set(classes.split())
            guess = None
            if tokens & NATURAL_CLASSES:
                guess = 'Natural'
            elif tokens & SYNTHETIC_CLASSES:
                guess = 'Synthetic'
            if guess and entry['type_from_woocommerce'] in (None, guess):
                entry['type_from_woocommerce'] = guess
            elif guess:
                entry['type_from_woocommerce'] = 'CONFLICT'

            if slug not in seen:
                seen.append(slug)

        if seen:
            products[str(source_id)] = {
                'woocommerce_id': source_id,
                'sku': product.get('sku') or None,
                'title': product.get('name'),
                'status': product.get('status'),
                'ingredients': seen,
            }
            for slug in seen:
                ingredients[slug]['product_count'] += 1

    out = {
        'source': 'WooCommerce product descriptions (staging DB)',
        'ingredient_count': len(ingredients),
        'product_count': len(products),
        'ingredients': [ingredients[s] for s in sorted(ingredients)],
        'products': products,
    }
    path = HERE / 'slugs.json'
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    types = collections.Counter(i['type_from_woocommerce'] for i in ingredients.values())
    print(f'{len(ingredients)} ingredients across {len(products)} products -> {path.name}')
    print(f'  type from WooCommerce markup: {dict(types)}')
    counts = sorted(len(p["ingredients"]) for p in products.values())
    if counts:
        print(f'  ingredients per product: median {counts[len(counts) // 2]}, max {counts[-1]}')


# --------------------------------------------------------------------------
# parse: cached lush.com pages -> import-ready articles
# --------------------------------------------------------------------------

def editorjs_to_html(raw):
    """lush.com stores article bodies as EditorJS blocks. Shopify wants HTML."""
    if not raw:
        return ''
    try:
        doc = json.loads(raw)
    except (TypeError, ValueError):
        # Some pages are plain HTML already.
        return raw.strip()

    parts = []
    for block in doc.get('blocks', []):
        kind = block.get('type')
        data = block.get('data') or {}
        if kind == 'paragraph':
            text = (data.get('text') or '').strip()
            if text:
                parts.append(f'<p>{text}</p>')
        elif kind == 'header':
            level = min(max(int(data.get('level') or 2), 2), 6)
            text = (data.get('text') or '').strip()
            if text:
                parts.append(f'<h{level}>{text}</h{level}>')
        elif kind == 'list':
            tag = 'ol' if data.get('style') == 'ordered' else 'ul'
            items = ''.join(f'<li>{str(i).strip()}</li>' for i in data.get('items') or [] if str(i).strip())
            if items:
                parts.append(f'<{tag}>{items}</{tag}>')
        elif kind == 'quote':
            text = (data.get('text') or '').strip()
            if text:
                parts.append(f'<blockquote>{text}</blockquote>')
        elif kind in ('image', 'simpleImage'):
            url = (data.get('file') or {}).get('url') or data.get('url')
            if url:
                caption = html.escape(data.get('caption') or '')
                parts.append(f'<img src="{html.escape(url)}" alt="{caption}">')
        # Unknown block types are skipped rather than guessed at; `report`
        # counts them so nothing disappears silently.
        elif kind:
            parts.append(f'<!-- unsupported lush block: {html.escape(kind)} -->')
    return '\n'.join(parts)


def first_attr(attrs, key, translated=False):
    values = attrs.get(key) or []
    if not values:
        return None
    value = values[0]
    if translated and value.get('translation'):
        return value['translation']
    return value.get('name')


def load_cache():
    if not CACHE.is_dir():
        sys.exit(f'no cache directory: {CACHE}\nSee fetch.md for how to populate it.')
    records = []
    for path in sorted(CACHE.glob('*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        records.extend(data if isinstance(data, list) else [data])
    return [r for r in records if not r.get('error')]


def cmd_parse(args):
    records = load_cache()
    if not records:
        sys.exit('cache holds no usable records')

    by_slug = collections.defaultdict(dict)
    for record in records:
        by_slug[record['slug']][record.get('locale', 'en')] = record

    articles = []
    for slug in sorted(by_slug):
        locales = by_slug[slug]
        base = locales.get('en') or next(iter(locales.values()))
        page = base['page']
        attrs = base.get('attributes') or {}

        benefits = [
            first_attr(attrs, key)
            for key in ('benefit_1', 'benefit_2', 'benefit_3')
        ]
        benefits = [b for b in benefits if b]

        image = first_attr(attrs, 'ingredient_image')
        article = {
            'handle': slug,
            'source_url': base.get('fetched_from'),
            'published': bool(page.get('isPublished', True)),
            'image': (MEDIA_BASE + image) if image else None,
            'metafields': {
                'custom.ingredient_type': first_attr(attrs, 'ingredient_properties') or 'Synthetic',
                'custom.ingredient_subtitle': first_attr(attrs, 'inci_name'),
                'custom.ingredient_benefits': benefits,
            },
            'translations': {},
        }

        for locale, record in sorted(locales.items()):
            page = record['page']
            translation = page.get('translation') or {}
            if locale == 'en' or not translation:
                title = page.get('title')
                body = page.get('content')
            else:
                title = translation.get('title') or page.get('title')
                body = translation.get('content') or page.get('content')
            article['translations'][locale] = {
                'title': title,
                'body_html': editorjs_to_html(body),
            }

        articles.append(article)

    out = {
        'source': 'lush.com ingredient library',
        'article_count': len(articles),
        'locales': sorted({loc for a in articles for loc in a['translations']}),
        'articles': articles,
    }
    path = HERE / 'ingredients.json'
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{len(articles)} ingredient articles -> {path.name}')
    cmd_report(args, articles=articles)


# --------------------------------------------------------------------------
# report: is the harvest good enough to build on?
# --------------------------------------------------------------------------

def cmd_report(args, articles=None):
    if articles is None:
        path = HERE / 'ingredients.json'
        if not path.exists():
            sys.exit('nothing parsed yet -- run `parse` first')
        articles = json.loads(path.read_text(encoding='utf-8'))['articles']

    total = len(articles)
    if not total:
        return

    def pct(n):
        return f'{n:4} / {total}  ({100 * n // total:3}%)'

    types = collections.Counter(a['metafields']['custom.ingredient_type'] for a in articles)
    print()
    print(f'  type Natural / Synthetic   {dict(types)}')
    print(f'  has Latin name             {pct(sum(1 for a in articles if a["metafields"]["custom.ingredient_subtitle"]))}')
    print(f'  has benefit chips          {pct(sum(1 for a in articles if a["metafields"]["custom.ingredient_benefits"]))}')
    print(f'  has image                  {pct(sum(1 for a in articles if a["image"]))}')

    for locale in sorted({loc for a in articles for loc in a['translations']}):
        translated = sum(1 for a in articles if (a['translations'].get(locale) or {}).get('body_html'))
        print(f'  has {locale} body               {pct(translated)}')

    if 'ar' in {loc for a in articles for loc in a['translations']}:
        same = sum(
            1 for a in articles
            if a['translations'].get('ar', {}).get('title') == a['translations'].get('en', {}).get('title')
        )
        print(f'  ar title still English     {pct(same)}')

    unsupported = collections.Counter(
        m for a in articles for t in a['translations'].values()
        for m in re.findall(r'<!-- unsupported lush block: ([^ ]+) -->', t.get('body_html') or '')
    )
    if unsupported:
        print(f'  UNSUPPORTED content blocks {dict(unsupported)}')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('slugs', help='extract ingredient slugs from the WooCommerce staging DB')
    sub.add_parser('parse', help='turn cached lush.com pages into import-ready articles')
    sub.add_parser('report', help='coverage of the parsed articles')
    args = parser.parse_args()
    {'slugs': cmd_slugs, 'parse': cmd_parse, 'report': cmd_report}[args.command](args)


if __name__ == '__main__':
    main()
