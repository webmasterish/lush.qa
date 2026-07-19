// Categories -> flat Shopify custom collections (PRD §10.2).
// Hierarchy is preserved only as the parent_category metafield (handle),
// consumed later by theme-phase navigation menus.
import { decodeEntities, decodeSlug, stripHtml } from "../util.js";

// Pure transform: staged EN payload (+ optional AR sibling payload, + helpers)
// -> { input, extras }. `helpers.parentHandle(parentId)` resolves the Woo
// parent category id to its (decoded) handle, or null.
export function transformCategory(en, ar, helpers) {
  const title = decodeEntities(en.name);
  const description = en.description ?? "";
  const input = {
    title,
    descriptionHtml: description,
    handle: decodeSlug(en.slug),
    seo: {
      title,
      description: stripHtml(description).slice(0, 320) || undefined,
    },
  };
  if (en.image?.src) {
    input.image = { src: en.image.src, altText: en.image.alt || undefined };
  }
  const extras = {};
  const parent = en.parent ? helpers.parentHandle(en.parent) : null;
  if (parent) extras.parent_category = parent;
  if (ar?.slug) extras.source_ar_slug = decodeSlug(ar.slug);
  return { input, extras };
}

// Secondary-locale values registered as translations after load (PRD §11).
export function categoryTranslationValues(ar) {
  return {
    title: decodeEntities(ar.name),
    body_html: ar.description || "",
    meta_title: decodeEntities(ar.name),
    meta_description: stripHtml(ar.description).slice(0, 320),
  };
}

const COLLECTION_FIELDS = `collection { id handle } userErrors { field message }`;

export async function loadCategory(ctx, action, input, metafields, mapped) {
  const payload = { ...input, metafields };
  let data;
  if (action === "create") {
    // collectionCreate does NOT error on a duplicate handle — it silently
    // suffixes (handle-2). Adopt any existing collection with this handle
    // (e.g. from the demo seed) instead of creating a near-duplicate.
    const existing = await ctx.shopify.gql(
      `query ($q: String!) { collections(first: 1, query: $q) { nodes { id handle } } }`,
      { q: `handle:'${input.handle}'` }
    );
    const found = existing.collections?.nodes?.[0];
    if (found && found.handle === input.handle) {
      action = "update";
      mapped = { target_id: found.id };
    }
  }
  if (action === "create") {
    data = await ctx.shopify.gql(
      `mutation ($input: CollectionInput!) { collectionCreate(input: $input) { ${COLLECTION_FIELDS} } }`,
      { input: payload }
    );
  } else {
    data = await ctx.shopify.gql(
      `mutation ($input: CollectionInput!) { collectionUpdate(input: $input) { ${COLLECTION_FIELDS} } }`,
      { input: { ...payload, id: mapped.target_id } }
    );
  }
  const result = data.collectionCreate ?? data.collectionUpdate;
  if (result.userErrors?.length) {
    throw Object.assign(new Error(result.userErrors.map((e) => e.message).join("; ")), {
      userErrors: result.userErrors,
    });
  }
  return { targetId: result.collection.id, handle: result.collection.handle };
}
