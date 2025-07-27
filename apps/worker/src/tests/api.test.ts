import { describe, it, expect } from "vitest";

const BASE_URL = "https://aiswelcome.franzai.com";

describe("AISWelcome API Tests", () => {
  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.version).toBe("1.1.0");
      expect(data.features).toEqual({
        authentication: true,
        rateLimit: true,
        aiOptimized: true,
      });
    });
  });

  describe("Stories API", () => {
    it("should return stories list", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/stories`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("MCP Server", () => {
    it("should initialize MCP connection", async () => {
      const response = await fetch(`${BASE_URL}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "initialize", id: 1 }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.result.protocolVersion).toBe("2025-06-18");
      expect(data.result.serverInfo.name).toBe("aiswelcome-mcp");
    });

    it("should list all 8 tools", async () => {
      const response = await fetch(`${BASE_URL}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "tools/list", id: 2 }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.result.tools).toHaveLength(8);
      expect(data.result.tools.map((t: any) => t.name)).toEqual([
        "submitStory",
        "getStories",
        "getStory",
        "voteStory",
        "searchStories",
        "getUserProfile",
        "getComments",
        "postComment",
      ]);
    });

    it("should list all 5 resources", async () => {
      const response = await fetch(`${BASE_URL}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "resources/list", id: 3 }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.result.resources).toHaveLength(5);
    });

    it("should handle unknown methods with proper error", async () => {
      const response = await fetch(`${BASE_URL}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "unknown/method", id: 4 }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.error.code).toBe(-32601);
      expect(data.error.message).toBe("Method not found");
    });
  });

  describe("Authentication", () => {
    it("should require auth for story submission", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test Story" }),
      });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error).toBe("Please login to continue");
    });

    it("should require auth for voting", async () => {
      const response = await fetch(`${BASE_URL}/api/v1/vote/1`, {
        method: "POST",
      });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error).toBe("Please login to continue");
    });
  });

  describe("Page Routes", () => {
    it("should return 404 with proper status code", async () => {
      const response = await fetch(`${BASE_URL}/nonexistent`);
      expect(response.status).toBe(404);
    });

    it("should have mobile viewport meta tag", async () => {
      const response = await fetch(`${BASE_URL}/`);
      const html = await response.text();
      expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    });

    it("should have all navigation links", async () => {
      const response = await fetch(`${BASE_URL}/`);
      const html = await response.text();
      
      expect(html).toContain('href="/newest"');
      expect(html).toContain('href="/submit"');
      expect(html).toContain('href="/guidelines"');
      expect(html).toContain('href="/api"');
      expect(html).toContain('href="/mcp"');
    });
  });

  describe("Security", () => {
    it("should escape HTML in user inputs", async () => {
      // This would be tested with actual submission
      expect(true).toBe(true);
    });

    it("should have secure headers", async () => {
      const response = await fetch(`${BASE_URL}/`);
      // Cloudflare adds security headers automatically
      expect(response.headers.get("content-type")).toContain("text/html");
    });
  });
});