// Metafield definitions for the migration namespace (plan M8 task 0): makes
// the tool's metafields appear structured (named, described) in the Shopify
// admin instead of under "Unstructured metafields". Idempotent — existing
// definitions are skipped.

const TEXT = "single_line_text_field";

// Display names carry a "DotAim ·" prefix so migration metafields group
// together and are unmistakable next to future theme/app metafields.
const P = "DotAim · ";

// key -> [name, type, description]
const COMMON = {
  source: [P + "Source store", TEXT, "Source platform and store this record was migrated from"],
  source_id: [P + "Source ID", TEXT, "ID of the original record in the source store (English record for translated content)"],
  source_hash: [P + "Sync hash", TEXT, "Content fingerprint at last sync; used to detect source-side changes"],
  synced_at: [P + "Last synced", "date_time", "When the migration tool last created or updated this record"],
};

const DEFINITIONS = {
  PRODUCT: {
    ...COMMON,
    dimensions: [P + "Source dimensions", TEXT, "Length/width/height from the source store (Shopify has no native fields)"],
    source_ar_slug: [P + "Arabic slug (source)", TEXT, "Arabic URL slug from the source store; used for redirect mapping"],
  },
  PRODUCTVARIANT: {
    source_id: [P + "Source variation ID", TEXT, "ID of the original variation in the source store"],
  },
  COLLECTION: {
    ...COMMON,
    parent_category: [P + "Parent category (source)", TEXT, "Handle of the parent category in the source store (Shopify collections are flat); used to build navigation menus"],
    source_ar_slug: [P + "Arabic slug (source)", TEXT, "Arabic URL slug from the source store; used for redirect mapping"],
  },
  CUSTOMER: { ...COMMON },
  ORDER: {
    ...COMMON,
    source_order_number: [P + "Source order number", TEXT, "Order number in the source store"],
    source_invoice_number: [P + "Source invoice number", TEXT, "PDF invoice number from the source store's invoicing plugin"],
    source_payment_method: [P + "Source payment method", TEXT, "Payment method title (and transaction id) from the source store; reference only"],
    source_refunds: [P + "Source refunds (raw)", TEXT, "Raw refunds data for orders with partial refunds (imported as-is)"],
    source_line_semantics: [P + "Line semantics (legacy)", TEXT, "Set when the source order stored unit prices in line totals (legacy data); totals were corrected on import"],
    source_discount_total: [P + "Source discount total", TEXT, "Order-level discount total from the source store (already reflected in line prices)"],
  },
};

export async function defineMetafields(ctx) {
  const { project, shopify, log } = ctx;
  const ns = project.metafield_namespace;
  const stats = { created: 0, renamed: 0, skipped: 0, failed: 0 };

  for (const [ownerType, keys] of Object.entries(DEFINITIONS)) {
    const existing = await shopify.gql(
      `query ($ownerType: MetafieldOwnerType!, $namespace: String) {
        metafieldDefinitions(first: 50, ownerType: $ownerType, namespace: $namespace) { nodes { key name } }
      }`,
      { ownerType, namespace: ns }
    );
    const have = new Map(existing.metafieldDefinitions.nodes.map((n) => [n.key, n.name]));

    for (const [key, [name, type, description]] of Object.entries(keys)) {
      if (have.has(key)) {
        // Reconcile display names (e.g. after adding the DotAim prefix).
        if (have.get(key) !== name) {
          const upd = await shopify.gql(
            `mutation ($definition: MetafieldDefinitionUpdateInput!) {
              metafieldDefinitionUpdate(definition: $definition) {
                updatedDefinition { id } userErrors { field message }
              }
            }`,
            { definition: { namespace: ns, key, ownerType, name, description } }
          );
          const uerrs = upd.metafieldDefinitionUpdate?.userErrors;
          if (uerrs?.length) {
            stats.failed++;
            log("warn", { action: "system", message: `rename ${ownerType}.${ns}.${key} failed: ${uerrs.map((e) => e.message).join("; ")}` });
          } else {
            stats.renamed++;
            log("info", { action: "system", message: `renamed ${ownerType} ${ns}.${key} -> "${name}"` });
          }
        } else {
          stats.skipped++;
        }
        continue;
      }
      const res = await shopify.gql(
        `mutation ($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition { id } userErrors { field message code }
          }
        }`,
        { definition: { namespace: ns, key, name, type, description, ownerType } }
      );
      const errs = res.metafieldDefinitionCreate?.userErrors;
      if (errs?.length) {
        stats.failed++;
        log("warn", { action: "system", message: `definition ${ownerType}.${ns}.${key} failed: ${errs.map((e) => e.message).join("; ")}` });
      } else {
        stats.created++;
        log("info", { action: "system", message: `defined ${ownerType} ${ns}.${key} (${name})` });
      }
    }
  }
  log("info", { action: "system", message: `define-metafields complete: ${JSON.stringify(stats)}` });
  return stats;
}
