// Products -> Shopify products via productSet (PRD §10.3).
// productSet (2026-01) handles options/variants/files/collections/metafields
// in one call; list fields are replaced wholesale, which matches our
// source-of-truth sync semantics.
import { decodeEntities, decodeSlug, stripHtml, encodeImageUrl } from "../util.js";

const WEIGHT_UNITS = { kg: "KILOGRAMS", g: "GRAMS", lbs: "POUNDS", oz: "OUNCES" };

function activeSalePrice(p) {
  // Sale applies only if flagged on_sale and inside the date window (if set).
  if (!p.sale_price || !p.on_sale) return null;
  const now = Date.now();
  if (p.date_on_sale_from_gmt && Date.parse(p.date_on_sale_from_gmt + "Z") > now) return null;
  if (p.date_on_sale_to_gmt && Date.parse(p.date_on_sale_to_gmt + "Z") < now) return null;
  return p.sale_price;
}

function priceFields(rec) {
  const sale = activeSalePrice(rec);
  const regular = rec.regular_price || rec.price || "0";
  return sale ? { price: sale, compareAtPrice: regular } : { price: regular || "0" };
}

function inventoryFields(rec, locationId, weightUnit) {
  const v = {};
  v.inventoryPolicy = rec.backorders && rec.backorders !== "no" ? "CONTINUE" : "DENY";
  const inventoryItem = { tracked: !!rec.manage_stock };
  if (rec.weight) {
    inventoryItem.measurement = {
      weight: { value: Number(rec.weight), unit: weightUnit },
    };
  }
  v.inventoryItem = inventoryItem;
  if (rec.manage_stock) {
    v.inventoryQuantities = [
      { locationId, name: "available", quantity: rec.stock_quantity ?? 0 },
    ];
  } else if (rec.stock_status === "outofstock") {
    // Unmanaged but flagged out of stock: track with qty 0 so it reads as
    // unavailable (data-mapping rule).
    v.inventoryItem.tracked = true;
    v.inventoryQuantities = [{ locationId, name: "available", quantity: 0 }];
  }
  return v;
}

// Pure transform. helpers: { resolveCollection(wooCategoryId) -> gid|null,
// locationId, weightUnit }. Returns { input, extras, warnings }.
export function transformProduct(en, ar, helpers) {
  const warnings = [];
  const title = decodeEntities(en.name);
  const weightUnit = WEIGHT_UNITS[helpers.weightUnit ?? "kg"] ?? "KILOGRAMS";

  const collections = [];
  for (const cat of en.categories ?? []) {
    const gid = helpers.resolveCollection(cat.id);
    if (gid) collections.push(gid);
    else warnings.push(`category ${cat.id} (${decodeEntities(cat.name)}) not in id_map; membership skipped`);
  }

  // Images: dedupe by URL, featured first (Woo returns them in order).
  const seen = new Set();
  const files = [];
  for (const img of en.images ?? []) {
    if (!img.src || seen.has(img.src)) continue;
    seen.add(img.src);
    files.push({ originalSource: encodeImageUrl(img.src), alt: img.alt || undefined, contentType: "IMAGE" });
  }

  const input = {
    title,
    descriptionHtml: en.description ?? "",
    handle: decodeSlug(en.slug),
    status: en.status === "publish" ? "ACTIVE" : "DRAFT",
    vendor: en.brands?.[0]?.name || undefined,
    productType: en.categories?.[0] ? decodeEntities(en.categories[0].name) : undefined,
    tags: (en.tags ?? []).map((t) => decodeEntities(t.name)),
    seo: { title, description: stripHtml(en.description).slice(0, 320) || undefined },
    collections,
    files,
  };

  if (en.type === "variable" && (en._variations?.length ?? 0) > 0) {
    // Options come from attributes marked for variations (max 3 in Shopify).
    const optionAttrs = (en.attributes ?? []).filter((a) => a.variation);
    if (optionAttrs.length > 3) {
      throw new Error(`product has ${optionAttrs.length} variation attributes; Shopify allows 3`);
    }
    input.productOptions = optionAttrs.map((a) => ({
      name: a.name,
      values: a.options.map((o) => ({ name: decodeEntities(o) })),
    }));
    input.variants = en._variations.map((v) => ({
      optionValues: (v.attributes ?? []).map((va) => ({
        optionName: va.name,
        name: decodeEntities(va.option),
      })),
      sku: v.sku || undefined,
      barcode: v.global_unique_id || undefined,
      taxable: v.tax_status !== "none",
      ...priceFields(v),
      ...inventoryFields(v, helpers.locationId, weightUnit),
      ...(v.image?.src ? { file: { originalSource: encodeImageUrl(v.image.src), contentType: "IMAGE" } } : {}),
      metafields: [
        { namespace: helpers.namespace, key: "source_id", type: "single_line_text_field", value: String(v.id) },
      ],
    }));
  } else {
    // Simple product: single default variant.
    input.productOptions = [{ name: "Title", values: [{ name: "Default Title" }] }];
    input.variants = [
      {
        optionValues: [{ optionName: "Title", name: "Default Title" }],
        sku: en.sku || undefined,
        barcode: en.global_unique_id || undefined,
        taxable: en.tax_status !== "none",
        ...priceFields(en),
        ...inventoryFields(en, helpers.locationId, weightUnit),
      },
    ];
  }

  const extras = {};
  const dims = en.dimensions ?? {};
  const hasDim = (v) => v && v !== "0";
  if (hasDim(dims.length) || hasDim(dims.width) || hasDim(dims.height)) {
    extras.dimensions = JSON.stringify(dims);
  }
  if (ar?.slug) extras.source_ar_slug = decodeSlug(ar.slug);
  return { input, extras, warnings };
}

// Secondary-locale values registered as translations after load (PRD §11).
export function productTranslationValues(ar) {
  return {
    title: decodeEntities(ar.name),
    body_html: ar.description || "",
    meta_title: decodeEntities(ar.name),
    meta_description: stripHtml(ar.description).slice(0, 320),
  };
}

export async function loadProduct(ctx, action, input, metafields, mapped) {
  const variables = { input: { ...input, metafields }, synchronous: true };
  // Create uses identifier-by-handle: adopt-or-create. If the store already
  // has a product with this handle (e.g. from the demo seed), it's claimed
  // and overwritten with source data instead of failing on a handle
  // collision. Updates target the mapped id directly.
  const query = `mutation ($input: ProductSetInput!, $synchronous: Boolean!, $identifier: ProductSetIdentifiers!) {
    productSet(input: $input, synchronous: $synchronous, identifier: $identifier) {
      product { id handle variants(first: 250) { nodes { id selectedOptions { name value } } } }
      userErrors { field message }
    }
  }`;
  variables.identifier = action === "create" ? { handle: input.handle } : { id: mapped.target_id };
  const data = await ctx.shopify.gql(query, variables);
  const result = data.productSet;
  if (result.userErrors?.length) {
    throw Object.assign(new Error(result.userErrors.map((e) => `${e.field?.join(".") ?? ""}: ${e.message}`).join("; ")), {
      userErrors: result.userErrors,
    });
  }

  // Variant-level id_map entries so order line items can link to variants:
  // key = Woo variation id (variable) or the product's own source id (simple),
  // matched to created variants by option-value signature.
  // Response selectedOptions are {name, value}; input optionValues are
  // {optionName, name} — normalize both to "option=value".
  const sig = (opts) =>
    opts.map((o) => ("value" in o ? `${o.name}=${o.value}` : `${o.optionName}=${o.name}`)).sort().join("|");
  const created = new Map(
    (result.product.variants?.nodes ?? []).map((v) => [sig(v.selectedOptions), v.id])
  );
  const extraMappings = [];
  for (const v of input.variants) {
    const targetVariantId = created.get(sig(v.optionValues));
    if (!targetVariantId) continue;
    const variationSourceId = v.metafields?.[0]?.value; // set in transform for variable products
    extraMappings.push({
      entity: "variants",
      source_id: variationSourceId ? Number(variationSourceId) : null, // null -> caller uses product source id
      target_id: targetVariantId,
    });
  }
  return { targetId: result.product.id, handle: result.product.handle, extraMappings };
}
