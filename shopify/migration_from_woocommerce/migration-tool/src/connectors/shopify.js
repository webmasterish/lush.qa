// Shopify Admin GraphQL client (PRD §18): single in-flight mutation,
// cost-aware pre-emptive throttling, THROTTLED retries with backoff (max 5),
// network/5xx retries (max 3). Callers handle per-mutation userErrors.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createShopifyClient(env) {
  const url = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_API_TOKEN,
  };

  // Throttle state from extensions.cost on each response.
  let available = 2000;
  let restoreRate = 100;
  let lastCost = 50;

  async function gql(query, variables = {}) {
    const expected = Math.max(lastCost * 1.5, 100);
    if (available < expected) {
      await sleep(Math.ceil(((expected - available) / restoreRate) * 1000));
    }

    let throttled = 0;
    let netFail = 0;
    for (;;) {
      let res;
      try {
        res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query, variables }) });
      } catch (e) {
        if (++netFail > 3) throw e;
        await sleep(1000 * 2 ** (netFail - 1));
        continue;
      }
      if (res.status >= 500 || res.status === 429) {
        if (++netFail > 3) throw new Error(`Shopify HTTP ${res.status} after retries`);
        await sleep(1000 * 2 ** (netFail - 1));
        continue;
      }
      if (!res.ok) throw new Error(`Shopify HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

      const json = await res.json();
      const cost = json.extensions?.cost;
      if (cost) {
        available = cost.throttleStatus?.currentlyAvailable ?? available;
        restoreRate = cost.throttleStatus?.restoreRate ?? restoreRate;
        lastCost = cost.actualQueryCost ?? cost.requestedQueryCost ?? lastCost;
      }

      if (json.errors?.length) {
        if (json.errors.some((e) => e.extensions?.code === "THROTTLED")) {
          if (++throttled > 5) throw new Error("Shopify THROTTLED after 5 retries");
          await sleep(1000 * 2 ** (throttled - 1));
          continue;
        }
        // Top-level errors (syntax, auth, access): not per-record userErrors.
        throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors).slice(0, 500)}`);
      }
      return json.data;
    }
  }

  let locationId = null;
  async function getPrimaryLocationId() {
    if (!locationId) {
      const data = await gql(`{ locations(first: 1) { nodes { id } } }`);
      locationId = data.locations?.nodes?.[0]?.id;
      if (!locationId) throw new Error("No Shopify location found (locations(first:1) empty)");
    }
    return locationId;
  }

  let onlineStoreId = null;
  async function getOnlineStorePublicationId() {
    if (!onlineStoreId) {
      const data = await gql(`{ publications(first: 10) { nodes { id name } } }`);
      onlineStoreId = data.publications?.nodes?.find((p) => p.name === "Online Store")?.id;
      if (!onlineStoreId) throw new Error("No 'Online Store' publication found — is the Online Store sales channel installed?");
    }
    return onlineStoreId;
  }

  // Publish a product/collection to the Online Store channel (idempotent).
  async function publishToOnlineStore(resourceId) {
    const publicationId = await getOnlineStorePublicationId();
    const data = await gql(
      `mutation ($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) { userErrors { field message } }
      }`,
      { id: resourceId, input: [{ publicationId }] }
    );
    const errs = data.publishablePublish?.userErrors;
    if (errs?.length) {
      throw Object.assign(new Error(errs.map((e) => e.message).join("; ")), { userErrors: errs });
    }
  }

  return { gql, getPrimaryLocationId, getOnlineStorePublicationId, publishToOnlineStore };
}
