// Orders (PRD §10.5): historical import via orderCreate — offline token only,
// no notifications, inventory bypassed, immutable once loaded. Line items
// link by variation_id/product_id via the variants id_map (SKU fallback),
// else custom line items. Guest orders (customer_id 0) import unlinked.

// Woo status -> Shopify financial/fulfillment pair (PRD table).
export const STATUS_MAP = {
  pending: { financial: "PENDING", fulfilled: false },
  "on-hold": { financial: "PENDING", fulfilled: false },
  processing: { financial: "PAID", fulfilled: false },
  completed: { financial: "PAID", fulfilled: true },
  refunded: { financial: "REFUNDED", fulfilled: false },
  cancelled: { financial: "VOIDED", fulfilled: false },
  failed: { financial: "VOIDED", fulfilled: false, tag: "source-status:failed" },
};

const money = (amount, currency) => ({ shopMoney: { amount: Number(amount).toFixed(2), currencyCode: currency } });

function orderAddress(a) {
  if (!a || (!a.address_1 && !a.city && !a.country)) return undefined;
  return {
    firstName: a.first_name || undefined,
    lastName: a.last_name || undefined,
    company: a.company || undefined,
    address1: a.address_1 || undefined,
    address2: a.address_2 || undefined,
    city: a.city || undefined,
    zip: a.postcode || undefined,
    provinceCode: a.state || undefined,
    countryCode: a.country || undefined,
    phone: a.phone || undefined,
  };
}

// helpers: { currency, resolveVariant(line) -> gid|null, resolveCustomer(rec)
// -> gid|null }. Pure given those lookups.
export function transformOrder(rec, _ar, helpers) {
  const warnings = [];
  const currency = rec.currency || helpers.currency;
  const status = STATUS_MAP[rec.status] ?? { financial: "PENDING", fulfilled: false, tag: `source-status:${rec.status}` };
  if (!STATUS_MAP[rec.status]) warnings.push(`unknown Woo status '${rec.status}'; imported as PENDING with tag`);

  // Legacy quirk (2020-era OpenCart->Woo imports on lush.qa): line `total`
  // sometimes holds the UNIT price, not the line total. Detect per order by
  // checking which interpretation reproduces the order total.
  const extrasSum =
    (rec.fee_lines ?? []).reduce((a, f) => a + Number(f.total ?? 0), 0) +
    Number(rec.shipping_total ?? 0) +
    Number(rec.total_tax ?? 0);
  const sumStandard = (rec.line_items ?? []).reduce((a, li) => a + Number(li.total ?? 0), 0) + extrasSum;
  const sumUnitMode = (rec.line_items ?? []).reduce((a, li) => a + Number(li.total ?? 0) * (li.quantity ?? 1), 0) + extrasSum;
  const expected = Number(rec.total ?? 0);
  let unitMode = false;
  if (Math.abs(sumStandard - expected) > 0.05) {
    if (Math.abs(sumUnitMode - expected) <= 0.05) {
      unitMode = true;
    } else {
      warnings.push(`line totals don't reproduce order total (${sumStandard.toFixed(2)} or ${sumUnitMode.toFixed(2)} vs ${expected.toFixed(2)}); imported with standard interpretation`);
    }
  }

  const lineItems = [];
  for (const li of rec.line_items ?? []) {
    if (!li.quantity) continue;
    const variantId = helpers.resolveVariant(li);
    const unitPrice = unitMode ? Number(li.total ?? 0) : Number(li.total ?? 0) / li.quantity;
    const line = {
      title: li.name || "Item",
      quantity: li.quantity,
      priceSet: money(unitPrice, currency),
      requiresShipping: true,
    };
    if (li.sku) line.sku = li.sku;
    if (variantId) {
      line.variantId = variantId;
    } else {
      warnings.push(`line '${li.name}' (product ${li.product_id}/variation ${li.variation_id}) not mapped; imported as custom line item`);
    }
    if (Number(li.total_tax ?? 0) > 0) {
      const rate = Number(rec.tax_lines?.[0]?.rate_percent ?? 0) / 100;
      line.taxLines = [{ title: rec.tax_lines?.[0]?.label || "Tax", rate, priceSet: money(li.total_tax, currency) }];
    }
    lineItems.push(line);
  }
  for (const fee of rec.fee_lines ?? []) {
    lineItems.push({
      title: fee.name || "Fee",
      quantity: 1,
      priceSet: money(fee.total ?? 0, currency),
      requiresShipping: false,
    });
  }
  if (!lineItems.length) return { skip: "order has no line items; nothing to import" };

  const rawEmail = rec.billing?.email ? rec.billing.email.trim().toLowerCase() : null;
  // Shopify rejects malformed addresses outright (e.g. ".name@gmail.com").
  const emailValid = rawEmail ? /^[^\s@.][^\s@]*@[^\s@.]+\.[^\s@]+$/.test(rawEmail) : false;

  const input = {
    name: `#${rec.number}`,
    currency,
    processedAt: rec.date_created_gmt ? `${rec.date_created_gmt}Z` : undefined,
    financialStatus: status.financial,
    note: rec.customer_note || undefined,
    lineItems,
  };
  if (status.fulfilled) input.fulfillmentStatus = "FULFILLED";
  if (status.tag) input.tags = [status.tag];

  const customer = helpers.resolveCustomer(rec);
  const extras = { source_order_number: String(rec.number) };

  if (customer) {
    input.customerId = customer.id;
    // The order's billing email may belong to a DIFFERENT customer (people
    // order under a second address). Shopify then refuses the order with
    // "email has already been taken", so send the email only when it matches
    // the linked customer; the original is preserved as a metafield.
    if (emailValid && customer.email && rawEmail !== customer.email) {
      extras.source_billing_email = rawEmail;
      warnings.push(`billing email ${rawEmail} differs from the linked customer's (${customer.email}); order linked to the customer and the billing email kept as a metafield`);
    } else if (emailValid) {
      input.email = rawEmail;
    }
  } else if (emailValid) {
    // Guest order: Shopify attaches (or creates) a customer for this email.
    input.email = rawEmail;
    if (rec.customer_id) warnings.push(`customer ${rec.customer_id} not in id_map; order imported unlinked (email only)`);
  }

  if (rawEmail && !emailValid) {
    extras.source_billing_email = rawEmail;
    warnings.push(`billing email ${rawEmail} is malformed and was rejected by Shopify; order imported without a contact email (kept as a metafield)`);
  }

  const billing = orderAddress(rec.billing);
  const shipping = orderAddress(rec.shipping);
  if (billing) input.billingAddress = billing;
  if (shipping ?? billing) input.shippingAddress = shipping ?? billing;

  for (const sl of rec.shipping_lines ?? []) {
    (input.shippingLines ??= []).push({
      title: sl.method_title || "Shipping",
      priceSet: money(sl.total ?? 0, currency),
    });
  }

  // A sale happened for paid/refunded orders; pending/voided get none.
  // Zero-total orders (free/fully discounted) get none either — Shopify
  // rejects SALE transactions with amount 0.
  if (["PAID", "REFUNDED"].includes(status.financial) && Number(rec.total ?? 0) > 0) {
    input.transactions = [
      { kind: "SALE", status: "SUCCESS", amountSet: money(rec.total ?? 0, currency), gateway: rec.payment_method_title || undefined },
    ];
  }

  if (rec.wpo_wcpdf_invoice_number) extras.source_invoice_number = String(rec.wpo_wcpdf_invoice_number);
  if (rec.payment_method_title) {
    extras.source_payment_method = rec.transaction_id
      ? `${rec.payment_method_title} (${rec.transaction_id})`
      : rec.payment_method_title;
  }
  if ((rec.refunds?.length ?? 0) > 0 && rec.status !== "refunded") {
    extras.source_refunds = JSON.stringify(rec.refunds);
    warnings.push("order has partial refunds; imported as-is with source_refunds metafield (v1 does not reconstruct refund transactions)");
  }
  if (Number(rec.discount_total ?? 0) > 0) extras.source_discount_total = String(rec.discount_total);
  if (unitMode) extras.source_line_semantics = "unit-price (legacy OpenCart-era import)";

  return { input, extras, warnings };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function loadOrder(ctx, action, input, metafields) {
  if (action !== "create") throw new Error("orders are immutable; only create is supported");
  const variables = {
    order: { ...input, metafields },
    // Never notify customers; never touch inventory for historical orders.
    options: { sendReceipt: false, sendFulfillmentReceipt: false, inventoryBehaviour: "BYPASS" },
  };
  const query = `mutation ($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
    orderCreate(order: $order, options: $options) {
      order { id name } userErrors { field message }
    }
  }`;

  // Dev/trial stores cap order creation at 5/min; wait out that window
  // instead of failing the record (up to 3 waits).
  for (let attempt = 0; ; attempt++) {
    const data = await ctx.shopify.gql(query, variables);
    const result = data.orderCreate;
    if (result.userErrors?.length) {
      const msg = result.userErrors.map((e) => `${e.field?.join(".") ?? ""}: ${e.message}`).join("; ");
      if (/per minute|exceeded.*limit|too many/i.test(msg) && attempt < 3) {
        ctx.log("info", { entity: "orders", action: "load", message: "dev-store order-per-minute cap hit; waiting 61s" });
        await sleep(61000);
        continue;
      }
      throw Object.assign(new Error(msg), { userErrors: result.userErrors });
    }
    return { targetId: result.order.id, handle: result.order.name };
  }
}
