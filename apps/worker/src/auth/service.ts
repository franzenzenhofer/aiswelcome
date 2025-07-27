import { hashPassword, verifyPassword, generateSessionId } from "./crypto";
import { AUTH_CONFIG, FORBIDDEN_USERNAMES, AUTH_ERRORS } from "./constants";
import { storage } from "../storage/inmemory";
import { KVSessionStorage } from "../storage/kv-sessions";

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
  private kvSessions?: KVSessionStorage;

  constructor(env?: { SESSIONS?: KVNamespace }) {
    if (env?.SESSIONS) {
      this.kvSessions = new KVSessionStorage(env.SESSIONS);
    }
  }
  async register(
    username: string,
    password: string,
    email?: string,
  ): Promise<User> {
    // Validate username
    const usernameValidation = this.validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.error || "Invalid username");
    }

    // Validate password
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error || "Invalid password");
    }

    // Check if username exists
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      throw new Error(AUTH_ERRORS.USERNAME_TAKEN);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await storage.createUser({
      username,
      password_hash: passwordHash,
      email,
    });

    return user;
  }

  async login(
    username: string,
    password: string,
    request: Request,
  ): Promise<Session> {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";

    // Get user
    const user = await storage.getUserByUsername(username);
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

    // Create session
    const session = await this.createSession(user, ip, userAgent);
    return session;
  }

  async logout(sessionId: string): Promise<void> {
    if (this.kvSessions) {
      await this.kvSessions.deleteSession(sessionId);
    } else {
      await storage.deleteSession(sessionId);
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    let sessionData;
    
    if (this.kvSessions) {
      const kvSession = await this.kvSessions.getSession(sessionId);
      if (!kvSession) return null;
      
      const user = await storage.getUserById(kvSession.user_id);
      if (!user) return null;

      return {
        id: kvSession.id,
        user_id: kvSession.user_id,
        username: user.username,
        is_admin: user.is_admin,
        expires_at: kvSession.expires_at,
      };
    } else {
      sessionData = await storage.getSession(sessionId);
      if (!sessionData) return null;

      const user = await storage.getUserById(sessionData.user_id);
      if (!user) return null;

      return {
        id: sessionData.id,
        user_id: sessionData.user_id,
        username: user.username,
        is_admin: user.is_admin,
        expires_at: sessionData.expires_at,
      };
    }
  }

  async getUserById(id: number): Promise<User | null> {
    return storage.getUserById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return storage.getUserByUsername(username);
  }

  async updateKarma(userId: number, delta: number): Promise<void> {
    await storage.updateUserKarma(userId, delta);
  }

  async checkRateLimit(
    userId: number,
    type: "story" | "comment",
  ): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0]!;
    const limit = await storage.getRateLimit(userId, today);

    if (!limit) return true; // First action of the day

    if (
      type === "story" &&
      limit.story_count >= AUTH_CONFIG.MAX_STORIES_PER_DAY
    ) {
      return false;
    }

    if (
      type === "comment" &&
      limit.comment_count >= AUTH_CONFIG.MAX_COMMENTS_PER_DAY
    ) {
      return false;
    }

    return true;
  }

  async incrementRateLimit(
    userId: number,
    type: "story" | "comment",
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0]!;
    await storage.updateRateLimit(userId, today, type);
  }

  private async createSession(
    user: User,
    ip: string,
    userAgent: string,
  ): Promise<Session> {
    const sessionId = generateSessionId();
    const expiresAt =
      Math.floor(Date.now() / 1000) + AUTH_CONFIG.SESSION_DURATION / 1000;
    const createdAt = Math.floor(Date.now() / 1000);

    const sessionData = {
      id: sessionId,
      user_id: user.id,
      username: user.username,
      created_at: createdAt,
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: userAgent,
    };

    if (this.kvSessions) {
      await this.kvSessions.createSession(sessionData);
    } else {
      await storage.createSession({
        id: sessionId,
        user_id: user.id,
        expires_at: expiresAt,
        ip_address: ip,
        user_agent: userAgent,
      });
    }

    return {
      id: sessionId,
      user_id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      expires_at: expiresAt,
    };
  }

  private validateUsername(username: string): {
    valid: boolean;
    error?: string;
  } {
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

  private validatePassword(password: string): {
    valid: boolean;
    error?: string;
  } {
    if (!password || password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
      return { valid: false, error: AUTH_ERRORS.PASSWORD_TOO_SHORT };
    }

    return { valid: true };
  }
}
