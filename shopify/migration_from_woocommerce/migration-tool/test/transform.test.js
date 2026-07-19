import { test } from "node:test";
import assert from "node:assert/strict";
import { transformCategory } from "../src/entities/categories.js";
import { transformCustomer, normalizePhone } from "../src/entities/customers.js";
import { transformProduct } from "../src/entities/products.js";
import { decideAction } from "../src/entities/index.js";
import { stableStringify, decodeEntities, stripHtml, decodeSlug } from "../src/util.js";

const helpers = {
  namespace: "dotaim_migration",
  weightUnit: "kg",
  locationId: "gid://shopify/Location/1",
  resolveCollection: (id) => (id === 54 ? "gid://shopify/Collection/540" : null),
  parentHandle: (id) => (id === 54 ? "bath" : null),
};

test("stableStringify is key-order independent", () => {
  assert.equal(stableStringify({ b: 1, a: [{ y: 2, x: 1 }] }), stableStringify({ a: [{ x: 1, y: 2 }], b: 1 }));
});

test("util: entity decode, html strip, slug decode", () => {
  assert.equal(decodeEntities("Lotions &amp; Butter"), "Lotions & Butter");
  assert.equal(stripHtml("<p>Rich <strong>cream</strong></p>"), "Rich cream");
  assert.equal(decodeSlug("%d8%b0%d8%a7-%d9%83%d9%88%d9%85"), "ذا-كوم");
});

test("category: title decoded, parent + ar slug metafail extras, seo fallback", () => {
  const { input, extras } = transformCategory(
    { name: "Soaps &amp; Gels", description: "<p>Wash</p>", slug: "soaps-gels", parent: 54, image: { src: "https://x/i.jpg", alt: "" } },
    { slug: "%d8%b5%d8%a7%d8%a8%d9%88%d9%86" },
    helpers
  );
  assert.equal(input.title, "Soaps & Gels");
  assert.equal(input.handle, "soaps-gels");
  assert.equal(input.seo.description, "Wash");
  assert.equal(input.image.src, "https://x/i.jpg");
  assert.equal(extras.parent_category, "bath");
  assert.equal(extras.source_ar_slug, "صابون");
});

const baseSimple = {
  name: "Sleepy Lotion",
  description: "<p>Calming</p>",
  slug: "sleepy-lotion",
  status: "publish",
  type: "simple",
  sku: "SL-1",
  regular_price: "120",
  sale_price: "",
  price: "120",
  on_sale: false,
  manage_stock: true,
  stock_quantity: 7,
  backorders: "no",
  tax_status: "taxable",
  weight: "0.25",
  dimensions: { length: "", width: "", height: "" },
  brands: [{ name: "Lush" }],
  categories: [{ id: 54, name: "Bath" }],
  tags: [{ name: "vegan" }],
  images: [
    { src: "https://x/a.jpg", alt: "A" },
    { src: "https://x/a.jpg", alt: "dup" },
    { src: "https://x/b.jpg", alt: "" },
  ],
  global_unique_id: "",
};

test("simple product: default variant, inventory, dedup images, vendor, collection", () => {
  const { input, warnings } = transformProduct(baseSimple, null, helpers);
  assert.equal(input.status, "ACTIVE");
  assert.equal(input.vendor, "Lush");
  assert.deepEqual(input.collections, ["gid://shopify/Collection/540"]);
  assert.equal(input.files.length, 2);
  assert.equal(input.variants.length, 1);
  const v = input.variants[0];
  assert.equal(v.sku, "SL-1");
  assert.equal(v.price, "120");
  assert.equal(v.compareAtPrice, undefined);
  assert.deepEqual(v.inventoryQuantities, [{ locationId: helpers.locationId, name: "available", quantity: 7 }]);
  assert.equal(v.inventoryItem.tracked, true);
  assert.equal(v.inventoryItem.measurement.weight.value, 0.25);
  assert.equal(warnings.length, 0);
});

test("sale price becomes price with compareAt; draft status maps to DRAFT", () => {
  const { input } = transformProduct(
    { ...baseSimple, status: "draft", on_sale: true, sale_price: "90" },
    null,
    helpers
  );
  assert.equal(input.status, "DRAFT");
  assert.equal(input.variants[0].price, "90");
  assert.equal(input.variants[0].compareAtPrice, "120");
});

test("expired sale window is ignored", () => {
  const { input } = transformProduct(
    { ...baseSimple, on_sale: true, sale_price: "90", date_on_sale_to_gmt: "2020-01-01T00:00:00" },
    null,
    helpers
  );
  assert.equal(input.variants[0].price, "120");
});

test("unmapped category warns and skips membership", () => {
  const { input, warnings } = transformProduct(
    { ...baseSimple, categories: [{ id: 999, name: "Ghost" }] },
    null,
    helpers
  );
  assert.deepEqual(input.collections, []);
  assert.equal(warnings.length, 1);
});

test("variable product: options + variants from _variations", () => {
  const { input } = transformProduct(
    {
      ...baseSimple,
      type: "variable",
      attributes: [{ name: "Size", variation: true, options: ["100g", "200g"] }],
      _variations: [
        { id: 11, attributes: [{ name: "Size", option: "100g" }], sku: "V-100", regular_price: "50", price: "50", on_sale: false, manage_stock: true, stock_quantity: 3, backorders: "notify", tax_status: "taxable" },
        { id: 12, attributes: [{ name: "Size", option: "200g" }], sku: "V-200", regular_price: "90", price: "90", on_sale: false, manage_stock: false, stock_status: "outofstock", tax_status: "taxable", image: { src: "https://x/v.jpg" } },
      ],
    },
    { slug: "%d9%84%d9%88%d8%b4%d9%86" },
    helpers
  );
  assert.deepEqual(input.productOptions, [{ name: "Size", values: [{ name: "100g" }, { name: "200g" }] }]);
  assert.equal(input.variants.length, 2);
  assert.equal(input.variants[0].inventoryPolicy, "CONTINUE");
  assert.deepEqual(input.variants[1].inventoryQuantities, [{ locationId: helpers.locationId, name: "available", quantity: 0 }]);
  assert.equal(input.variants[1].file.originalSource, "https://x/v.jpg");
});

test("ar slug lands in extras for redirects", () => {
  const { extras } = transformProduct(baseSimple, { slug: "%d9%84%d9%88%d8%b4%d9%86" }, helpers);
  assert.equal(extras.source_ar_slug, "لوشن");
});

test("phone normalization table (PRD §10.4)", () => {
  assert.equal(normalizePhone("55816215", "+974"), "+97455816215");
  assert.equal(normalizePhone("0097455816215", "+974"), "+97455816215");
  assert.equal(normalizePhone("97455816215", "+974"), "+97455816215");
  assert.equal(normalizePhone("+974 5581 6215", "+974"), "+97455816215");
  assert.equal(normalizePhone("+961-81-227726", "+974"), "+96181227726");
  assert.equal(normalizePhone("", "+974"), null);
  assert.equal(normalizePhone("abc", "+974"), null);
});

test("customer: email dedup key lowercased, no-email skips, addresses", () => {
  assert.ok(transformCustomer({ email: "" }, null, { phoneCountry: "+974" }).skip);
  const billing = { first_name: "Dee", last_name: "O", address_1: "West Bay", city: "Doha", postcode: "", country: "QA", state: "", phone: "66405856" };
  const { input } = transformCustomer(
    { email: "Dee@Example.COM", first_name: "Dee", last_name: "O", billing, shipping: { ...billing, phone: "" } },
    null,
    { phoneCountry: "+974" }
  );
  assert.equal(input.email, "dee@example.com");
  assert.equal(input.phone, "+97466405856");
  assert.equal(input.addresses.length, 1);
  assert.equal(input.addresses[0].countryCode, "QA");
  assert.equal(input.emailMarketingConsent, undefined);
  const twoAddr = transformCustomer(
    { email: "a@b.c", billing, shipping: { ...billing, address_1: "Other St", phone: "" } },
    null,
    { phoneCountry: "+974" }
  );
  assert.equal(twoAddr.input.addresses.length, 2);
});

test("mode matrix (PRD §13) incl. order immutability", () => {
  const mapped = { hash_at_sync: "aaa" };
  assert.equal(decideAction("create_missing", null, "x", false), "create");
  assert.equal(decideAction("create_missing", mapped, "aaa", false), "skip");
  assert.equal(decideAction("create_missing", mapped, "bbb", false), "skip");
  assert.equal(decideAction("sync_changed", mapped, "aaa", false), "skip");
  assert.equal(decideAction("sync_changed", mapped, "bbb", false), "update");
  assert.equal(decideAction("force_all", mapped, "aaa", false), "update");
  assert.equal(decideAction("force_all", mapped, "bbb", true), "skip");
  assert.equal(decideAction("sync_changed", null, "x", true), "create");
});
