import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Forbidden usernames - can't be used for registration
export const FORBIDDEN_USERNAMES = [
  'admin', 'administrator', 'root', 'system', 'mod', 'moderator',
  'staff', 'support', 'help', 'api', 'bot', 'aiswelcome', 'hn',
  'hackernews', 'news', 'submit', 'login', 'register', 'user',
  'users', 'profile', 'settings', 'account', 'password', 'email',
  'delete', 'edit', 'update', 'create', 'new', 'old', 'test',
  'demo', 'example', 'sample', 'null', 'undefined', 'void',
  'true', 'false', 'anonymous', 'guest', 'public', 'private',
  // Offensive words
  'fuck', 'shit', 'ass', 'damn', 'hell', 'bitch', 'bastard',
  'dick', 'cock', 'pussy', 'cunt', 'nigger', 'faggot', 'retard',
  'nazi', 'hitler', 'rape', 'kill', 'murder', 'suicide', 'porn',
  'sex', 'xxx', 'drug', 'cocaine', 'heroin', 'meth'
];

// Password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 15;
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  email?: string;
  createdAt: string;
  karma: number;
  about?: string;
  isAdmin: boolean;
  isBanned: boolean;
  showDead: boolean;
  noprocrast: number; // minutes of procrastination setting
  maxvisit: number; // max visit length in minutes
  minaway: number; // min time away in minutes
  delay: number; // comment delay in minutes
}

export interface Session {
  userId: string;
  username: string;
  isAdmin: boolean;
  exp: number;
}

export interface AuthConfig {
  jwtSecret: string;
  saltRounds: number;
}

export class AuthService {
  constructor(private config: AuthConfig) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(user: Omit<User, 'passwordHash'>): string {
    const payload: Session = {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    return jwt.sign(payload, this.config.jwtSecret);
  }

  verifyToken(token: string): Session | null {
    try {
      return jwt.verify(token, this.config.jwtSecret) as Session;
    } catch {
      return null;
    }
  }

  validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || username.length < USERNAME_MIN_LENGTH) {
      return { valid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
    }
    
    if (username.length > USERNAME_MAX_LENGTH) {
      return { valid: false, error: `Username must be at most ${USERNAME_MAX_LENGTH} characters` };
    }
    
    if (!USERNAME_REGEX.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }
    
    const usernameLower = username.toLowerCase();
    if (FORBIDDEN_USERNAMES.includes(usernameLower)) {
      return { valid: false, error: 'This username is not allowed' };
    }
    
    return { valid: true };
  }

  validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
    }
    
    return { valid: true };
  }
}

// Rate limiting utilities
export interface RateLimitEntry {
  userId: string;
  date: string; // YYYY-MM-DD
  storyCount: number;
  commentCount: number;
}

export class RateLimiter {
  constructor(
    private maxStoriesPerDay: number,
    private maxCommentsPerDay: number
  ) {}

  canSubmitStory(entry: RateLimitEntry | null): boolean {
    if (!entry) return true;
    return entry.storyCount < this.maxStoriesPerDay;
  }

  canSubmitComment(entry: RateLimitEntry | null): boolean {
    if (!entry) return true;
    return entry.commentCount < this.maxCommentsPerDay;
  }

  getRemainingStories(entry: RateLimitEntry | null): number {
    if (!entry) return this.maxStoriesPerDay;
    return Math.max(0, this.maxStoriesPerDay - entry.storyCount);
  }

  getRemainingComments(entry: RateLimitEntry | null): number {
    if (!entry) return this.maxCommentsPerDay;
    return Math.max(0, this.maxCommentsPerDay - entry.commentCount);
  }
}