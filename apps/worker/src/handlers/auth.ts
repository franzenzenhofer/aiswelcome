import { Context } from 'hono';
import type { Bindings } from '../types.js';
import { createUserSchema, loginSchema } from '@aiswelcome/shared';
import { ValidationError, AuthenticationError } from '@aiswelcome/logging';
import { hashPassword, verifyPassword, generateToken } from '@aiswelcome/shared';

export async function signupHandler(c: Context<{ Bindings: Bindings }>) {
  const logger = c.get('logger');
  
  try {
    const body = await c.req.json();
    const data = createUserSchema.parse(body);
    
    // Check if user exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(data.username, data.email).first();
    
    if (existing) {
      throw new ValidationError('Username or email already exists');
    }
    
    // Hash password
    const passwordHash = await hashPassword(data.password);
    
    // Create user
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id, username, email, created_at'
    ).bind(data.username, data.email, passwordHash).first();
    
    if (!result) {
      throw new Error('Failed to create user');
    }
    
    // Create session
    const sessionId = generateToken();
    await c.env.SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify({
        user_id: result.id,
        created_at: new Date().toISOString(),
      }),
      { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
    );
    
    // Set cookie
    c.cookie('session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60,
    });
    
    return c.json({
      ok: true,
      data: {
        id: result.id,
        username: result.username,
        email: result.email,
        created_at: result.created_at,
      },
    });
    
  } catch (error) {
    logger.error(error as Error);
    throw error;
  }
}

export async function loginHandler(c: Context<{ Bindings: Bindings }>) {
  const logger = c.get('logger');
  
  try {
    const body = await c.req.json();
    const data = loginSchema.parse(body);
    
    // Find user
    const whereClause = data.email 
      ? 'email = ?' 
      : 'username = ?';
    const whereValue = data.email || data.username;
    
    const user = await c.env.DB.prepare(
      `SELECT id, username, email, password_hash, banned, shadow_banned FROM users WHERE ${whereClause}`
    ).bind(whereValue).first();
    
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }
    
    // Check password
    const valid = await verifyPassword(data.password, user.password_hash as string);
    if (!valid) {
      throw new AuthenticationError('Invalid credentials');
    }
    
    // Check if banned
    if (user.banned) {
      throw new AuthenticationError('Account is banned');
    }
    
    // Create session
    const sessionId = generateToken();
    await c.env.SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify({
        user_id: user.id,
        created_at: new Date().toISOString(),
      }),
      { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
    );
    
    // Set cookie
    c.cookie('session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60,
    });
    
    return c.json({
      ok: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
    
  } catch (error) {
    logger.error(error as Error);
    throw error;
  }
}