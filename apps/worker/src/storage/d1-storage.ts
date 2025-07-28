import { D1Database } from "@cloudflare/workers-types";
import {
  User,
  Story,
  Comment,
  Vote,
  Session,
  RateLimit,
} from "../types";
// Removed singleton import - D1Storage is independent

export class D1Storage {
  constructor(private db: D1Database) {}

  // User operations
  async createUser(user: Omit<User, "id" | "created_at">): Promise<User> {
    const id = Math.floor(Math.random() * 1000000000);
    const createdAt = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO users (id, username, password_hash, email, karma, about, is_admin, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.username,
      user.password_hash,
      user.email || null,
      user.karma || 0,
      user.about || null,
      user.is_admin || false,
      createdAt
    ).run();

    return {
      id,
      ...user,
      karma: user.karma || 0,
      is_admin: user.is_admin || false,
      created_at: createdAt,
    };
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(id).first();
    
    return result as User | null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE username = ?
    `).bind(username).first();
    
    return result as User | null;
  }

  async updateUserKarma(userId: number, delta: number): Promise<void> {
    await this.db.prepare(`
      UPDATE users SET karma = karma + ? WHERE id = ?
    `).bind(delta, userId).run();
  }

  // Session operations
  async createSession(session: Session): Promise<void> {
    await this.db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      session.id,
      session.user_id,
      session.expires_at,
      session.ip_address || null,
      session.user_agent || null
    ).run();
  }

  async getSession(id: string): Promise<Session | null> {
    const result = await this.db.prepare(`
      SELECT * FROM sessions WHERE id = ? AND expires_at > ?
    `).bind(id, Math.floor(Date.now() / 1000)).first();
    
    return result as Session | null;
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.prepare(`
      DELETE FROM sessions WHERE id = ?
    `).bind(id).run();
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.db.prepare(`
      DELETE FROM sessions WHERE expires_at <= ?
    `).bind(Math.floor(Date.now() / 1000)).run();
  }

  // Story operations
  async createStory(story: Omit<Story, "id" | "created_at">): Promise<Story> {
    const id = Math.floor(Math.random() * 1000000000);
    const createdAt = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO stories (id, title, url, text, user_id, points, created_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      story.title,
      story.url || null,
      story.text || null,
      story.user_id,
      story.points || 1,
      createdAt,
      false
    ).run();

    return {
      id,
      ...story,
      points: story.points || 1,
      created_at: createdAt,
    };
  }

  async getStory(id: number): Promise<Story | null> {
    const result = await this.db.prepare(`
      SELECT s.*, u.username 
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.is_deleted = false
    `).bind(id).first();
    
    if (!result) return null;
    
    const story = result as any;
    return {
      ...story,
      username: story.username,
    };
  }

  async getStories(
    page: number = 1,
    limit: number = 30,
    type: "top" | "new" | "ask" | "show" = "top"
  ): Promise<Story[]> {
    const offset = (page - 1) * limit;
    let query = `
      SELECT s.*, u.username 
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_deleted = false
    `;

    if (type === "ask") {
      query += ` AND s.title LIKE 'Ask AI:%'`;
    } else if (type === "show") {
      query += ` AND s.title LIKE 'Show AI:%'`;
    }

    if (type === "top") {
      query += ` ORDER BY s.points DESC, s.created_at DESC`;
    } else {
      query += ` ORDER BY s.created_at DESC`;
    }

    query += ` LIMIT ? OFFSET ?`;

    const results = await this.db.prepare(query)
      .bind(limit, offset)
      .all();

    return results.results.map((row: any) => ({
      ...row,
      username: row.username,
    }));
  }

  async updateStoryPoints(storyId: number, delta: number): Promise<void> {
    await this.db.prepare(`
      UPDATE stories SET points = points + ? WHERE id = ?
    `).bind(delta, storyId).run();
  }

  async voteStory(storyId: number, userId: number): Promise<boolean> {
    // Check if already voted
    const existingVote = await this.getVote(userId, storyId, "story");
    if (existingVote) {
      return false; // Already voted
    }

    // Create vote record
    await this.createVote({
      user_id: userId,
      item_id: storyId,
      item_type: "story",
      vote_type: "up",
    });

    // Update story points
    await this.updateStoryPoints(storyId, 1);

    return true;
  }

  async searchStories(query: string): Promise<Story[]> {
    const results = await this.db.prepare(`
      SELECT s.*, u.username 
      FROM stories s
      JOIN users u ON s.user_id = u.id
      JOIN stories_fts ON stories_fts.rowid = s.id
      WHERE stories_fts MATCH ? AND s.is_deleted = false
      ORDER BY rank
      LIMIT 30
    `).bind(query).all();

    return results.results.map((row: any) => ({
      ...row,
      username: row.username,
    }));
  }

  // Comment operations
  async createComment(comment: Omit<Comment, "id" | "created_at">): Promise<Comment> {
    const id = Math.floor(Math.random() * 1000000000);
    const createdAt = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO comments (id, story_id, parent_id, user_id, text, points, created_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      comment.story_id,
      comment.parent_id || null,
      comment.user_id,
      comment.text,
      comment.points || 1,
      createdAt,
      false
    ).run();

    return {
      id,
      ...comment,
      points: comment.points || 1,
      created_at: createdAt,
    };
  }

  async getCommentsByStory(storyId: number): Promise<Comment[]> {
    const results = await this.db.prepare(`
      SELECT c.*, u.username 
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.story_id = ? AND c.is_deleted = false
      ORDER BY c.created_at ASC
    `).bind(storyId).all();

    return results.results.map((row: any) => ({
      ...row,
      username: row.username,
    }));
  }

  // Vote operations
  async createVote(vote: Vote): Promise<void> {
    await this.db.prepare(`
      INSERT INTO votes (user_id, item_id, item_type, vote_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      vote.user_id,
      vote.item_id,
      vote.item_type,
      vote.vote_type,
      Math.floor(Date.now() / 1000)
    ).run();
  }

  async getVote(userId: number, itemId: number, itemType: "story" | "comment"): Promise<Vote | null> {
    const result = await this.db.prepare(`
      SELECT * FROM votes 
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `).bind(userId, itemId, itemType).first();
    
    return result as Vote | null;
  }

  // Rate limiting
  async getRateLimit(userId: number, action: "story" | "comment"): Promise<RateLimit | null> {
    const result = await this.db.prepare(`
      SELECT * FROM rate_limits 
      WHERE user_id = ? AND action = ? AND date = ?
    `).bind(userId, action, new Date().toISOString().split('T')[0]).first();
    
    return result as RateLimit | null;
  }

  async updateRateLimit(userId: number, action: "story" | "comment"): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    
    await this.db.prepare(`
      INSERT INTO rate_limits (user_id, action, date, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id, action, date) 
      DO UPDATE SET count = count + 1
    `).bind(userId, action, date).run();
  }

  async canPerformAction(userId: number, action: "story" | "comment"): Promise<boolean> {
    const limit = action === "story" ? 50 : 200;
    const rateLimit = await this.getRateLimit(userId, action);
    
    if (!rateLimit || !rateLimit.count) return true;
    return rateLimit.count < limit;
  }

  // Admin operations
  async initializeAdminUser(): Promise<void> {
    const admin = await this.getUserByUsername('franz');
    if (!admin) {
      await this.createUser({
        username: 'franz',
        password_hash: 'admin-hash-placeholder',
        email: 'franzai@yahoo.com',
        karma: 1000,
        about: 'AISWelcome Admin',
        is_admin: true,
        is_banned: false,
        is_shadowbanned: false,
      });
    }
  }

  // Helper methods for compatibility
  generateId(): number {
    return Math.floor(Math.random() * 1000000000);
  }
  
  // Rate limit methods matching in-memory interface  
  async getRateLimitByDate(userId: number, date: string): Promise<{ stories: number; comments: number } | null> {
    const storyLimit = await this.db.prepare(`
      SELECT count FROM rate_limits 
      WHERE user_id = ? AND action = 'story' AND date = ?
    `).bind(userId, date).first() as any;
    
    const commentLimit = await this.db.prepare(`
      SELECT count FROM rate_limits 
      WHERE user_id = ? AND action = 'comment' AND date = ?
    `).bind(userId, date).first() as any;
    
    return {
      stories: storyLimit?.count || 0,
      comments: commentLimit?.count || 0,
    };
  }

  async updateRateLimitByDate(userId: number, date: string, type: "story" | "comment"): Promise<void> {
    await this.db.prepare(`
      INSERT INTO rate_limits (user_id, action, date, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id, action, date) 
      DO UPDATE SET count = count + 1
    `).bind(userId, type, date).run();
  }
}