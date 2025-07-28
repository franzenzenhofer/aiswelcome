// In-memory storage implementation that works like a real database

interface User {
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

interface Session {
  id: string;
  user_id: number;
  created_at: number;
  expires_at: number;
  ip_address: string;
  user_agent: string;
}

interface Story {
  id: number;
  user_id: number;
  title: string;
  url?: string;
  text?: string;
  points: number;
  created_at: number;
  domain?: string;
}

interface Comment {
  id: number;
  user_id: number;
  story_id: number;
  parent_id?: number;
  text: string;
  points: number;
  created_at: number;
}

interface Vote {
  user_id: number;
  item_id: number;
  item_type: "story" | "comment";
  created_at: number;
}

interface RateLimit {
  user_id: number;
  date: string;
  story_count: number;
  comment_count: number;
}

export class InMemoryStorage {
  private users = new Map<number, User>();
  private usersByUsername = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private stories = new Map<number, Story>();
  private comments = new Map<number, Comment>();
  private votes = new Map<string, Vote>();
  private rateLimits = new Map<string, RateLimit>();

  private userIdCounter = 1;
  private storyIdCounter = 1;
  private commentIdCounter = 1;

  generateId(): number {
    return this.storyIdCounter++;
  }

  constructor() {
    // Initialize with admin user
    this.createUser({
      username: "franz",
      password_hash: "WQquOh1C0VU+k6qFjKgvuPtEH7dQyPu8KqzUgV8S5t0=",
      email: "franz@aiswelcome.com",
      is_admin: true,
      karma: 9999,
    });
  }

  // User methods
  async createUser(data: {
    username: string;
    password_hash: string;
    email?: string;
    is_admin?: boolean;
    karma?: number;
  }): Promise<User> {
    const user: User = {
      id: this.userIdCounter++,
      username: data.username,
      password_hash: data.password_hash,
      email: data.email,
      created_at: Math.floor(Date.now() / 1000),
      karma: data.karma || 0,
      is_admin: data.is_admin || false,
      is_banned: false,
      is_shadowbanned: false,
    };

    this.users.set(user.id, user);
    this.usersByUsername.set(user.username.toLowerCase(), user);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.usersByUsername.get(username.toLowerCase()) || null;
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async updateUserKarma(userId: number, delta: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.karma += delta;
    }
  }

  // Session methods
  async createSession(data: {
    id: string;
    user_id: number;
    expires_at: number;
    ip_address: string;
    user_agent: string;
  }): Promise<Session> {
    const session: Session = {
      ...data,
      created_at: Math.floor(Date.now() / 1000),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);
    if (!session) return null;

    // Check if expired
    if (session.expires_at < Math.floor(Date.now() / 1000)) {
      this.sessions.delete(id);
      return null;
    }

    return session;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  // Story methods
  async createStory(data: {
    user_id: number;
    title: string;
    url?: string;
    text?: string;
    domain?: string;
  }): Promise<Story> {
    const story: Story = {
      id: this.storyIdCounter++,
      ...data,
      points: 1,
      created_at: Math.floor(Date.now() / 1000),
    };

    this.stories.set(story.id, story);

    // Auto-upvote by creator
    await this.createVote({
      user_id: data.user_id,
      item_id: story.id,
      item_type: "story",
    });

    return story;
  }

  async getStory(id: number): Promise<Story | null> {
    return this.stories.get(id) || null;
  }

  async getStories(
    options: {
      limit?: number;
      offset?: number;
      sort?: "top" | "new" | "best";
    } = {},
  ): Promise<Story[]> {
    const { limit = 30, offset = 0, sort = "top" } = options;
    const stories = Array.from(this.stories.values());

    // Sort stories
    if (sort === "new") {
      stories.sort((a, b) => b.created_at - a.created_at);
    } else if (sort === "top" || sort === "best") {
      stories.sort((a, b) => {
        // Simple HN ranking algorithm
        const timeA = (Date.now() / 1000 - a.created_at) / 3600;
        const timeB = (Date.now() / 1000 - b.created_at) / 3600;
        const scoreA = (a.points - 1) / Math.pow(timeA + 2, 1.8);
        const scoreB = (b.points - 1) / Math.pow(timeB + 2, 1.8);
        return scoreB - scoreA;
      });
    }

    return stories.slice(offset, offset + limit);
  }

  // Comment methods
  async createComment(data: {
    user_id: number;
    story_id: number;
    parent_id?: number;
    text: string;
  }): Promise<Comment> {
    const comment: Comment = {
      id: this.commentIdCounter++,
      ...data,
      points: 1,
      created_at: Math.floor(Date.now() / 1000),
    };

    this.comments.set(comment.id, comment);

    // Auto-upvote by creator
    await this.createVote({
      user_id: data.user_id,
      item_id: comment.id,
      item_type: "comment",
    });

    return comment;
  }

  async getCommentsByStory(storyId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter((c) => c.story_id === storyId)
      .sort((a, b) => b.points - a.points);
  }

  // Vote methods
  async createVote(data: {
    user_id: number;
    item_id: number;
    item_type: "story" | "comment";
  }): Promise<Vote | null> {
    const key = `${data.user_id}-${data.item_type}-${data.item_id}`;

    // Check if already voted
    if (this.votes.has(key)) {
      return null;
    }

    const vote: Vote = {
      ...data,
      created_at: Math.floor(Date.now() / 1000),
    };

    this.votes.set(key, vote);

    // Update points
    if (data.item_type === "story") {
      const story = this.stories.get(data.item_id);
      if (story) {
        story.points++;
        // Award karma to story author
        await this.updateUserKarma(story.user_id, 1);
      }
    } else {
      const comment = this.comments.get(data.item_id);
      if (comment) {
        comment.points++;
        // Award karma to comment author
        await this.updateUserKarma(comment.user_id, 1);
      }
    }

    return vote;
  }

  async hasVoted(
    userId: number,
    itemId: number,
    itemType: "story" | "comment",
  ): Promise<boolean> {
    const key = `${userId}-${itemType}-${itemId}`;
    return this.votes.has(key);
  }

  // Rate limiting
  async getRateLimitByDate(userId: number, date: string): Promise<RateLimit | null> {
    return this.getRateLimit(userId, date);
  }

  async getRateLimit(userId: number, date: string): Promise<RateLimit | null> {
    const key = `${userId}-${date}`;
    return this.rateLimits.get(key) || null;
  }

  async updateRateLimitByDate(
    userId: number,
    date: string,
    type: "story" | "comment",
  ): Promise<void> {
    await this.updateRateLimit(userId, date, type);
  }

  async updateRateLimit(
    userId: number,
    date: string,
    type: "story" | "comment",
  ): Promise<RateLimit> {
    const key = `${userId}-${date}`;
    let limit = this.rateLimits.get(key);

    if (!limit) {
      limit = {
        user_id: userId,
        date,
        story_count: 0,
        comment_count: 0,
      };
    }

    if (type === "story") {
      limit.story_count++;
    } else {
      limit.comment_count++;
    }

    this.rateLimits.set(key, limit);
    return limit;
  }
}

// Global singleton instance
export const storage = new InMemoryStorage();
