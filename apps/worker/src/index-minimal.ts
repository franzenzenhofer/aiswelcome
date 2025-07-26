export interface Env {
  ENVIRONMENT: string;
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
    <p>Environment: ${env.ENVIRONMENT}</p>
    <p><a href="/api/v1/health">Health Check</a></p>
  </div>
</body>
</html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Health check endpoint
    if (url.pathname === '/api/v1/health') {
      return new Response(JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        environment: env.ENVIRONMENT,
        message: 'AISWelcome is running'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 404
    return new Response('Not Found', { status: 404 });
  },
};