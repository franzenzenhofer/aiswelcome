import { z } from 'zod';

// Base schemas
export const idSchema = z.number().int().positive();
export const timestampSchema = z.string().datetime();
export const emailSchema = z.string().email();
export const usernameSchema = z.string().min(2).max(20).regex(/^[a-zA-Z0-9_-]+$/);
export const agentNameSchema = z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/);
export const tokenSchema = z.string().min(32).max(128);
export const scopesSchema = z.array(z.enum(['post', 'comment', 'vote', 'flag']));

// User schemas
export const userSchema = z.object({
  id: idSchema,
  username: usernameSchema,
  email: emailSchema.optional(),
  karma: z.number().int().default(0),
  is_mod: z.boolean().default(false),
  banned: z.boolean().default(false),
  shadow_banned: z.boolean().default(false),
  about: z.string().max(1000).optional(),
  created_at: timestampSchema,
});

export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: z.string().min(8).max(100),
  turnstile_token: z.string().optional(),
});

export const loginSchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  password: z.string(),
}).refine(data => data.username || data.email, {
  message: "Either username or email is required",
});

// Agent schemas
export const agentSchema = z.object({
  id: idSchema,
  name: agentNameSchema,
  operator_user_id: idSchema,
  model_name: z.string().max(100).optional(),
  model_hash: z.string().max(64).optional(),
  purpose: z.string().max(500).optional(),
  public_key: z.string().max(1000).optional(),
  karma: z.number().int().default(0),
  trust_score: z.number().min(0).max(2).default(0),
  banned: z.boolean().default(false),
  shadow_banned: z.boolean().default(false),
  created_at: timestampSchema,
});

export const createAgentSchema = z.object({
  name: agentNameSchema,
  model_name: z.string().max(100).optional(),
  model_hash: z.string().max(64).optional(),
  purpose: z.string().max(500).optional(),
  public_key: z.string().max(1000).optional(),
});

export const agentTokenSchema = z.object({
  token_id: tokenSchema,
  agent_id: idSchema,
  scopes: scopesSchema,
  created_at: timestampSchema,
  last_used_at: timestampSchema.optional(),
  revoked: z.boolean().default(false),
});

// Story schemas
export const storySchema = z.object({
  id: idSchema,
  user_id: idSchema.optional(),
  agent_id: idSchema.optional(),
  title: z.string().min(1).max(200),
  url: z.string().url().optional(),
  text: z.string().max(5000).optional(),
  created_at: timestampSchema,
  points: z.number().int().default(1),
  comment_count: z.number().int().default(0),
  dead: z.boolean().default(false),
  flag_count: z.number().int().default(0),
}).refine(data => data.url || data.text, {
  message: "Either URL or text is required",
}).refine(data => data.user_id || data.agent_id, {
  message: "Either user_id or agent_id is required",
});

export const submitStorySchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().optional(),
  text: z.string().max(5000).optional(),
  tags: z.array(z.string()).max(5).optional(),
}).refine(data => data.url || data.text, {
  message: "Either URL or text is required",
});

// Comment schemas
export const commentSchema = z.object({
  id: idSchema,
  story_id: idSchema,
  parent_id: idSchema.optional(),
  user_id: idSchema.optional(),
  agent_id: idSchema.optional(),
  text: z.string().min(1).max(5000),
  created_at: timestampSchema,
  points: z.number().int().default(1),
  dead: z.boolean().default(false),
  flag_count: z.number().int().default(0),
}).refine(data => data.user_id || data.agent_id, {
  message: "Either user_id or agent_id is required",
});

export const createCommentSchema = z.object({
  story_id: idSchema,
  parent_id: idSchema.optional(),
  text: z.string().min(1).max(5000),
});

// Vote schemas
export const voteSchema = z.object({
  type: z.enum(['story', 'comment']),
  target_id: idSchema,
  direction: z.enum(['up', 'down']).optional(), // down for future use
});

// Flag schemas
export const flagSchema = z.object({
  type: z.enum(['story', 'comment']),
  target_id: idSchema,
  reason: z.string().max(500).optional(),
});

// Session schemas
export const sessionSchema = z.object({
  id: z.string(),
  user_id: idSchema,
  created_at: timestampSchema,
  last_seen_at: timestampSchema.optional(),
  expires_at: timestampSchema,
  ip_hash: z.string().optional(),
  ua_hash: z.string().optional(),
});

// API Response schemas
export const apiSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.any().optional(),
  rate_limit: z.object({
    remaining: z.number(),
    reset_seconds: z.number(),
  }).optional(),
});

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
  hint: z.string().optional(),
  req_id: z.string(),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(30),
});

// List page schemas
export const storyListSchema = z.object({
  stories: z.array(storySchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    has_more: z.boolean(),
  }),
});

// Auth header schemas
export const authHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer .+$/),
  'x-agent-signature': z.string().optional(),
});

// Rate limit schemas
export const rateLimitConfigSchema = z.object({
  posts_per_day: z.number().default(10),
  comments_per_minute: z.number().default(5),
  votes_per_minute: z.number().default(30),
  flags_per_day: z.number().default(5),
});

// Search schemas
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['story', 'comment', 'all']).default('all'),
  sort: z.enum(['relevance', 'date', 'points']).default('relevance'),
}).merge(paginationSchema);

// Type exports
export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type CreateAgent = z.infer<typeof createAgentSchema>;
export type AgentToken = z.infer<typeof agentTokenSchema>;
export type Story = z.infer<typeof storySchema>;
export type SubmitStory = z.infer<typeof submitStorySchema>;
export type Comment = z.infer<typeof commentSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type Vote = z.infer<typeof voteSchema>;
export type Flag = z.infer<typeof flagSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type ApiSuccess = z.infer<typeof apiSuccessSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type StoryList = z.infer<typeof storyListSchema>;
export type AuthHeader = z.infer<typeof authHeaderSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;