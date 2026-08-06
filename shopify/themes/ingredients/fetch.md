# Fetching the ingredient pages

`harvest-ingredients.py` deliberately does not fetch. This is the fetch step, kept
separate because it is the part that needs Lush HQ's agreement and the part that
cannot use plain HTTP.

## Why not urllib

`www.lush.com` returns **403 to every non-browser client** — `curl`, Python
`urllib`, `WebFetch`, with or without a browser user-agent. Verified 2026-08-05.
A real browser session goes through, and `fetch()` issued from inside a loaded
lush.com page inherits that session, so it works and stays same-origin.

## Where the data is

Each ingredient page is a Next.js document with a `<script id="__NEXT_DATA__">`
payload. Everything needed is in `props.pageProps.page`:

| Path | Becomes |
|---|---|
| `page.title` | article title (English) |
| `page.content` | article body (English), **EditorJS block JSON** |
| `page.translation.title` | article title (Arabic) |
| `page.translation.content` | article body (Arabic), EditorJS block JSON |
| `attributes.inci_name` | `custom.ingredient_subtitle` |
| `attributes.ingredient_properties` | `custom.ingredient_type` |
| `attributes.benefit_1` .. `benefit_3` | `custom.ingredient_benefits` |
| `attributes.ingredient_image` | filename, prefix `https://unicorn.lush.com/media/` |

Two traps worth knowing. The `/ar/` URL still returns **English** in
`page.title` and `page.content` — the Arabic is in `page.translation`, so a
harvester that only reads the top-level fields silently collects English twice.
And bodies are EditorJS JSON, not HTML; `editorjs_to_html()` handles the
conversion and flags any block type it does not recognise.

## The snippet

Run this from a browser already on a lush.com page. It returns the array
`harvest-ingredients.py parse` expects — write it into `cache/`.

```js
async (slugs) => {
  const grab = async (slug, loc) => {
    const r = await fetch(`/uk/${loc}/i/${slug}`);
    if (!r.ok) return { slug, locale: loc, error: r.status };
    const d = new DOMParser().parseFromString(await r.text(), 'text/html');
    const j = JSON.parse(d.getElementById('__NEXT_DATA__').textContent);
    const p = j.props.pageProps.page;
    const attrs = {};
    (p.attributes || []).forEach(a => {
      attrs[a.attribute.slug] = (a.values || []).map(v => ({
        name: v.name,
        translation: v.translation ? v.translation.name : null,
      }));
    });
    return {
      slug, locale: loc,
      fetched_from: `https://www.lush.com/uk/${loc}/i/${slug}`,
      page: {
        id: p.id, slug: p.slug, title: p.title, content: p.content,
        isPublished: p.isPublished,
        pageType: p.pageType && p.pageType.slug,
        translation: p.translation,
      },
      attributes: attrs,
    };
  };
  const out = [];
  for (const s of slugs) {
    for (const l of ['en', 'ar']) {
      out.push(await grab(s, l));
      await new Promise(r => setTimeout(r, 400));  // be a good citizen
    }
  }
  return out;
}
```

## Before running it for real

- **Lush HQ's agreement first.** Open with Dee. This is Lush's own content about
  Lush's own products going onto a Lush franchise store, and it puts Arabic
  ingredient information in front of shoppers who currently get none — but that
  is HQ's call to make, not ours.
- **Scale:** 453 slugs × 2 locales = **906 requests**. Do it once, in batches,
  keep `cache/` as the record, and never re-fetch what is already cached.
- **Throttle.** The snippet already waits 400ms between requests.
- **Images are a separate job.** `ingredients.json` records the
  `unicorn.lush.com` URL; those files have to be downloaded and re-uploaded to
  Qatar's Files, because `shopify://` CDN references are per-store and
  hotlinking someone else's CDN is not an option.

## What is in `cache/` now

`sample-2026-08-05.json` — three ingredients (`sodium-bicarbonate`,
`vanilla-absolute`, `geranium-oil`) in both locales, fetched 2026-08-05 to prove
the pipeline. Enough to build and review the theme against; not a harvest.

**`cache/` is gitignored** by the repo's existing `cache/` rule, which is right
for a full harvest but means the sample does not survive a fresh clone. What is
tracked is the script, this file, `slugs.json` (derived from our own WooCommerce
data, no network needed — regenerate any time with `slugs`) and the sample
`ingredients.json` output. Re-run the snippet above on those three slugs to
rebuild the cache.
