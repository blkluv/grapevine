/**
 * Structured JSON Logging Service
 *
 * Provides structured logging with JSON output for better log parsing and analysis.
 * Supports different log levels and contextual information.
 */

import { config } from './config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    // Set minimum log level from environment, default to 'info'
    const envLevel = config.logging.level?.toLowerCase() as LogLevel;
    this.minLevel = envLevel || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return JSON.stringify(entry);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, context, error));
    }
  }

  // Specialized logging methods for common patterns

  postgres(operation: string, query: string, params?: any[], duration?: number): void {
    this.debug('PostgreSQL query', {
      operation,
      query: query.replace(/\s+/g, ' ').trim(),
      params: params || [],
      duration_ms: duration,
    });
  }

  httpRequest(method: string, path: string, context?: LogContext): void {
    this.info('HTTP request', {
      method,
      path,
      ...context,
    });
  }

  httpResponse(method: string, path: string, status: number, duration: number, context?: LogContext): void {
    this.info('HTTP response', {
      method,
      path,
      status,
      duration_ms: duration,
      ...context,
    });
  }

  pinataOperation(operation: string, context?: LogContext): void {
    this.info('Pinata operation', {
      operation,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();
