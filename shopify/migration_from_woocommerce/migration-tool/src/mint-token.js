// mint-token: mint an OFFLINE Admin API token (shpat_/shpca_...) for a Dev
// Dashboard app via the OAuth authorization-code flow, and write it into the
// project's env file. Node port of legacy/get_admin_token.py.
//
//   node src/cli.js --project <name> mint-token url
//     -> prints the authorize URL; open it in a browser logged into the
//        store, approve, copy the redirected URL (page may not load).
//   node src/cli.js --project <name> mint-token exchange "<redirected-url-or-code>"
//     -> exchanges the code and writes SHOPIFY_ADMIN_API_TOKEN to the env file.
//
// The offline token does not expire; re-run only if revoked or scopes change.
import { readFileSync, writeFileSync } from "node:fs";

const REDIRECT_URI = "https://example.com";
const SCOPES =
  "read_customers,write_customers,write_draft_orders,read_draft_orders,read_files," +
  "write_files,write_inventory,read_inventory,read_legal_policies,write_legal_policies," +
  "read_locales,write_locales,read_metaobject_definitions,write_metaobject_definitions," +
  "read_metaobjects,write_metaobjects,read_online_store_navigation," +
  "write_online_store_navigation,read_online_store_pages,write_online_store_pages," +
  "write_order_edits,read_order_edits,read_orders,write_orders,read_all_orders," +
  "read_product_listings,write_product_listings,read_products,write_products," +
  "read_publications,write_publications,read_content,write_content,write_theme_code," +
  "read_translations,write_translations";

function envSet(envPath, key, value) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  let found = false;
  const out = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) out.push(`${key}=${value}`);
  writeFileSync(envPath, out.join("\n"));
}

export function mintTokenUrl(cfg) {
  const { env } = cfg;
  if (!env.SHOPIFY_CLIENT_ID) throw new Error("Set SHOPIFY_CLIENT_ID in the project env file first.");
  const params = new URLSearchParams({
    client_id: env.SHOPIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    "grant_options[]": "",
  });
  const url = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/oauth/authorize?${params}`;
  return [
    `1) Ensure this redirect URL is registered in the Dev Dashboard app: ${REDIRECT_URI}`,
    `2) Open this URL in a browser logged into the store, then Approve:`,
    ``,
    url,
    ``,
    `3) Copy the redirected URL (or its ?code=...) and run:`,
    `   node src/cli.js --project ${cfg.project.name} mint-token exchange "<redirected-url-or-code>"`,
  ].join("\n");
}

export async function mintTokenExchange(cfg, arg) {
  const { env, paths } = cfg;
  if (!env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET) {
    throw new Error("Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in the project env file first.");
  }
  const m = /[?&]code=([^&]+)/.exec(arg);
  const code = m ? decodeURIComponent(m[1]) : arg.trim();
  const res = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET, code }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`No access_token in response: ${JSON.stringify(data).slice(0, 300)}`);
  envSet(paths.envPath, "SHOPIFY_ADMIN_API_TOKEN", data.access_token);
  return `OK: wrote SHOPIFY_ADMIN_API_TOKEN (${data.access_token.slice(0, 10)}...) to ${paths.envPath}\ngranted scopes: ${data.scope ?? "?"}`;
}
