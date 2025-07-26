-- User authentication and management tables
-- Optimized for Cloudflare D1 (SQLite at the edge)

-- Users table with all HN-like fields
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    
    -- Profile fields
    about TEXT,
    karma INTEGER DEFAULT 0,
    avg REAL DEFAULT 1.0, -- average karma per submission
    
    -- Permissions
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    is_shadowbanned BOOLEAN DEFAULT FALSE,
    
    -- Settings (like HN)
    showdead BOOLEAN DEFAULT FALSE, -- show dead submissions
    noprocrast INTEGER DEFAULT 0, -- minutes of procrastination
    maxvisit INTEGER DEFAULT 0, -- max visit length in minutes  
    minaway INTEGER DEFAULT 0, -- min time away in minutes
    delay INTEGER DEFAULT 0, -- comment delay in minutes
    
    -- Email preferences
    email_replies BOOLEAN DEFAULT TRUE,
    email_mentions BOOLEAN DEFAULT TRUE,
    email_digest BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CHECK (length(username) >= 2 AND length(username) <= 15),
    CHECK (karma >= 0)
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Login attempts for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    attempted_at INTEGER DEFAULT (unixepoch()),
    success BOOLEAN DEFAULT FALSE,
    
    INDEX idx_login_attempts_username (username),
    INDEX idx_login_attempts_ip (ip_address)
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    story_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    
    PRIMARY KEY (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    CHECK (story_count >= 0 AND story_count <= 50),
    CHECK (comment_count >= 0 AND comment_count <= 200)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit log for important actions
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_karma ON users(karma DESC);
CREATE INDEX idx_users_created ON users(created_at DESC);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_rate_limits_date ON rate_limits(date);

-- Insert admin user (password will be set via API)
INSERT INTO users (username, password_hash, email, is_admin, karma)
VALUES ('franz', 'WQquOh1C0VU+k6qFjKgvuPtEH7dQyPu8KqzUgV8S5t0=', 'franz@aiswelcome.com', TRUE, 9999)
ON CONFLICT(username) DO NOTHING;