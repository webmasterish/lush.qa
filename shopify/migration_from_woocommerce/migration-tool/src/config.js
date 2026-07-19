import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import dotenv from "dotenv";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECTS_DIR = join(ROOT, "config", "projects");

const REQUIRED_JSON_KEYS = [
  "name",
  "source.platform",
  "source.url",
  "source.primary_lang",
  "target.platform",
  "target.store_domain",
  "target.api_version",
  "target.primary_locale",
  "target.currency",
  "phone_default_country",
  "metafield_namespace",
  "source_label",
];

const REQUIRED_ENV_KEYS = [
  "WOO_STORE_URL",
  "WOO_CONSUMER_KEY",
  "WOO_CONSUMER_SECRET",
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_API_VERSION",
  "SHOPIFY_ADMIN_API_TOKEN",
];

// SHOPIFY_CLIENT_ID/SECRET are only required by the mint-token command,
// which validates them itself.

function getPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function listProjects() {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => basename(f, ".json"));
}

export function resolveProjectName(argv = process.argv) {
  const i = argv.indexOf("--project");
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  const projects = listProjects();
  if (projects.length === 1) return projects[0];
  if (projects.length === 0) {
    throw new Error(`No project configs found in ${PROJECTS_DIR}. Create <name>.json + <name>.env there.`);
  }
  throw new Error(
    `Multiple projects found (${projects.join(", ")}). Pass --project <name> to choose one.`
  );
}

export function loadConfig(projectName) {
  const jsonPath = join(PROJECTS_DIR, `${projectName}.json`);
  const envPath = join(PROJECTS_DIR, `${projectName}.env`);

  if (!existsSync(jsonPath)) throw new Error(`Missing project config: ${jsonPath}`);
  if (!existsSync(envPath)) {
    throw new Error(`Missing project secrets file: ${envPath} (see .env.example)`);
  }

  let project;
  try {
    project = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (e) {
    throw new Error(`Invalid JSON in ${jsonPath}: ${e.message}`);
  }

  const missingJson = REQUIRED_JSON_KEYS.filter((k) => {
    const v = getPath(project, k);
    return v === undefined || v === null || v === "";
  });
  if (missingJson.length) {
    throw new Error(`Project config ${jsonPath} is missing required keys: ${missingJson.join(", ")}`);
  }

  const parsed = dotenv.config({ path: envPath, processEnv: {}, quiet: true });
  if (parsed.error) throw new Error(`Failed to read ${envPath}: ${parsed.error.message}`);
  const env = parsed.parsed ?? {};

  const missingEnv = REQUIRED_ENV_KEYS.filter((k) => !env[k]);
  if (missingEnv.length) {
    throw new Error(`Secrets file ${envPath} is missing required keys: ${missingEnv.join(", ")}`);
  }

  // Defaults for optional fields.
  project.source.secondary_langs ??= [];
  project.target.secondary_locales ??= [];
  project.target.production ??= false;
  project.target.allow_wipe ??= false;

  return { project, env, paths: { root: ROOT, jsonPath, envPath } };
}

// Summary safe to print / send to the UI: no secrets, ever.
export function configSummary({ project, env }) {
  return {
    project: project.name,
    source: {
      platform: project.source.platform,
      url: project.source.url,
      langs: [project.source.primary_lang, ...project.source.secondary_langs],
      multilingual_plugin: project.source.multilingual_plugin ?? null,
    },
    target: {
      platform: project.target.platform,
      store_domain: project.target.store_domain,
      api_version: project.target.api_version,
      locales: [project.target.primary_locale, ...project.target.secondary_locales],
      currency: project.target.currency,
      production: project.target.production,
    },
    metafield_namespace: project.metafield_namespace,
    credentials: {
      woo_key: env.WOO_CONSUMER_KEY ? "set" : "MISSING",
      shopify_admin_token: env.SHOPIFY_ADMIN_API_TOKEN ? "set" : "MISSING",
    },
  };
}
