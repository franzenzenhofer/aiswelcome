import { D1Database } from '@cloudflare/workers-types';
import { hashPassword, verifyPassword, generateSessionId } from './crypto';
import { AUTH_CONFIG, FORBIDDEN_USERNAMES, AUTH_ERRORS } from './constants';

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
  username: string;
  is_admin: boolean;
  expires_at: number;
}

export class AuthService {
  constructor(private db: D1Database) {}

  async register(username: string, password: string, email?: string): Promise<User> {
    // Validate username
    const usernameValidation = this.validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.error);
    }

    // Validate password
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    // Check if username exists
    const existing = await this.db
      .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
      .bind(username)
      .first();

    if (existing) {
      throw new Error(AUTH_ERRORS.USERNAME_TAKEN);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const result = await this.db
      .prepare(
        `INSERT INTO users (username, password_hash, email) 
         VALUES (?, ?, ?) 
         RETURNING *`
      )
      .bind(username, passwordHash, email || null)
      .first<User>();

    if (!result) {
      throw new Error('Failed to create user');
    }

    // Log registration
    await this.logAudit(result.id, 'user.registered', { username });

    return result;
  }

  async login(username: string, password: string, request: Request): Promise<Session> {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    // Check rate limiting
    const isRateLimited = await this.checkLoginRateLimit(username, ip);
    if (isRateLimited) {
      throw new Error(AUTH_ERRORS.RATE_LIMIT_EXCEEDED);
    }

    // Get user
    const user = await this.db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
      .bind(username)
      .first<User>();

    // Log attempt
    await this.logLoginAttempt(username, ip, false);

    if (!user) {
      throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    // Check if banned
    if (user.is_banned) {
      throw new Error(AUTH_ERRORS.ACCOUNT_BANNED);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    // Update login attempt as successful
    await this.logLoginAttempt(username, ip, true);

    // Create session
    const session = await this.createSession(user, ip, userAgent);

    // Log successful login
    await this.logAudit(user.id, 'user.login', { ip, userAgent });

    return session;
  }

  async logout(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.db
        .prepare('DELETE FROM sessions WHERE id = ?')
        .bind(sessionId)
        .run();

      await this.logAudit(session.user_id, 'user.logout');
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.db
      .prepare(`
        SELECT s.*, u.username, u.is_admin 
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > unixepoch()
      `)
      .bind(sessionId)
      .first<Session>();

    return result || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();

    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await this.db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
      .bind(username)
      .first<User>();

    return user || null;
  }

  async updateKarma(userId: number, delta: number): Promise<void> {
    await this.db
      .prepare('UPDATE users SET karma = karma + ? WHERE id = ?')
      .bind(delta, userId)
      .run();
  }

  async checkRateLimit(userId: number, type: 'story' | 'comment'): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const limits = await this.db
      .prepare('SELECT * FROM rate_limits WHERE user_id = ? AND date = ?')
      .bind(userId, today)
      .first<{ story_count: number; comment_count: number }>();

    if (!limits) {
      // Create entry for today
      await this.db
        .prepare('INSERT INTO rate_limits (user_id, date) VALUES (?, ?)')
        .bind(userId, today)
        .run();
      return true; // First action of the day
    }

    if (type === 'story' && limits.story_count >= AUTH_CONFIG.MAX_STORIES_PER_DAY) {
      return false;
    }

    if (type === 'comment' && limits.comment_count >= AUTH_CONFIG.MAX_COMMENTS_PER_DAY) {
      return false;
    }

    return true;
  }

  async incrementRateLimit(userId: number, type: 'story' | 'comment'): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const column = type === 'story' ? 'story_count' : 'comment_count';

    await this.db
      .prepare(`
        INSERT INTO rate_limits (user_id, date, ${column})
        VALUES (?, ?, 1)
        ON CONFLICT(user_id, date) DO UPDATE SET
        ${column} = ${column} + 1
      `)
      .bind(userId, today)
      .run();
  }

  private async createSession(user: User, ip: string, userAgent: string): Promise<Session> {
    const sessionId = generateSessionId();
    const expiresAt = Math.floor(Date.now() / 1000) + (AUTH_CONFIG.SESSION_DURATION / 1000);

    await this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(sessionId, user.id, expiresAt, ip, userAgent)
      .run();

    return {
      id: sessionId,
      user_id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      expires_at: expiresAt
    };
  }

  private validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || username.length < AUTH_CONFIG.MIN_USERNAME_LENGTH) {
      return { valid: false, error: AUTH_ERRORS.USERNAME_TOO_SHORT };
    }

    if (username.length > AUTH_CONFIG.MAX_USERNAME_LENGTH) {
      return { valid: false, error: AUTH_ERRORS.USERNAME_TOO_LONG };
    }

    if (!AUTH_CONFIG.USERNAME_REGEX.test(username)) {
      return { valid: false, error: AUTH_ERRORS.USERNAME_INVALID };
    }

    if (FORBIDDEN_USERNAMES.has(username.toLowerCase())) {
      return { valid: false, error: AUTH_ERRORS.USERNAME_FORBIDDEN };
    }

    return { valid: true };
  }

  private validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
      return { valid: false, error: AUTH_ERRORS.PASSWORD_TOO_SHORT };
    }

    return { valid: true };
  }

  private async checkLoginRateLimit(username: string, ip: string): Promise<boolean> {
    const recentAttempts = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM login_attempts
        WHERE (username = ? OR ip_address = ?)
        AND attempted_at > ?
        AND success = FALSE
      `)
      .bind(
        username,
        ip,
        Math.floor(Date.now() / 1000) - (AUTH_CONFIG.LOGIN_LOCKOUT_DURATION / 1000)
      )
      .first<{ count: number }>();

    return (recentAttempts?.count || 0) >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS;
  }

  private async logLoginAttempt(username: string, ip: string, success: boolean): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)'
      )
      .bind(username, ip, success)
      .run();
  }

  private async logAudit(userId: number | null, action: string, details?: any): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)'
      )
      .bind(userId, action, details ? JSON.stringify(details) : null)
      .run();
  }
}