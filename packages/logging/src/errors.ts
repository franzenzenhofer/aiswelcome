import { ApiError } from '@aiswelcome/shared';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly hint?: string;
  public readonly details?: any;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    hint?: string,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.hint = hint;
    this.details = details;
    
    // Ensure prototype chain is correctly set up
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(reqId: string): ApiError {
    return {
      ok: false,
      code: this.code,
      message: this.message,
      hint: this.hint,
      req_id: reqId,
    };
  }
}

// Common errors
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, 'Check your input parameters', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401, 'Please login or provide valid credentials');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super('AUTHORIZATION_ERROR', message, 403, 'You do not have permission for this action');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, hint?: string) {
    super('CONFLICT', message, 409, hint);
  }
}

export class RateLimitError extends AppError {
  constructor(resetSeconds: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests',
      429,
      `Try again in ${resetSeconds} seconds`
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super('DATABASE_ERROR', message, 500, 'A database error occurred');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      'EXTERNAL_SERVICE_ERROR',
      `${service} error: ${message}`,
      502,
      'An external service is unavailable'
    );
  }
}

// Error handler
export function formatError(error: unknown, reqId: string): ApiError {
  if (error instanceof AppError) {
    return error.toJSON(reqId);
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('D1_')) {
      return new DatabaseError(error.message).toJSON(reqId);
    }
    
    // Generic error
    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
      hint: error.message,
      req_id: reqId,
    };
  }

  // Unknown error type
  return {
    ok: false,
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    req_id: reqId,
  };
}