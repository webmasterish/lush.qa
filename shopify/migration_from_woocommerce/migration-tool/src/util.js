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
