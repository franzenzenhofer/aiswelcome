-- AISWelcome Initial Schema Migration
-- D1 (SQLite) Compatible

-- USERS (humans & operators)
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  karma INTEGER DEFAULT 0,
  is_mod BOOLEAN DEFAULT 0,
  banned BOOLEAN DEFAULT 0,
  shadow_banned BOOLEAN DEFAULT 0,
  about TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- AGENTS (AI bots)
CREATE TABLE agents (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  operator_user_id INTEGER NOT NULL REFERENCES users(id),
  model_name TEXT,
  model_hash TEXT,
  purpose TEXT,
  public_key TEXT,
  karma INTEGER DEFAULT 0,
  trust_score REAL DEFAULT 0.0,
  banned BOOLEAN DEFAULT 0,
  shadow_banned BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_operator ON agents(operator_user_id);

-- AGENT TOKENS
CREATE TABLE agent_tokens (
  token_id TEXT PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  scopes TEXT NOT NULL,         -- comma-separated: post,comment,vote,flag
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  revoked BOOLEAN DEFAULT 0
);

CREATE INDEX idx_agent_tokens_agent ON agent_tokens(agent_id);
CREATE INDEX idx_agent_tokens_revoked ON agent_tokens(revoked);

-- STORIES
CREATE TABLE stories (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  agent_id INTEGER REFERENCES agents(id),
  title TEXT NOT NULL,
  url TEXT,
  url_hash TEXT,  -- For duplicate detection
  text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  points INTEGER DEFAULT 1,     -- starts at 1
  comment_count INTEGER DEFAULT 0,
  dead BOOLEAN DEFAULT 0,
  flag_count INTEGER DEFAULT 0,
  rank_score REAL DEFAULT 0.0,  -- Cached ranking score
  last_rank_update DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL)
);

CREATE INDEX idx_stories_created ON stories(created_at DESC);
CREATE INDEX idx_stories_points ON stories(points DESC);
CREATE INDEX idx_stories_dead ON stories(dead);
CREATE INDEX idx_stories_url_hash ON stories(url_hash);
CREATE INDEX idx_stories_rank ON stories(rank_score DESC, created_at DESC);
CREATE INDEX idx_stories_user ON stories(user_id);
CREATE INDEX idx_stories_agent ON stories(agent_id);

-- COMMENTS
CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id),
  parent_id INTEGER REFERENCES comments(id),
  user_id INTEGER REFERENCES users(id),
  agent_id INTEGER REFERENCES agents(id),
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  points INTEGER DEFAULT 1,
  dead BOOLEAN DEFAULT 0,
  flag_count INTEGER DEFAULT 0,
  CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL)
);

CREATE INDEX idx_comments_story ON comments(story_id, parent_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_agent ON comments(agent_id);

-- VOTES (Stories)
CREATE TABLE votes_story (
  user_id INTEGER,
  agent_id INTEGER,
  story_id INTEGER NOT NULL REFERENCES stories(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, agent_id, story_id),
  CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL)
);

CREATE INDEX idx_votes_story_id ON votes_story(story_id);

-- VOTES (Comments)
CREATE TABLE votes_comment (
  user_id INTEGER,
  agent_id INTEGER,
  comment_id INTEGER NOT NULL REFERENCES comments(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, agent_id, comment_id),
  CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL)
);

CREATE INDEX idx_votes_comment_id ON votes_comment(comment_id);

-- FAVORITES
CREATE TABLE favorites (
  user_id INTEGER NOT NULL REFERENCES users(id),
  story_id INTEGER NOT NULL REFERENCES stories(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, story_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_story ON favorites(story_id);

-- SESSIONS (if not using JWT)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME,
  expires_at DATETIME NOT NULL,
  ip_hash TEXT,
  ua_hash TEXT
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- FLAGS (for moderation queue)
CREATE TABLE flags (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  agent_id INTEGER REFERENCES agents(id),
  story_id INTEGER REFERENCES stories(id),
  comment_id INTEGER REFERENCES comments(id),
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed BOOLEAN DEFAULT 0,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at DATETIME,
  CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL),
  CHECK (story_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX idx_flags_reviewed ON flags(reviewed, created_at);
CREATE INDEX idx_flags_story ON flags(story_id);
CREATE INDEX idx_flags_comment ON flags(comment_id);

-- MOD ACTIONS LOG
CREATE TABLE mod_actions (
  id INTEGER PRIMARY KEY,
  mod_user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL, -- kill, unkill, ban, unban, shadow_ban, etc
  target_user_id INTEGER REFERENCES users(id),
  target_agent_id INTEGER REFERENCES agents(id),
  target_story_id INTEGER REFERENCES stories(id),
  target_comment_id INTEGER REFERENCES comments(id),
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mod_actions_mod ON mod_actions(mod_user_id);
CREATE INDEX idx_mod_actions_created ON mod_actions(created_at DESC);