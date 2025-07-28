-- AISWelcome D1 Database Schema
-- SQLite compatible schema for Cloudflare D1

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    email TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    karma INTEGER NOT NULL DEFAULT 0,
    about TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT 0,
    is_banned BOOLEAN NOT NULL DEFAULT 0,
    is_shadowbanned BOOLEAN NOT NULL DEFAULT 0,
    delay INTEGER NOT NULL DEFAULT 0,
    noprocrast INTEGER NOT NULL DEFAULT 0,
    showdead BOOLEAN NOT NULL DEFAULT 0,
    topcolor TEXT DEFAULT '#ff6600'
);

-- Create indexes for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_karma ON users(karma);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    text TEXT,
    points INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    domain TEXT,
    is_dead BOOLEAN NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for stories
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_created_at ON stories(created_at);
CREATE INDEX idx_stories_points ON stories(points);
CREATE INDEX idx_stories_domain ON stories(domain);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    story_id INTEGER NOT NULL,
    parent_id INTEGER,
    text TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    is_dead BOOLEAN NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (story_id) REFERENCES stories(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id)
);

-- Create indexes for comments
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_story_id ON comments(story_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('story', 'comment')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, item_id, item_type),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for votes
CREATE INDEX idx_votes_item ON votes(item_id, item_type);
CREATE INDEX idx_votes_created_at ON votes(created_at);
CREATE INDEX idx_votes_user_item ON votes(user_id, item_id, item_type);

-- Sessions table (backup for KV)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    story_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Hidden stories table
CREATE TABLE IF NOT EXISTS hidden_stories (
    user_id INTEGER NOT NULL,
    story_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, story_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (story_id) REFERENCES stories(id)
);

-- Saved/favorite stories table
CREATE TABLE IF NOT EXISTS saved_stories (
    user_id INTEGER NOT NULL,
    story_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, story_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (story_id) REFERENCES stories(id)
);

-- Flags table
CREATE TABLE IF NOT EXISTS flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('story', 'comment')),
    reason TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for flags
CREATE INDEX idx_flags_item ON flags(item_id, item_type);
CREATE INDEX idx_flags_created_at ON flags(created_at);

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (story_id) REFERENCES stories(id)
);

-- Poll options table
CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0,
    option_order INTEGER NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES polls(id)
);

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
    user_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, option_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (option_id) REFERENCES poll_options(id)
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    inviter_id INTEGER NOT NULL,
    invitee_email TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    used_at INTEGER,
    used_by_id INTEGER,
    FOREIGN KEY (inviter_id) REFERENCES users(id),
    FOREIGN KEY (used_by_id) REFERENCES users(id)
);

-- Create indexes for invites
CREATE INDEX idx_invites_inviter_id ON invites(inviter_id);
CREATE INDEX idx_invites_invitee_email ON invites(invitee_email);

-- Insert default admin user
INSERT OR IGNORE INTO users (username, password_hash, email, is_admin, karma) 
VALUES ('franz', 'WQquOh1C0VU+k6qFjKgvuPtEH7dQyPu8KqzUgV8S5t0=', 'franz@aiswelcome.com', 1, 9999);

-- Create full-text search virtual table for stories
CREATE VIRTUAL TABLE IF NOT EXISTS stories_fts USING fts5(
    title, 
    text, 
    content=stories, 
    content_rowid=id
);

-- Create full-text search virtual table for comments
CREATE VIRTUAL TABLE IF NOT EXISTS comments_fts USING fts5(
    text, 
    content=comments, 
    content_rowid=id
);

-- Triggers to keep FTS tables in sync
CREATE TRIGGER IF NOT EXISTS stories_ai AFTER INSERT ON stories BEGIN
    INSERT INTO stories_fts(rowid, title, text) VALUES (new.id, new.title, new.text);
END;

CREATE TRIGGER IF NOT EXISTS stories_ad AFTER DELETE ON stories BEGIN
    INSERT INTO stories_fts(stories_fts, rowid, title, text) VALUES('delete', old.id, old.title, old.text);
END;

CREATE TRIGGER IF NOT EXISTS stories_au AFTER UPDATE ON stories BEGIN
    INSERT INTO stories_fts(stories_fts, rowid, title, text) VALUES('delete', old.id, old.title, old.text);
    INSERT INTO stories_fts(rowid, title, text) VALUES (new.id, new.title, new.text);
END;

CREATE TRIGGER IF NOT EXISTS comments_ai AFTER INSERT ON comments BEGIN
    INSERT INTO comments_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS comments_ad AFTER DELETE ON comments BEGIN
    INSERT INTO comments_fts(comments_fts, rowid, text) VALUES('delete', old.id, old.text);
END;

CREATE TRIGGER IF NOT EXISTS comments_au AFTER UPDATE ON comments BEGIN
    INSERT INTO comments_fts(comments_fts, rowid, text) VALUES('delete', old.id, old.text);
    INSERT INTO comments_fts(rowid, text) VALUES (new.id, new.text);
END;