import { createHash } from "node:crypto";

// Deterministic JSON: objects get recursively key-sorted so the same data
// always hashes the same regardless of key order in the source payload.
export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${parts.join(",")}}`;
}

export function sha256(input) {
  const data = typeof input === "string" ? input : stableStringify(input);
  return createHash("sha256").update(data, "utf8").digest("hex");
}

export function nowIso() {
  return new Date().toISOString();
}

// Woo names/descriptions arrive HTML-entity-encoded ("Lotions &amp; Butter").
export function decodeEntities(s) {
  if (!s) return s ?? "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(s) {
  if (!s) return "";
  return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

// Shopify's file fetcher rejects URLs with raw non-ASCII characters (e.g.
// "SCOOBYDOO™_Bath_Bomb.jpg"). Encode only those, leaving existing
// percent-encoding untouched (encodeURI would double-encode it).
export function encodeImageUrl(url) {
  if (!url) return url;
  return url.replace(/[^\x21-\x7e]/g, (c) => encodeURIComponent(c));
}

// Woo slugs are percent-encoded for Arabic; Shopify handles must be decoded.
export function decodeSlug(slug) {
  try {
    return decodeURIComponent(slug ?? "");
  } catch {
    return slug ?? "";
  }
}
