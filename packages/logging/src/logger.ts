import { generateRequestId } from '@aiswelcome/shared';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  req_id: string;
  route?: string;
  method?: string;
  user_id?: number;
  agent_id?: number;
  ip?: string;
  ua?: string;
  [key: string]: any;
}

export interface LogEvent {
  ts: string;
  level: LogLevel;
  req_id: string;
  message?: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  context: LogContext;
  input?: any;
  output?: any;
  latency_ms?: number;
  status?: number;
}

export class Logger {
  private context: LogContext;
  private startTime: number;
  private logs: LogEvent[] = [];

  constructor(context: Partial<LogContext> = {}) {
    this.context = {
      req_id: context.req_id || generateRequestId(),
      ...context,
    };
    this.startTime = Date.now();
  }

  private createEvent(level: LogLevel, message?: string, extra?: any): LogEvent {
    return {
      ts: new Date().toISOString(),
      level,
      req_id: this.context.req_id,
      message,
      context: this.context,
      latency_ms: Date.now() - this.startTime,
      ...extra,
    };
  }

  debug(message: string, extra?: any): void {
    const event = this.createEvent('debug', message, extra);
    this.logs.push(event);
    console.debug(JSON.stringify(event));
  }

  info(message: string, extra?: any): void {
    const event = this.createEvent('info', message, extra);
    this.logs.push(event);
    console.info(JSON.stringify(event));
  }

  warn(message: string, extra?: any): void {
    const event = this.createEvent('warn', message, extra);
    this.logs.push(event);
    console.warn(JSON.stringify(event));
  }

  error(error: Error | string, extra?: any): void {
    const event = this.createEvent('error', undefined, {
      error: typeof error === 'string' 
        ? { code: 'UNKNOWN', message: error }
        : {
            code: (error as any).code || 'UNKNOWN',
            message: error.message,
            stack: error.stack,
          },
      ...extra,
    });
    this.logs.push(event);
    console.error(JSON.stringify(event));
  }

  setContext(context: Partial<LogContext>): void {
    Object.assign(this.context, context);
  }

  child(context: Partial<LogContext>): Logger {
    return new Logger({
      ...this.context,
      ...context,
    });
  }

  getLogs(): LogEvent[] {
    return this.logs;
  }

  getRequestLog(status: number, input?: any, output?: any): LogEvent {
    return {
      ts: new Date().toISOString(),
      level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      req_id: this.context.req_id,
      context: this.context,
      status,
      latency_ms: Date.now() - this.startTime,
      input,
      output,
    };
  }
}