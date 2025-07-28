import { D1Storage } from "./d1-storage";
import { storage } from "./inmemory";
import type { D1Database } from "@cloudflare/workers-types";

// Factory function to get the appropriate storage
export function getStorage(db?: D1Database) {
  if (db) {
    return new D1Storage(db);
  }
  // Fallback to in-memory storage
  return storage;
}

// Export in-memory storage instance for backwards compatibility
export { storage } from "./inmemory";
export { D1Storage } from "./d1-storage";
export { KVSessionStorage } from "./kv-sessions";