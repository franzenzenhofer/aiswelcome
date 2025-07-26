import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Logger } from '@aiswelcome/logging';
import { formatError } from '@aiswelcome/logging';
import type { Bindings } from './types.js';

// Import handlers
import { homeHandler } from './handlers/home.js';
import { submitHandler } from './handlers/submit.js';
import { loginHandler, signupHandler } from './handlers/auth.js';

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', cors());

// Logging middleware
app.use('*', async (c, next) => {
  const logger = new Logger({
    route: c.req.path,
    method: c.req.method,
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    ua: c.req.header('User-Agent') || 'unknown',
  });

  c.set('logger', logger);
  const start = Date.now();

  try {
    await next();
    
    // Log request
    const logEvent = logger.getRequestLog(c.res.status);
    console.log(JSON.stringify(logEvent));
    
    // Add request ID header
    c.header('X-Request-ID', logEvent.req_id);
  } catch (error) {
    logger.error(error as Error);
    const errorResponse = formatError(error, logger.getRequestLog(500).req_id);
    
    return c.json(errorResponse, errorResponse.code === 'INTERNAL_ERROR' ? 500 : 400);
  }
});

// Routes
app.get('/', homeHandler);
app.get('/new', homeHandler);
app.get('/top', homeHandler);
app.get('/ask', homeHandler);
app.get('/show', homeHandler);

// Auth routes
app.post('/api/v1/login', loginHandler);
app.post('/api/v1/signup', signupHandler);

// Story routes
app.get('/submit', (c) => c.html('<h1>Submit Page</h1>'));
app.post('/api/v1/submit', submitHandler);

// Health check
app.get('/api/v1/self-test', async (c) => {
  const logger = c.get('logger');
  const results = {
    ok: true,
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      kv: false,
      rate_limiter: false,
    },
  };

  try {
    // Test D1
    const result = await c.env.DB.prepare('SELECT 1 as test').first();
    results.checks.database = result?.test === 1;
  } catch (e) {
    logger.error(e as Error, { check: 'database' });
  }

  try {
    // Test KV
    await c.env.CACHE.put('test', 'ok', { expirationTtl: 60 });
    const value = await c.env.CACHE.get('test');
    results.checks.kv = value === 'ok';
  } catch (e) {
    logger.error(e as Error, { check: 'kv' });
  }

  results.ok = Object.values(results.checks).every(v => v);
  
  return c.json(results);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    ok: false,
    code: 'NOT_FOUND',
    message: 'Route not found',
    req_id: c.get('logger').getRequestLog(404).req_id,
  }, 404);
});

// Export Durable Object
export { RateLimiter } from './rate-limiter.js';

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Bindings>;