import { describe, it, expect } from 'vitest';
import { AUTH_CONFIG, FORBIDDEN_USERNAMES, AUTH_ERRORS } from '../constants';

describe('Authentication constants', () => {
  describe('AUTH_CONFIG', () => {
    it('should have valid session duration', () => {
      expect(AUTH_CONFIG.SESSION_DURATION).toBe(7 * 24 * 60 * 60 * 1000);
      expect(AUTH_CONFIG.SESSION_DURATION).toBeGreaterThan(0);
    });

    it('should have reasonable password requirements', () => {
      expect(AUTH_CONFIG.MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
    });

    it('should have valid username constraints', () => {
      expect(AUTH_CONFIG.MIN_USERNAME_LENGTH).toBeGreaterThan(0);
      expect(AUTH_CONFIG.MAX_USERNAME_LENGTH).toBeGreaterThan(AUTH_CONFIG.MIN_USERNAME_LENGTH);
      expect(AUTH_CONFIG.USERNAME_REGEX).toBeInstanceOf(RegExp);
    });

    it('should have rate limits configured', () => {
      expect(AUTH_CONFIG.MAX_STORIES_PER_DAY).toBe(50);
      expect(AUTH_CONFIG.MAX_COMMENTS_PER_DAY).toBe(200);
      expect(AUTH_CONFIG.MAX_LOGIN_ATTEMPTS).toBeGreaterThan(0);
      expect(AUTH_CONFIG.LOGIN_LOCKOUT_DURATION).toBeGreaterThan(0);
    });

    it('should have admin credentials', () => {
      expect(AUTH_CONFIG.ADMIN_USERNAME).toBe('franz');
      expect(AUTH_CONFIG.ADMIN_PASSWORD_HASH).toBeDefined();
      expect(AUTH_CONFIG.ADMIN_PASSWORD_HASH.length).toBeGreaterThan(20);
    });

    it('should test username regex correctly', () => {
      const validUsernames = ['user123', 'test_user', 'user-name', 'User_123'];
      const invalidUsernames = ['user name', 'user@123', 'user.name', ''];

      validUsernames.forEach(username => {
        expect(AUTH_CONFIG.USERNAME_REGEX.test(username)).toBe(true);
      });

      invalidUsernames.forEach(username => {
        expect(AUTH_CONFIG.USERNAME_REGEX.test(username)).toBe(false);
      });
    });
  });

  describe('FORBIDDEN_USERNAMES', () => {
    it('should be a Set', () => {
      expect(FORBIDDEN_USERNAMES).toBeInstanceOf(Set);
    });

    it('should contain system reserved words', () => {
      const systemWords = ['admin', 'root', 'system', 'api', 'bot'];
      systemWords.forEach(word => {
        expect(FORBIDDEN_USERNAMES.has(word)).toBe(true);
      });
    });

    it('should contain route names', () => {
      const routes = ['login', 'register', 'logout', 'submit', 'user'];
      routes.forEach(route => {
        expect(FORBIDDEN_USERNAMES.has(route)).toBe(true);
      });
    });

    it('should contain offensive words', () => {
      // Just check that some are included without listing them all
      expect(FORBIDDEN_USERNAMES.size).toBeGreaterThan(100);
    });

    it('should be case-insensitive in practice', () => {
      // The set contains lowercase, implementation should check lowercase
      expect(FORBIDDEN_USERNAMES.has('admin')).toBe(true);
      expect(FORBIDDEN_USERNAMES.has('ADMIN')).toBe(false); // Set itself is case-sensitive
    });

    it('should block variations of admin', () => {
      const adminVariations = ['admin1', 'admin2'];
      adminVariations.forEach(variation => {
        expect(FORBIDDEN_USERNAMES.has(variation)).toBe(true);
      });
    });
  });

  describe('AUTH_ERRORS', () => {
    it('should have all necessary error messages', () => {
      const requiredErrors = [
        'INVALID_CREDENTIALS',
        'USERNAME_TAKEN',
        'USERNAME_FORBIDDEN',
        'USERNAME_INVALID',
        'USERNAME_TOO_SHORT',
        'USERNAME_TOO_LONG',
        'PASSWORD_TOO_SHORT',
        'SESSION_EXPIRED',
        'RATE_LIMIT_EXCEEDED',
        'ACCOUNT_LOCKED',
        'ACCOUNT_BANNED',
        'NOT_AUTHENTICATED',
        'NOT_AUTHORIZED',
        'STORY_LIMIT_REACHED',
        'COMMENT_LIMIT_REACHED'
      ];

      requiredErrors.forEach(errorKey => {
        expect(AUTH_ERRORS[errorKey]).toBeDefined();
        expect(typeof AUTH_ERRORS[errorKey]).toBe('string');
        expect(AUTH_ERRORS[errorKey].length).toBeGreaterThan(0);
      });
    });

    it('should have user-friendly error messages', () => {
      expect(AUTH_ERRORS.INVALID_CREDENTIALS).not.toContain('SQL');
      expect(AUTH_ERRORS.INVALID_CREDENTIALS).not.toContain('undefined');
      expect(AUTH_ERRORS.USERNAME_TOO_SHORT).toContain(AUTH_CONFIG.MIN_USERNAME_LENGTH.toString());
      expect(AUTH_ERRORS.USERNAME_TOO_LONG).toContain(AUTH_CONFIG.MAX_USERNAME_LENGTH.toString());
      expect(AUTH_ERRORS.PASSWORD_TOO_SHORT).toContain(AUTH_CONFIG.MIN_PASSWORD_LENGTH.toString());
    });

    it('should have rate limit messages with numbers', () => {
      expect(AUTH_ERRORS.STORY_LIMIT_REACHED).toContain('50');
      expect(AUTH_ERRORS.COMMENT_LIMIT_REACHED).toContain('200');
    });
  });
});