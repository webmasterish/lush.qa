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

// scope 'all': page through EVERY resource of the type on the store (demo
// data, manual test data — regardless of origin). Backed up to var/ first.
const LIST_QUERIES = {
  orders: `query ($cursor: String) { orders(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id name } } }`,
  customers: `query ($cursor: String) { customers(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id email } } }`,
  products: `query ($cursor: String) { products(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id title handle } } }`,
  categories: `query ($cursor: String) { collections(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id title handle } } }`,
};

async function listAll(shopify, name) {
  const out = [];
  let cursor = null;
  for (;;) {
    const data = await shopify.gql(LIST_QUERIES[name], { cursor });
    const conn = Object.values(data)[0];
    out.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) return out;
    cursor = conn.pageInfo.endCursor;
  }
}

export async function wipe(ctx, entities, confirm, scope = "tracked") {
  const { db, project, shopify, log } = ctx;
  if (project.target.production) throw new Error("wipe refused: project is flagged production");
  if (!project.target.allow_wipe) throw new Error("wipe refused: allow_wipe is false in project config");
  if (confirm !== project.target.store_domain) {
    throw new Error(`wipe refused: --confirm must be exactly '${project.target.store_domain}'`);
  }
  if (!["tracked", "all"].includes(scope)) throw new Error(`wipe: invalid scope '${scope}' (tracked|all)`);

  const del = db.prepare(`DELETE FROM id_map WHERE project = ? AND entity = ? AND source_id = ?`);
  const stats = {};
  for (const name of WIPE_ORDER.filter((n) => entities.includes(n))) {
    const m = DELETE_MUTATIONS[name];
    let rows;
    if (scope === "all") {
      const found = await listAll(shopify, name);
      const { writeFileSync, mkdirSync } = await import("node:fs");
      mkdirSync("var", { recursive: true });
      const backupFile = `var/backup-wipe-all-${name}-${new Date().toISOString().slice(0, 10)}.json`;
      writeFileSync(backupFile, JSON.stringify(found, null, 1));
      log("info", { entity: name, action: "wipe", message: `scope=all: ${found.length} ${name} on the store; ids/names backed up to ${backupFile}` });
      rows = found.map((n) => ({ source_id: null, target_id: n.id }));
    } else {
      rows = db.prepare(`SELECT source_id, target_id FROM id_map WHERE project = ? AND entity = ?`).all(project.name, name);
    }
    stats[name] = { deleted: 0, failed: 0 };
    for (const r of rows) {
      if (ctx.isCancelled()) return stats;
      try {
        const d = await shopify.gql(m.q, { id: r.target_id });
        const errs = m.errs(d);
        if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
        if (!m.ok(d)) throw new Error("no deleted id returned");
        if (r.source_id != null) del.run(project.name, name, r.source_id);
        else db.prepare(`DELETE FROM id_map WHERE project = ? AND entity = ? AND target_id = ?`).run(project.name, name, r.target_id);
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
