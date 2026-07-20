// Entity registry + dependency graph (PRD §9.2), the extract stage
// (PRD §10.1), and the generic mode-aware load stage (PRD §13).
import { sha256, nowIso, stableStringify, decodeSlug } from "../util.js";
import { RunCancelled } from "../runner.js";
import { transformCategory, loadCategory, categoryTranslationValues } from "./categories.js";
import { transformProduct, loadProduct, productTranslationValues } from "./products.js";
import { ensureSecondaryLocales, registerTranslations } from "../translations.js";
import { transformCustomer, loadCustomer } from "./customers.js";
import { transformOrder, loadOrder } from "./orders.js";

export const ENTITIES = {
  categories: {
    path: "products/categories",
    langAware: true,
    dependencies: [],
    params: {},
    transform: transformCategory,
    load: loadCategory,
    translationValues: categoryTranslationValues,
    publish: true,
  },
  // status=any is explicit: drafts must migrate (40% of the lush.qa catalog)
  // so historical orders keep real product links. Trash is never extracted.
  products: {
    path: "products",
    langAware: true,
    dependencies: ["categories"],
    params: { status: "any" },
    incremental: true,
    transform: transformProduct,
    load: loadProduct,
    translationValues: productTranslationValues,
    publish: true,
  },
  customers: {
    path: "customers",
    langAware: false,
    dependencies: [],
    params: {},
    transform: transformCustomer,
    load: loadCustomer,
  },
  orders: {
    path: "orders",
    langAware: false,
    dependencies: ["customers", "products"],
    params: {},
    incremental: true,
    immutable: true,
    transform: transformOrder,
    load: loadOrder,
  },
};

// Dependency-safe processing order.
export const ENTITY_ORDER = ["categories", "products", "customers", "orders"];

export function parseEntities(input) {
  if (!input || input === "all") return [...ENTITY_ORDER];
  const names = input.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = names.filter((n) => !ENTITIES[n]);
  if (unknown.length) {
    throw new Error(`Unknown entities: ${unknown.join(", ")}. Valid: ${ENTITY_ORDER.join(", ")}`);
  }
  return names;
}

// Expand selection with dependencies (recursively), return in ENTITY_ORDER.
export function expandEntities(selected, includeDependencies = true) {
  const set = new Set(selected);
  if (includeDependencies) {
    let grew = true;
    while (grew) {
      grew = false;
      for (const name of [...set]) {
        for (const dep of ENTITIES[name].dependencies) {
          if (!set.has(dep)) {
            set.add(dep);
            grew = true;
          }
        }
      }
    }
  }
  return ENTITY_ORDER.filter((n) => set.has(n));
}

// Extract one entity into staging. Returns per-language counts, e.g.
// { en: 538, ar: 526 } or { "-": 3184 } for language-neutral entities.
export async function extractEntity(ctx, name, options = {}) {
  const { woo, db, project, log, isCancelled } = ctx;
  const def = ENTITIES[name];
  const primary = project.source.primary_lang;
  const langs = def.langAware
    ? options.langs?.length
      ? options.langs
      : [primary, ...project.source.secondary_langs]
    : ["-"];

  const upsert = db.prepare(
    `INSERT OR REPLACE INTO staging (project, entity, lang, source_id, en_id, payload, hash, extracted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Incremental refresh (PRD §10.1): products/orders support modified_after;
  // categories/customers do not (verified live). Never incremental for
  // limited test runs; --full forces a complete re-fetch. Deletions at the
  // source are invisible to incremental runs.
  let since = null;
  if (def.incremental && !options.extract_full && options.limit == null) {
    const prev = db
      .prepare(`SELECT MAX(extracted_at) m FROM staging WHERE project = ? AND entity = ?`)
      .get(project.name, name)?.m;
    if (prev) {
      since = new Date(Date.parse(prev) - 3600_000).toISOString().replace(/\.\d{3}Z$/, "");
      log("info", {
        entity: name,
        action: "extract",
        message: `Incremental extract: modified_after=${since} (1h overlap). Source deletions are NOT detected — run a full extract (--full) before the final pre-cutover verify.`,
      });
    }
  }

  const counts = {};
  for (const lang of langs) {
    const params = { ...def.params };
    if (def.langAware && lang !== "-") params.lang = lang;
    if (since) {
      params.modified_after = since;
      params.dates_are_gmt = "true";
    }

    // WPML sometimes filters the orders endpoint by language: probe totals
    // and use lang=all when it exposes more records (PRD §10.1).
    if (name === "orders") {
      const [plain, all] = [await woo.getTotal(def.path, params), await woo.getTotal(def.path, { ...params, lang: "all" })];
      if (all > plain) {
        params.lang = "all";
        log("info", { entity: name, action: "extract", message: `Orders endpoint is language-filtered (${plain} plain vs ${all} with lang=all); using lang=all.` });
      }
    }

    const records = await woo.fetchAll(def.path, params, {
      limit: options.limit ?? null,
      onPage: ({ page, totalPages, fetched }) =>
        log("debug", { entity: name, action: "extract", message: `Fetched page ${page}/${totalPages} (${fetched} records)${lang !== "-" ? ` [${lang}]` : ""}` }),
    });

    let fallbackSkips = 0;
    for (const rec of records) {
      if (isCancelled()) throw new RunCancelled();

      // WPML returns untranslated originals as language fallback (e.g.
      // lang=ar includes EN records with no AR translation). Staging them
      // under the wrong lang would feed English text to the AR translation
      // step — discard them; the record is already staged under its real lang.
      if (def.langAware && lang !== "-" && rec.lang && rec.lang !== lang) {
        fallbackSkips++;
        continue;
      }

      // Variable products: embed variations so the staged payload is complete.
      if (name === "products" && rec.type === "variable") {
        rec._variations = await woo.fetchAll(`products/${rec.id}/variations`, {}, {});
      }

      // Canonical EN linkage via the WPML translations map.
      let enId = rec.id;
      if (def.langAware) {
        const linked = rec.translations?.[primary];
        if (linked) {
          enId = Number(linked);
        } else if (lang !== primary && lang !== "-") {
          log("warn", { entity: name, source_id: rec.id, action: "extract", message: `Orphan ${lang} record: no ${primary} sibling in translations map; staged with en_id = own id.` });
        }
      }

      const payload = JSON.stringify(rec);
      upsert.run(project.name, name, lang, rec.id, enId, payload, sha256(payload), nowIso());
    }

    counts[lang] = records.length - fallbackSkips;
    log("info", {
      entity: name,
      action: "extract",
      message: `Staged ${counts[lang]} ${name}${lang !== "-" ? ` [${lang}]` : ""}.${fallbackSkips ? ` Discarded ${fallbackSkips} WPML language-fallback records (payload lang mismatch).` : ""}`,
    });
  }
  return counts;
}

// PRD §12: metafields identifying every migrated resource.
export function buildMetafields(project, enId, hash, extras = {}) {
  const ns = project.metafield_namespace;
  const fields = [
    { namespace: ns, key: "source", type: "single_line_text_field", value: project.source_label },
    { namespace: ns, key: "source_id", type: "single_line_text_field", value: String(enId) },
    { namespace: ns, key: "source_hash", type: "single_line_text_field", value: hash },
    { namespace: ns, key: "synced_at", type: "date_time", value: nowIso() },
  ];
  for (const [key, value] of Object.entries(extras)) {
    if (value != null && value !== "") {
      fields.push({ namespace: ns, key, type: "single_line_text_field", value: String(value) });
    }
  }
  return fields;
}

// PRD §13 mode matrix. Returns "create" | "update" | "skip".
export function decideAction(mode, mapped, hash, immutable) {
  if (!mapped) return "create";
  if (immutable) return "skip";
  if (mode === "force_all") return "update";
  if (hash !== mapped.hash_at_sync && mode === "sync_changed") return "update";
  return "skip";
}

// Generic load stage: staged EN rows ordered by en_id, offset/limit slice,
// transform -> mode decision -> entity load -> id_map upsert (PRD §9.1, §13).
export async function loadEntity(ctx, name, options = {}) {
  const { db, project, log, isCancelled } = ctx;
  const def = ENTITIES[name];
  if (!def.load) throw new Error(`Entity '${name}' has no loader yet (see migration-tool-plan.md milestones)`);
  const mode = options.mode ?? "create_missing";
  const primary = def.langAware ? project.source.primary_lang : "-";

  let sql = `SELECT source_id, payload FROM staging WHERE project = ? AND entity = ? AND lang = ? ORDER BY en_id`;
  const args = [project.name, name, primary];
  if (options.limit != null) {
    sql += ` LIMIT ? OFFSET ?`;
    args.push(options.limit, options.offset ?? 0);
  } else if (options.offset) {
    sql += ` LIMIT -1 OFFSET ?`;
    args.push(options.offset);
  }
  const rows = db.prepare(sql).all(...args);

  // Source has duplicate AR translations for some records; ORDER BY makes the
  // pick deterministic (newest source_id wins).
  const getAr = db.prepare(
    `SELECT payload FROM staging WHERE project = ? AND entity = ? AND lang = ? AND en_id = ? ORDER BY source_id DESC LIMIT 1`
  );
  const getMapped = db.prepare(`SELECT * FROM id_map WHERE project = ? AND entity = ? AND source_id = ?`);
  const upsertMap = db.prepare(
    `INSERT OR REPLACE INTO id_map (project, entity, source_id, target_id, target_handle, hash_at_sync, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // Helpers shared by transforms.
  const secondary = project.source.secondary_langs?.[0];
  const helpers = {
    namespace: project.metafield_namespace,
    phoneCountry: project.phone_default_country,
    weightUnit: project.source.weight_unit ?? "kg",
    locationId: def === ENTITIES.products || def === ENTITIES.orders ? await ctx.shopify.getPrimaryLocationId() : null,
    resolveCollection: (wooCatId) =>
      getMapped.get(project.name, "categories", wooCatId)?.target_id ?? null,
    parentHandle: (wooCatId) => {
      const row = db
        .prepare(`SELECT payload FROM staging WHERE project = ? AND entity = 'categories' AND lang = ? AND source_id = ?`)
        .get(project.name, primary === "-" ? project.source.primary_lang : primary, wooCatId);
      return row ? decodeSlug(JSON.parse(row.payload).slug) : null;
    },
    currency: project.target.currency,
  };

  if (name === "orders") {
    // Line-item resolution index from staged products: variation/product id
    // -> variants id_map, with SKU fallback and AR->EN translation hops
    // (orders placed on the Arabic site reference AR product ids).
    const enLang = project.source.primary_lang;
    const skuToKey = new Map(); // sku -> variants id_map key (variation id or simple product id)
    const arToEn = new Map(); // AR product id -> EN product id
    for (const r of db
      .prepare(`SELECT source_id, en_id, lang, payload FROM staging WHERE project = ? AND entity = 'products'`)
      .all(project.name)) {
      if (r.lang !== enLang) {
        arToEn.set(r.source_id, r.en_id);
        continue;
      }
      const p = JSON.parse(r.payload);
      if (p.type === "variable") {
        for (const v of p._variations ?? []) if (v.sku) skuToKey.set(v.sku, v.id);
      } else if (p.sku) {
        skuToKey.set(p.sku, r.source_id);
      }
    }
    const variantGid = (key) => (key ? getMapped.get(project.name, "variants", key)?.target_id ?? null : null);
    helpers.resolveVariant = (li) => {
      // 1. direct variation id; 2. simple product id (EN or via AR->EN);
      // 3. SKU index (covers AR variation ids, which share the variation SKU).
      return (
        variantGid(li.variation_id) ??
        variantGid(li.product_id) ??
        variantGid(arToEn.get(li.product_id)) ??
        variantGid(skuToKey.get(li.sku))
      );
    };
    const byEmail = db.prepare(`SELECT target_id FROM id_map WHERE project = ? AND entity = 'customers' AND target_handle = ?`);
    // Returns { id, email } — the transform needs the linked customer's own
    // email to detect conflicts with the order's billing email (Shopify
    // rejects an order email that belongs to a different customer).
    helpers.resolveCustomer = (rec) => {
      if (rec.customer_id) {
        const m = getMapped.get(project.name, "customers", rec.customer_id);
        if (m) return { id: m.target_id, email: m.target_handle ?? null };
      }
      const email = rec.billing?.email?.trim().toLowerCase();
      if (!email) return null;
      const byMail = byEmail.get(project.name, email);
      return byMail ? { id: byMail.target_id, email } : null;
    };
  }

  const secondaryLocale = project.target.secondary_locales?.[0] ?? null;
  const translating = Boolean(def.translationValues && secondaryLocale);
  if (translating) await ensureSecondaryLocales(ctx);

  const stats = { created: 0, updated: 0, skipped: 0, failed: 0, total: rows.length, processed: 0 };
  if (translating) stats.translated = 0;
  if (def.publish) stats.published = 0;
  for (const row of rows) {
    if (isCancelled()) {
      ctx.setStats?.(name, stats);
      throw new RunCancelled();
    }
    stats.processed++;
    if (stats.processed % 10 === 0) ctx.setStats?.(name, stats);
    const en = JSON.parse(row.payload);
    const arRow = def.langAware && secondary ? getAr.get(project.name, name, secondary, row.source_id) : null;
    const ar = arRow ? JSON.parse(arRow.payload) : null;

    try {
      const { input, extras = {}, warnings = [], skip } = def.transform(en, ar, helpers);
      if (skip) {
        stats.skipped++;
        log("warn", { entity: name, source_id: row.source_id, action: "skip", message: skip });
        continue;
      }
      for (const w of warnings) {
        log("warn", { entity: name, source_id: row.source_id, action: "load", message: w });
      }
      const hash = sha256(stableStringify({ input, extras }));
      const mapped = getMapped.get(project.name, name, row.source_id);
      const action = decideAction(mode, mapped, hash, def.immutable ?? false);

      if (action === "skip") {
        const changed = mapped && hash !== mapped.hash_at_sync;
        stats.skipped++;
        log(changed ? "info" : "debug", {
          entity: name,
          source_id: row.source_id,
          action: "skip",
          message: changed ? `changed at source but mode=${mode}${def.immutable ? " (entity is immutable)" : ""}; skipped` : "unchanged; skipped",
        });
        continue;
      }

      const metafields = buildMetafields(project, row.source_id, hash, extras);
      const started = Date.now();
      const { targetId, handle, extraMappings = [] } = await def.load(ctx, action, input, metafields, mapped);
      upsertMap.run(project.name, name, row.source_id, targetId, handle ?? null, hash, nowIso());
      for (const em of extraMappings) {
        upsertMap.run(project.name, em.entity, em.source_id ?? row.source_id, em.target_id, null, hash, nowIso());
      }
      stats[action === "create" ? "created" : "updated"]++;

      // Sales channel: migrated products/collections must be visible on the
      // Online Store. Non-fatal — the record itself loaded fine.
      if (def.publish) {
        try {
          await ctx.shopify.publishToOnlineStore(targetId);
          stats.published++;
        } catch (e) {
          log("warn", { entity: name, source_id: row.source_id, action: "load", message: `publish to Online Store failed: ${e.message}` });
        }
      }

      // Secondary-locale translations (PRD §11). Non-fatal per record.
      if (translating) {
        if (ar) {
          try {
            const count = await registerTranslations(ctx, targetId, secondaryLocale, def.translationValues(ar));
            if (count > 0) stats.translated++;
          } catch (e) {
            log("warn", { entity: name, source_id: row.source_id, action: "load", message: `translation registration failed: ${e.message}` });
          }
        } else {
          log("warn", { entity: name, source_id: row.source_id, action: "load", message: `no ${secondaryLocale} sibling in source; skipped translation` });
        }
      }
      log("info", {
        entity: name,
        source_id: row.source_id,
        action,
        message: `${action}d ${targetId} (${Date.now() - started}ms)`,
        data: { target_id: targetId, handle },
      });
    } catch (e) {
      if (e instanceof RunCancelled) throw e;
      if (e.softSkip) {
        stats.skipped++;
        log("warn", { entity: name, source_id: row.source_id, action: "skip", message: e.softSkip });
        continue;
      }
      stats.failed++;
      log("error", {
        entity: name,
        source_id: row.source_id,
        action: "fail",
        message: e.message,
        data: e.userErrors ? { userErrors: e.userErrors } : null,
      });
    }
  }
  ctx.setStats?.(name, stats);
  return stats;
}
