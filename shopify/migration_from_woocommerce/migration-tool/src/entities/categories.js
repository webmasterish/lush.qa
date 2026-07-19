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

const COLLECTION_FIELDS = `collection { id handle } userErrors { field message }`;

export async function loadCategory(ctx, action, input, metafields, mapped) {
  const payload = { ...input, metafields };
  let data;
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
