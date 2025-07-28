import { D1Storage } from "./d1-storage";
import type { D1Database } from "@cloudflare/workers-types";

// Factory function to get the appropriate storage
export function getStorage(db: D1Database) {
  return new D1Storage(db);
}

export { D1Storage } from "./d1-storage";
export { KVSessionStorage } from "./kv-sessions";