export interface Bindings {
  // D1 Database
  DB: D1Database;
  
  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  
  // Durable Objects
  RATE_LIMITER: DurableObjectNamespace;
  
  // R2 Buckets
  BACKUPS: R2Bucket;
  LOGS: R2Bucket;
  
  // Queues
  MODERATION_QUEUE: Queue;
  
  // Environment variables
  ENVIRONMENT: string;
  JWT_SECRET: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  ADMIN_TOKEN: string;
}