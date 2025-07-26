import { Context } from 'hono';
import type { Bindings } from '../types.js';
import { submitStorySchema } from '@aiswelcome/shared';
import { ValidationError, AuthenticationError } from '@aiswelcome/logging';
import { hashUrl } from '@aiswelcome/shared';

export async function submitHandler(c: Context<{ Bindings: Bindings }>) {
  const logger = c.get('logger');
  
  try {
    // Check authentication
    const sessionId = c.req.cookie('session');
    if (!sessionId) {
      throw new AuthenticationError('Login required to submit');
    }
    
    const sessionData = await c.env.SESSIONS.get(`session:${sessionId}`);
    if (!sessionData) {
      throw new AuthenticationError('Invalid session');
    }
    
    const session = JSON.parse(sessionData);
    const userId = session.user_id;
    
    // Parse and validate input
    const body = await c.req.json();
    const data = submitStorySchema.parse(body);
    
    // Check for duplicate URL
    if (data.url) {
      const urlHash = hashUrl(data.url);
      const existing = await c.env.DB.prepare(
        'SELECT id, title FROM stories WHERE url_hash = ? AND dead = 0'
      ).bind(urlHash).first();
      
      if (existing) {
        throw new ValidationError(
          `URL already submitted`,
          { existing_id: existing.id, existing_title: existing.title }
        );
      }
    }
    
    // Insert story
    const result = await c.env.DB.prepare(
      `INSERT INTO stories (user_id, title, url, url_hash, text, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       RETURNING id, title, url, text, created_at, points`
    ).bind(
      userId,
      data.title,
      data.url || null,
      data.url ? hashUrl(data.url) : null,
      data.text || null
    ).first();
    
    if (!result) {
      throw new Error('Failed to create story');
    }
    
    // Invalidate cache
    await c.env.CACHE.delete('frontpage:ids');
    
    logger.info('Story submitted', { story_id: result.id, user_id: userId });
    
    return c.json({
      ok: true,
      data: {
        id: result.id,
        title: result.title,
        url: result.url,
        text: result.text,
        created_at: result.created_at,
        points: result.points,
      },
    });
    
  } catch (error) {
    logger.error(error as Error);
    throw error;
  }
}