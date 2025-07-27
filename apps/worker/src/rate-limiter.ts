export interface RateLimitConfig {
  posts_per_day: number;
  comments_per_minute: number;
  votes_per_minute: number;
  flags_per_day: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export class RateLimiter implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/check":
        return this.handleCheck(request);
      case "/consume":
        return this.handleConsume(request);
      case "/reset":
        return this.handleReset(request);
      default:
        return new Response("Not Found", { status: 404 });
    }
  }

  private async handleCheck(request: Request): Promise<Response> {
    const { key, action } = (await request.json()) as {
      key: string;
      action: string;
    };
    const bucketKey = `${key}:${action}`;
    const bucket = await this.getBucket(bucketKey);
    const limit = this.getLimit(action);

    return Response.json({
      allowed: bucket.count < limit,
      remaining: Math.max(0, limit - bucket.count),
      reset_seconds: Math.max(
        0,
        Math.floor((bucket.resetAt - Date.now()) / 1000),
      ),
    });
  }

  private async handleConsume(request: Request): Promise<Response> {
    const { key, action } = (await request.json()) as {
      key: string;
      action: string;
    };
    const bucketKey = `${key}:${action}`;
    const bucket = await this.getBucket(bucketKey);
    const limit = this.getLimit(action);

    if (bucket.count >= limit) {
      return Response.json(
        {
          allowed: false,
          remaining: 0,
          reset_seconds: Math.max(
            0,
            Math.floor((bucket.resetAt - Date.now()) / 1000),
          ),
        },
        { status: 429 },
      );
    }

    bucket.count++;
    await this.state.storage.put(bucketKey, bucket);

    return Response.json({
      allowed: true,
      remaining: Math.max(0, limit - bucket.count),
      reset_seconds: Math.max(
        0,
        Math.floor((bucket.resetAt - Date.now()) / 1000),
      ),
    });
  }

  private async handleReset(request: Request): Promise<Response> {
    const { key, action } = (await request.json()) as {
      key: string;
      action?: string;
    };

    if (action) {
      await this.state.storage.delete(`${key}:${action}`);
    } else {
      // Reset all actions for this key
      const keys = await this.state.storage.list({ prefix: `${key}:` });
      await this.state.storage.delete(Array.from(keys.keys()));
    }

    return Response.json({ ok: true });
  }

  private async getBucket(key: string): Promise<RateLimitBucket> {
    const stored = await this.state.storage.get<RateLimitBucket>(key);

    if (stored && stored.resetAt > Date.now()) {
      return stored;
    }

    // Create new bucket
    const bucket: RateLimitBucket = {
      count: 0,
      resetAt: this.getResetTime(key.split(":")[1] || "post"),
    };

    await this.state.storage.put(key, bucket);
    return bucket;
  }

  private getLimit(action: string): number {
    const limits: Record<string, number> = {
      post: 10, // per day
      comment: 5, // per minute
      vote: 30, // per minute
      flag: 5, // per day
    };

    return limits[action] || 10;
  }

  private getResetTime(action: string): number {
    const now = Date.now();

    switch (action) {
      case "post":
      case "flag": {
        // Reset at midnight UTC
        const tomorrow = new Date(now);
        tomorrow.setUTCHours(24, 0, 0, 0);
        return tomorrow.getTime();
      }

      case "comment":
      case "vote":
        // Reset after 1 minute
        return now + 60 * 1000;

      default:
        // Default to 1 hour
        return now + 60 * 60 * 1000;
    }
  }
}
