interface RateLimits {
  stories: number;
  comments: number;
}

export class RateLimiter {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response("Missing userId", { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const key = `limits:${today}`;

    // Get or initialize today's counts
    const limits = (await this.state.storage.get<RateLimits>(key)) || {
      stories: 0,
      comments: 0,
    };

    // Handle different request types
    const path = url.pathname;

    if (path === "/check") {
      const type = url.searchParams.get("type") as "story" | "comment";
      const remaining =
        type === "story" ? 50 - limits.stories : 200 - limits.comments;

      return new Response(
        JSON.stringify({
          allowed: remaining > 0,
          remaining,
          limit: type === "story" ? 50 : 200,
          used: type === "story" ? limits.stories : limits.comments,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (path === "/increment") {
      const type = url.searchParams.get("type") as "story" | "comment";

      if (type === "story") {
        if (limits.stories >= 50) {
          return new Response(
            JSON.stringify({
              allowed: false,
              error: "Daily story limit reached",
            }),
            {
              status: 429,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        limits.stories++;
      } else if (type === "comment") {
        if (limits.comments >= 200) {
          return new Response(
            JSON.stringify({
              allowed: false,
              error: "Daily comment limit reached",
            }),
            {
              status: 429,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        limits.comments++;
      }

      // Save updated limits
      await this.state.storage.put(key, limits);

      return new Response(
        JSON.stringify({
          allowed: true,
          remaining:
            type === "story" ? 50 - limits.stories : 200 - limits.comments,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (path === "/reset") {
      // Admin-only endpoint to reset limits
      await this.state.storage.delete(key);
      return new Response("Reset successful", { status: 200 });
    }

    if (path === "/stats") {
      // Get all stored data for analytics
      const allData = await this.state.storage.list();
      const stats: any = {};

      for (const [k, v] of allData) {
        stats[k] = v;
      }

      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }
}
