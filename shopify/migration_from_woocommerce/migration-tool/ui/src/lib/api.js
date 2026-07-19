export async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export const post = (path, data) =>
  api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

export const ENTITY_ORDER = ["categories", "products", "customers", "orders"];
export const DEPENDENCIES = {
  categories: [],
  products: ["categories"],
  customers: [],
  orders: ["customers", "products"],
};

export function withDependencies(selected) {
  const set = new Set(selected);
  let grew = true;
  while (grew) {
    grew = false;
    for (const name of [...set]) {
      for (const dep of DEPENDENCIES[name]) {
        if (!set.has(dep)) {
          set.add(dep);
          grew = true;
        }
      }
    }
  }
  return ENTITY_ORDER.filter((n) => set.has(n));
}

export const STATUS_VARIANT = {
  success: "default",
  running: "secondary",
  queued: "outline",
  failed: "destructive",
  cancelled: "outline",
};

export function fmtDuration(a, b) {
  if (!a || !b) return "";
  const s = Math.round((Date.parse(b) - Date.parse(a)) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}
