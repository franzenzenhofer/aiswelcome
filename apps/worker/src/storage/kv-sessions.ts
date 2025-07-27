/**
 * KV-based session storage for Cloudflare Workers
 * Uses Cloudflare KV for distributed session management
 */

interface Session {
  id: string;
  user_id: number;
  username: string;
  created_at: number;
  expires_at: number;
  ip_address: string;
  user_agent: string;
}

export class KVSessionStorage {
  constructor(private kv: KVNamespace) {}

  /**
   * Create a new session
   */
  async createSession(session: Session): Promise<void> {
    const ttl = session.expires_at - Math.floor(Date.now() / 1000);
    
    // Store session with automatic expiration
    await this.kv.put(
      `session:${session.id}`,
      JSON.stringify(session),
      { expirationTtl: ttl }
    );

    // Also store user -> sessions mapping
    const userSessionsKey = `user_sessions:${session.user_id}`;
    const existingSessions = await this.getUserSessions(session.user_id);
    existingSessions.push(session.id);
    
    await this.kv.put(
      userSessionsKey,
      JSON.stringify(existingSessions),
      { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
    );
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const data = await this.kv.get(`session:${sessionId}`);
    if (!data) return null;

    const session = JSON.parse(data) as Session;
    
    // Check if expired
    if (session.expires_at < Math.floor(Date.now() / 1000)) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Get session to find user ID
    const session = await this.getSession(sessionId);
    if (session) {
      // Remove from user's session list
      const userSessions = await this.getUserSessions(session.user_id);
      const filtered = userSessions.filter(id => id !== sessionId);
      await this.kv.put(
        `user_sessions:${session.user_id}`,
        JSON.stringify(filtered),
        { expirationTtl: 60 * 60 * 24 * 30 }
      );
    }

    // Delete the session
    await this.kv.delete(`session:${sessionId}`);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: number): Promise<string[]> {
    const data = await this.kv.get(`user_sessions:${userId}`);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Clean up expired sessions for a user
   */
  async cleanupUserSessions(userId: number): Promise<void> {
    const sessionIds = await this.getUserSessions(userId);
    const validSessions: string[] = [];
    
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        validSessions.push(sessionId);
      }
    }

    if (validSessions.length !== sessionIds.length) {
      await this.kv.put(
        `user_sessions:${userId}`,
        JSON.stringify(validSessions),
        { expirationTtl: 60 * 60 * 24 * 30 }
      );
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: number): Promise<void> {
    const sessionIds = await this.getUserSessions(userId);
    
    // Delete all sessions
    await Promise.all(
      sessionIds.map(sessionId => this.kv.delete(`session:${sessionId}`))
    );

    // Clear user's session list
    await this.kv.delete(`user_sessions:${userId}`);
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
  }> {
    // KV doesn't support listing all keys efficiently
    // This would need to be tracked separately
    return {
      totalSessions: 0,
      activeSessions: 0
    };
  }
}