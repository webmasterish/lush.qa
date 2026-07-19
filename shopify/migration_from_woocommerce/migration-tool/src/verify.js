// Verify stage (PRD §15): counts per language vs id_map vs live Shopify,
// 5-record spot checks per entity, and orphan detection (id_map entries
// whose source record is gone from staging — reported, never touched).
import { ENTITIES } from "./entities/index.js";
import { STATUS_MAP } from "./entities/orders.js";
import { decodeEntities } from "./util.js";

const LIVE_COUNT_QUERY = {
  categories: `{ c: collectionsCount { count } }`,
  products: `{ c: productsCount { count } }`,
  customers: `{ c: customersCount { count } }`,
  orders: `{ c: ordersCount { count } }`,
};

async function spotCheck(ctx, name, sourceId, targetId, en) {
  const { shopify } = ctx;
  const mismatches = [];
  const cmp = (field, got, want) => {
    if (String(got ?? "") !== String(want ?? "")) mismatches.push(`${field}: shopify='${got}' vs source='${want}'`);
  };
  if (name === "products") {
    const d = await shopify.gql(`query ($id: ID!) { product(id: $id) { title status variantsCount { count } } }`, { id: targetId });
    if (!d.product) return [`product ${targetId} not found in Shopify`];
    cmp("title", d.product.title, decodeEntities(en.name));
    cmp("status", d.product.status, en.status === "publish" ? "ACTIVE" : "DRAFT");
    const expectedVariants = en.type === "variable" ? (en._variations?.length ?? 0) : 1;
    cmp("variant count", d.product.variantsCount?.count, expectedVariants);
  } else if (name === "categories") {
    const d = await shopify.gql(`query ($id: ID!) { collection(id: $id) { title } }`, { id: targetId });
    if (!d.collection) return [`collection ${targetId} not found in Shopify`];
    cmp("title", d.collection.title, decodeEntities(en.name));
  } else if (name === "customers") {
    const d = await shopify.gql(`query ($id: ID!) { customer(id: $id) { email firstName } }`, { id: targetId });
    if (!d.customer) return [`customer ${targetId} not found in Shopify`];
    cmp("email", d.customer.email?.toLowerCase(), (en.email ?? "").toLowerCase());
  } else if (name === "orders") {
    const d = await shopify.gql(
      `query ($id: ID!) { order(id: $id) { name displayFinancialStatus totalPriceSet { shopMoney { amount } } } }`,
      { id: targetId }
    );
    if (!d.order) return [`order ${targetId} not found in Shopify`];
    cmp("name", d.order.name, `#${en.number}`);
    if (Math.abs(Number(d.order.totalPriceSet.shopMoney.amount) - Number(en.total)) > 0.05) {
      mismatches.push(`total: shopify=${d.order.totalPriceSet.shopMoney.amount} vs source=${en.total}`);
    }
    const expected = STATUS_MAP[en.status]?.financial;
    if (expected && d.order.displayFinancialStatus?.toUpperCase().replace(/ /g, "_") !== expected) {
      mismatches.push(`financial status: shopify=${d.order.displayFinancialStatus} vs expected=${expected}`);
    }
  }
  return mismatches;
}

export async function verifyEntity(ctx, name) {
  const { db, project, shopify, log } = ctx;
  const def = ENTITIES[name];
  const primary = def.langAware ? project.source.primary_lang : "-";

  const staged = {};
  for (const r of db
    .prepare(`SELECT lang, COUNT(*) n FROM staging WHERE project = ? AND entity = ? GROUP BY lang`)
    .all(project.name, name)) {
    staged[r.lang] = r.n;
  }
  const mapped = db.prepare(`SELECT COUNT(*) n FROM id_map WHERE project = ? AND entity = ?`).get(project.name, name).n;

  let live = null;
  try {
    live = (await shopify.gql(LIVE_COUNT_QUERY[name])).c?.count ?? null;
  } catch (e) {
    log("warn", { entity: name, action: "verify", message: `live count unavailable: ${e.message}` });
  }

  const report = { staged, mapped, live, flags: [], spot_mismatches: [], orphans: 0, orphan_samples: [] };
  if (live != null && mapped > live) {
    report.flags.push(`id_map has ${mapped} records but Shopify only has ${live} — some mapped records are missing from the store`);
  }

  // Spot checks: 5 random mapped records.
  const samples = db
    .prepare(
      `SELECT i.source_id, i.target_id, s.payload FROM id_map i
       JOIN staging s ON s.project = i.project AND s.entity = i.entity AND s.lang = ? AND s.source_id = i.source_id
       WHERE i.project = ? AND i.entity = ? ORDER BY RANDOM() LIMIT 5`
    )
    .all(primary, project.name, name);
  for (const s of samples) {
    const mismatches = await spotCheck(ctx, name, s.source_id, s.target_id, JSON.parse(s.payload));
    for (const m of mismatches) {
      report.spot_mismatches.push(`#${s.source_id}: ${m}`);
      log("warn", { entity: name, source_id: s.source_id, action: "verify", message: m });
    }
  }

  // Orphans: mapped but gone from staging (deleted at source). Report only.
  const orphans = db
    .prepare(
      `SELECT i.source_id FROM id_map i
       WHERE i.project = ? AND i.entity = ?
       AND NOT EXISTS (SELECT 1 FROM staging s WHERE s.project = i.project AND s.entity = i.entity AND s.lang = ? AND s.source_id = i.source_id)`
    )
    .all(project.name, name, primary);
  report.orphans = orphans.length;
  report.orphan_samples = orphans.slice(0, 10).map((o) => o.source_id);
  if (orphans.length) {
    log("warn", { entity: name, action: "verify", message: `${orphans.length} migrated records no longer exist in staging (deleted at source?) — never auto-deleted, review manually` });
  }

  const ok = report.flags.length === 0 && report.spot_mismatches.length === 0;
  log(ok ? "info" : "warn", {
    entity: name,
    action: "verify",
    message: `verify: staged=${JSON.stringify(staged)} mapped=${mapped} live=${live ?? "n/a"} spot_mismatches=${report.spot_mismatches.length} orphans=${report.orphans}`,
  });
  return report;
}
