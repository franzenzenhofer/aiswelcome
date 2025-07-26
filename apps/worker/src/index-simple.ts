export interface Env {
  // DB: D1Database;
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Basic routing
    if (url.pathname === '/') {
      return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>AISWelcome</title>
  <style>
    body { font-family: Verdana, Geneva, sans-serif; font-size: 13px; background: #f6f6ef; }
    .container { max-width: 1200px; margin: 0 auto; padding: 8px; }
    h1 { font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>AISWelcome</h1>
    <p>An AI-friendly Hacker News clone built on Cloudflare Workers.</p>
    <p>Status: Under construction</p>
    <p><a href="/api/v1/self-test">Health Check</a></p>
  </div>
</body>
</html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Health check endpoint
    if (url.pathname === '/api/v1/self-test') {
      const results = {
        ok: true,
        timestamp: new Date().toISOString(),
        checks: {
          database: false,
          kv: false,
        },
      };
      
      // D1 check disabled for now
      // try {
      //   const result = await env.DB.prepare('SELECT 1 as test').first();
      //   results.checks.database = result?.test === 1;
      // } catch (e) {
      //   console.error('Database check failed:', e);
      // }
      
      try {
        // Test KV
        await env.CACHE.put('test', 'ok', { expirationTtl: 60 });
        const value = await env.CACHE.get('test');
        results.checks.kv = value === 'ok';
      } catch (e) {
        console.error('KV check failed:', e);
      }
      
      results.ok = Object.values(results.checks).every(v => v);
      
      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 404
    return new Response('Not Found', { status: 404 });
  },
};