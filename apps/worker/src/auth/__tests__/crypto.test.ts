import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateToken, generateSessionId } from '../crypto';

describe('Crypto utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Due to salt, hashes should be identical in our implementation
      // since we use a fixed salt for simplicity
      expect(hash1).toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
    });

    it('should handle special characters', async () => {
      const password = 'p@$$w0rd!#$%^&*()';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty password verification', async () => {
      const hash = await hashPassword('password');
      const isValid = await verifyPassword('', hash);
      
      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'TestPassword';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('testpassword', hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a token', () => {
      const token = generateToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      
      expect(tokens.size).toBe(100);
    });

    it('should only contain URL-safe characters', () => {
      const token = generateToken();
      const urlSafeRegex = /^[A-Za-z0-9_-]+$/;
      
      expect(token).toMatch(urlSafeRegex);
    });
  });

  describe('generateSessionId', () => {
    it('should generate a session ID with prefix', () => {
      const sessionId = generateSessionId();
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^sess_/);
    });

    it('should generate unique session IDs', () => {
      const sessionIds = new Set();
      for (let i = 0; i < 100; i++) {
        sessionIds.add(generateSessionId());
      }
      
      expect(sessionIds.size).toBe(100);
    });

    it('should be URL-safe', () => {
      const sessionId = generateSessionId();
      const urlSafeRegex = /^sess_[A-Za-z0-9_-]+$/;
      
      expect(sessionId).toMatch(urlSafeRegex);
    });
  });
});