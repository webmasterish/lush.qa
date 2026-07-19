// wipe (PRD §17): CLI-only. Deletes ONLY resources in id_map (the tool's own
// creations) from the target store, then clears those id_map rows. Guarded:
// --confirm must equal the store domain; refused when production or
// allow_wipe is false. Exists for dev-store iteration.
// Deletion order matters: customers with orders are undeletable, so orders
// go first when both are selected.
import { ENTITY_ORDER } from "./entities/index.js";

const DELETE_MUTATIONS = {
  orders: {
    q: `mutation ($id: ID!) { orderDelete(orderId: $id) { deletedId userErrors { field message } } }`,
    ok: (d) => d.orderDelete?.deletedId,
    errs: (d) => d.orderDelete?.userErrors,
  },
  customers: {
    q: `mutation ($id: ID!) { customerDelete(input: { id: $id }) { deletedCustomerId userErrors { field message } } }`,
    ok: (d) => d.customerDelete?.deletedCustomerId,
    errs: (d) => d.customerDelete?.userErrors,
  },
  products: {
    q: `mutation ($id: ID!) { productDelete(input: { id: $id }) { deletedProductId userErrors { field message } } }`,
    ok: (d) => d.productDelete?.deletedProductId,
    errs: (d) => d.productDelete?.userErrors,
  },
  categories: {
    q: `mutation ($id: ID!) { collectionDelete(input: { id: $id }) { deletedCollectionId userErrors { field message } } }`,
    ok: (d) => d.collectionDelete?.deletedCollectionId,
    errs: (d) => d.collectionDelete?.userErrors,
  },
};

// Reverse dependency order so referenced resources go last.
const WIPE_ORDER = ["orders", "customers", "products", "categories"];

export async function wipe(ctx, entities, confirm) {
  const { db, project, shopify, log } = ctx;
  if (project.target.production) throw new Error("wipe refused: project is flagged production");
  if (!project.target.allow_wipe) throw new Error("wipe refused: allow_wipe is false in project config");
  if (confirm !== project.target.store_domain) {
    throw new Error(`wipe refused: --confirm must be exactly '${project.target.store_domain}'`);
  }

  const del = db.prepare(`DELETE FROM id_map WHERE project = ? AND entity = ? AND source_id = ?`);
  const stats = {};
  for (const name of WIPE_ORDER.filter((n) => entities.includes(n))) {
    const m = DELETE_MUTATIONS[name];
    const rows = db.prepare(`SELECT source_id, target_id FROM id_map WHERE project = ? AND entity = ?`).all(project.name, name);
    stats[name] = { deleted: 0, failed: 0 };
    for (const r of rows) {
      if (ctx.isCancelled()) return stats;
      try {
        const d = await shopify.gql(m.q, { id: r.target_id });
        const errs = m.errs(d);
        if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
        if (!m.ok(d)) throw new Error("no deleted id returned");
        del.run(project.name, name, r.source_id);
        if (name === "products") {
          // Variant mappings die with their product.
          db.prepare(`DELETE FROM id_map WHERE project = ? AND entity = 'variants' AND target_id LIKE '%ProductVariant%' AND source_id IN (
             SELECT source_id FROM id_map WHERE project = ? AND entity = 'variants')`);
        }
        stats[name].deleted++;
        log("info", { entity: name, source_id: r.source_id, action: "wipe", message: `deleted ${r.target_id}` });
      } catch (e) {
        stats[name].failed++;
        log("warn", { entity: name, source_id: r.source_id, action: "wipe", message: `delete failed: ${e.message}` });
      }
    }
    if (name === "products") {
      // All variant mappings belong to migrated products; clear the ones
      // whose product mapping is gone.
      db.prepare(`DELETE FROM id_map WHERE project = ? AND entity = 'variants'`).run(project.name);
    }
  }
  log("info", { action: "wipe", message: `wipe complete: ${JSON.stringify(stats)}` });
  return stats;
}
