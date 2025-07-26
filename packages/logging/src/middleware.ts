import { Logger } from './logger.js';
import { formatError } from './errors.js';

export interface RequestWithLogger extends Request {
  logger: Logger;
}

// Cloudflare Worker middleware for logging
export function createLoggingMiddleware() {
  return async (
    request: Request,
    _env: any,
    _ctx: ExecutionContext,
    next: () => Promise<Response>
  ): Promise<Response> => {
    const logger = new Logger({
      route: new URL(request.url).pathname,
      method: request.method,
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
      ua: request.headers.get('User-Agent') || 'unknown',
    });

    // Extract user/agent from auth header if present
    const auth = request.headers.get('Authorization');
    if (auth?.startsWith('Bearer ')) {
      // This would be decoded from JWT or looked up from token
      // For now, just log that auth is present
      logger.setContext({ has_auth: true });
    }

    // Attach logger to request
    (request as any).logger = logger;

    let response: Response;
    let input: any;

    try {
      // Capture input for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          try {
            const text = await request.text();
            input = JSON.parse(text);
            // Clone request with body restored
            request = new Request(request, { body: text });
          } catch (e) {
            logger.warn('Failed to parse request body', { error: e });
          }
        }
      }

      // Execute the actual handler
      response = await next();

      // Log successful request
      const logEvent = logger.getRequestLog(response.status, input);
      
      // For API responses, try to capture output
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        try {
          const text = await response.text();
          const output = JSON.parse(text);
          logEvent.output = output;
          // Clone response with body restored
          response = new Response(text, response);
        } catch (e) {
          logger.warn('Failed to parse response body', { error: e });
        }
      }

      console.log(JSON.stringify(logEvent));

      // Add request ID to response headers
      const headers = new Headers(response.headers);
      headers.set('X-Request-ID', logger.getRequestLog(200).req_id);
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

    } catch (error) {
      // Log error
      logger.error(error as Error);
      
      // Format error response
      const errorResponse = formatError(error, logger.getRequestLog(500).req_id);
      const logEvent = logger.getRequestLog(
        errorResponse.code === 'INTERNAL_ERROR' ? 500 : 400,
        input,
        errorResponse
      );
      
      console.log(JSON.stringify(logEvent));

      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.code === 'INTERNAL_ERROR' ? 500 : 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': errorResponse.req_id,
        },
      });
    }
  };
}

// Helper to get logger from request
export function getLogger(request: Request): Logger {
  return (request as any).logger || new Logger();
}