// Customers (PRD §10.4): email is the dedup/adopt key, billing address is
// the default, shipping added only when it differs. Marketing consent is
// NEVER sent — historical customers must not be opted in by migration.

// PRD phone rule: strip non-digits; drop leading 00; country-digit prefix ->
// +; bare local (8 digits for Qatar) -> prepend country; else + passthrough.
export function normalizePhone(raw, countryCode /* e.g. "+974" */) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  const cc = countryCode.replace(/\D/g, "");
  if (digits.startsWith(cc)) return `+${digits}`;
  const localLen = 8; // Qatar local number length
  if (digits.length === localLen) return `${countryCode}${digits}`;
  return `+${digits}`;
}

function address(a, phone) {
  if (!a || (!a.address_1 && !a.city && !a.country)) return null;
  const out = {
    firstName: a.first_name || undefined,
    lastName: a.last_name || undefined,
    company: a.company || undefined,
    address1: a.address_1 || undefined,
    address2: a.address_2 || undefined,
    city: a.city || undefined,
    zip: a.postcode || undefined,
    provinceCode: a.state || undefined,
    countryCode: a.country || undefined,
    phone: phone || undefined,
  };
  return out;
}

function sameAddress(a, b) {
  const norm = (x) => [x.address_1, x.address_2, x.city, x.postcode, x.country, x.state].map((v) => (v ?? "").trim().toLowerCase()).join("|");
  return norm(a) === norm(b);
}

// Pure transform. helpers: { phoneCountry }. Returns { input, extras } or
// { skip: reason }.
export function transformCustomer(rec, _ar, helpers) {
  const email = (rec.email ?? "").trim().toLowerCase();
  if (!email) return { skip: "no email; cannot migrate (email is the dedup key)" };

  const phone = normalizePhone(rec.billing?.phone, helpers.phoneCountry);
  const input = {
    email,
    firstName: rec.first_name || rec.billing?.first_name || undefined,
    lastName: rec.last_name || rec.billing?.last_name || undefined,
  };
  if (phone) input.phone = phone;

  const addresses = [];
  const billing = address(rec.billing, phone);
  if (billing) addresses.push(billing);
  if (rec.shipping && billing && !sameAddress(rec.billing, rec.shipping)) {
    const shipping = address(rec.shipping, normalizePhone(rec.shipping?.phone, helpers.phoneCountry));
    if (shipping) addresses.push(shipping);
  } else if (!billing && rec.shipping) {
    const shipping = address(rec.shipping, null);
    if (shipping) addresses.push(shipping);
  }
  if (addresses.length) input.addresses = addresses;

  return { input, extras: {} };
}

const CUSTOMER_FIELDS = `customer { id email } userErrors { field message }`;

async function findByEmail(ctx, email) {
  const data = await ctx.shopify.gql(
    `query ($q: String!) { customers(first: 1, query: $q) { nodes { id email } } }`,
    { q: `email:'${email}'` }
  );
  const found = data.customers?.nodes?.[0];
  return found && found.email?.toLowerCase() === email ? found : null;
}

async function mutate(ctx, action, input, targetId) {
  const payload = action === "create" ? input : { ...input, id: targetId };
  const mutation = action === "create" ? "customerCreate" : "customerUpdate";
  const data = await ctx.shopify.gql(
    `mutation ($input: CustomerInput!) { ${mutation}(input: $input) { ${CUSTOMER_FIELDS} } }`,
    { input: payload }
  );
  const result = data[mutation];
  if (result.userErrors?.length) {
    throw Object.assign(new Error(result.userErrors.map((e) => `${e.field?.join(".") ?? ""}: ${e.message}`).join("; ")), {
      userErrors: result.userErrors,
    });
  }
  return result.customer;
}

export async function loadCustomer(ctx, action, input, metafields, mapped) {
  // Adopt-by-email: a customer with this email may already exist (demo seed
  // or a previous run with a lost map).
  if (action === "create") {
    const existing = await findByEmail(ctx, input.email);
    if (existing) {
      action = "update";
      mapped = { target_id: existing.id };
    }
  }
  const payload = { ...input, metafields };
  try {
    const customer = await mutate(ctx, action, payload, mapped?.target_id);
    return { targetId: customer.id, handle: customer.email };
  } catch (e) {
    // Junk/test registrations in the source (bot or security-scan traffic)
    // carry emails Shopify rejects — not migratable, not a tool failure.
    if (e.userErrors?.some((u) => /email is invalid/i.test(u.message))) {
      e.softSkip = `source email rejected as invalid (junk/test registration): ${input.email}`;
      throw e;
    }
    // PRD §10.4: if Shopify rejects the phone, retry once without it.
    const phoneError = e.userErrors?.some((u) => (u.field ?? []).join(".").includes("phone") || /phone/i.test(u.message));
    if (phoneError && (payload.phone || payload.addresses?.some((a) => a.phone))) {
      ctx.log("warn", { entity: "customers", action: "load", message: `phone rejected (${e.message}); retrying without phone` });
      const { phone, ...rest } = payload;
      rest.addresses = rest.addresses?.map(({ phone: _p, ...a }) => a);
      const customer = await mutate(ctx, action, rest, mapped?.target_id);
      return { targetId: customer.id, handle: customer.email };
    }
    throw e;
  }
}
