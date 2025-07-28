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

export interface User {
  id: number;
  username: string;
  password_hash: string;
  email?: string;
  created_at: number;
  karma: number;
  about?: string;
  is_admin: boolean;
  is_banned: boolean;
  is_shadowbanned: boolean;
}

export interface Session {
  id: string;
  user_id: number;
  username?: string;
  is_admin?: boolean;
  expires_at: number;
  ip_address?: string;
  user_agent?: string;
  created_at?: number;
}

export interface Story {
  id: number;
  title: string;
  url?: string;
  text?: string;
  user_id: number;
  username?: string;
  points: number;
  created_at: number;
  domain?: string | null;
  is_dead?: boolean;
  is_deleted?: boolean;
}

export interface Comment {
  id: number;
  story_id: number;
  parent_id?: number;
  user_id: number;
  username?: string;
  text: string;
  points: number;
  created_at: number;
  is_deleted?: boolean;
}

export interface Vote {
  user_id: number;
  item_id: number;
  item_type: "story" | "comment";
  vote_type?: "up" | "down";
  created_at: number;
}

export interface RateLimit {
  user_id?: number;
  action?: string;
  date?: string;
  count?: number;
  stories: number;
  comments: number;
}
