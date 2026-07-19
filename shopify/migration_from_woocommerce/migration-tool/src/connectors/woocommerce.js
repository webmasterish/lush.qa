// WooCommerce REST connector. STRICTLY READ-ONLY: this module must never
// contain a non-GET request path (PRD §19). The host blocks default library
// user agents, so every request sends a browser-like UA.

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const PER_PAGE = 100;
const RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createWooClient(env) {
  const base = env.WOO_STORE_URL.replace(/\/+$/, "") + "/wp-json/wc/v3/";
  const auth =
    "Basic " + Buffer.from(`${env.WOO_CONSUMER_KEY}:${env.WOO_CONSUMER_SECRET}`).toString("base64");

  // GET with retries: 429/5xx/network errors retry 3x with 1s/2s/4s backoff;
  // other 4xx are permanent and thrown immediately (PRD §18).
  async function request(path, params = {}) {
    const url = new URL(base + path);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    let lastErr;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": UA, Authorization: auth, Accept: "application/json" },
        });
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`HTTP ${res.status} for GET ${url.pathname}${url.search}`);
          continue;
        }
        if (!res.ok) {
          const bodyText = (await res.text()).slice(0, 300);
          const err = new Error(`HTTP ${res.status} for GET ${url.pathname}${url.search}: ${bodyText}`);
          err.permanent = true;
          throw err;
        }
        return {
          body: await res.json(),
          total: Number(res.headers.get("x-wp-total") ?? 0),
          totalPages: Number(res.headers.get("x-wp-totalpages") ?? 0),
        };
      } catch (e) {
        if (e.permanent) throw e;
        lastErr = e;
      }
    }
    throw lastErr;
  }

  // Cheap total lookup via the X-WP-Total header.
  async function getTotal(path, params = {}) {
    const { total } = await request(path, { ...params, per_page: 1 });
    return total;
  }

  async function fetchAll(path, params = {}, { limit = null, onPage = null } = {}) {
    const out = [];
    let page = 1;
    let totalPages = 1;
    do {
      const { body, totalPages: tp } = await request(path, { ...params, per_page: PER_PAGE, page });
      totalPages = tp || 1;
      out.push(...body);
      onPage?.({ page, totalPages, fetched: out.length });
      if (limit != null && out.length >= limit) break;
      page++;
    } while (page <= totalPages);
    return limit != null ? out.slice(0, limit) : out;
  }

  return { request, getTotal, fetchAll };
}
