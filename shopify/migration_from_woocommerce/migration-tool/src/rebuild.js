// rebuild-map (PRD §12): repopulate id_map from the dotaim_migration
// metafields on the live store — the recovery path if var/ is ever lost.
// Reads only; writes nothing to Shopify.
import { nowIso } from "./util.js";

function pageQuery(name, ns, nodeFields) {
  return `query ($cursor: String) { ${name}(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes { id ${nodeFields}
      sourceId: metafield(namespace: "${ns}", key: "source_id") { value }
      sourceHash: metafield(namespace: "${ns}", key: "source_hash") { value }
    }
  } }`;
}

async function* pages(shopify, query) {
  let cursor = null;
  for (;;) {
    const data = await shopify.gql(query, { cursor });
    const conn = Object.values(data)[0];
    yield conn.nodes;
    if (!conn.pageInfo.hasNextPage) return;
    cursor = conn.pageInfo.endCursor;
  }
}

export async function rebuildMap(ctx) {
  const { db, project, shopify, log } = ctx;
  const ns = project.metafield_namespace;
  const upsert = db.prepare(
    `INSERT OR REPLACE INTO id_map (project, entity, source_id, target_id, target_handle, hash_at_sync, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const stats = {};
  const put = (entity, sourceId, targetId, handle, hash) => {
    upsert.run(project.name, entity, Number(sourceId), targetId, handle ?? null, hash ?? "rebuilt", nowIso());
    stats[entity] = (stats[entity] ?? 0) + 1;
  };

  // Products + variant-level mappings.
  const productQ = pageQuery(
    "products",
    ns,
    `handle variants(first: 100) { nodes { id vSource: metafield(namespace: "${ns}", key: "source_id") { value } } }`
  );
  for await (const nodes of pages(shopify, productQ)) {
    for (const p of nodes) {
      if (!p.sourceId?.value) continue; // not one of ours
      put("products", p.sourceId.value, p.id, p.handle, p.sourceHash?.value);
      for (const v of p.variants?.nodes ?? []) {
        put("variants", v.vSource?.value ?? p.sourceId.value, v.id, null, p.sourceHash?.value);
      }
    }
  }

  for await (const nodes of pages(shopify, pageQuery("collections", ns, "handle"))) {
    for (const c of nodes) if (c.sourceId?.value) put("categories", c.sourceId.value, c.id, c.handle, c.sourceHash?.value);
  }
  for await (const nodes of pages(shopify, pageQuery("customers", ns, "email"))) {
    for (const c of nodes) if (c.sourceId?.value) put("customers", c.sourceId.value, c.id, c.email?.toLowerCase(), c.sourceHash?.value);
  }
  try {
    for await (const nodes of pages(shopify, pageQuery("orders", ns, "name"))) {
      for (const o of nodes) if (o.sourceId?.value) put("orders", o.sourceId.value, o.id, o.name, o.sourceHash?.value);
    }
  } catch (e) {
    log("warn", { action: "system", message: `orders scan failed (${e.message}) — without the protected read_all_orders scope, orders older than 60 days cannot be scanned; their id_map entries were not rebuilt` });
  }

  log("info", { action: "system", message: `rebuild-map complete: ${JSON.stringify(stats)}` });
  return stats;
}
