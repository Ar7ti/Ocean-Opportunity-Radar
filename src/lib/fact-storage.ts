import type { Fact } from "./radar-rules";

export type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const key = (startupId: string) => `oor:facts:v1:${startupId}`;
export const SELECTED_KEY = "oor:selected:v1";

export function loadUserFacts(store: KV, startupId: string): Fact[] {
  try {
    const raw = store.getItem(key(startupId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((f) =>
      f && typeof f.id === "string" && typeof f.text === "string" &&
      typeof f.source === "string" && typeof f.confirmed === "boolean" &&
      typeof f.demo === "boolean" &&
      ["paid_pilot", "technical_test", "customer_interest", "ocean_impact", "other"].includes(f.type) &&
      ["impactResult", "impactUnit", "impactPeriod", "impactBaseline", "verificationSource"].every((k) => f[k] === undefined || typeof f[k] === "string")
    ) : [];
  } catch {
    return [];
  }
}

export function saveUserFacts(store: KV, startupId: string, facts: Fact[]) {
  store.setItem(key(startupId), JSON.stringify(facts));
}

export function clearUserFacts(store: KV, startupId: string) {
  store.removeItem(key(startupId));
}
