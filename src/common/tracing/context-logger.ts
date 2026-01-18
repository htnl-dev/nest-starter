import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
  CORRELATION_ID_KEY,
  EVENT_TYPE_KEY,
  JOB_NAME_KEY,
} from './tracing.constants';

interface LogContext {
  correlationId?: string;
  eventType?: string;
  jobName?: string;
}

interface JsonLogEntry {
  '@timestamp': string;
  level: string;
  context: string;
  message: string;
  correlationId?: string;
  eventType?: string;
  jobName?: string;
  pid: number;
  [key: string]: unknown;
}

/**
 * A context-aware logger that automatically includes correlation ID
 * and event type from the CLS context.
 *
 * Supports two output formats:
 * - Text (default): Human-readable colored output with [correlationId] [eventType] prefix
 * - JSON: Structured JSON output for log aggregation (ELK, Loki, etc.)
 *
 * Set LOG_FORMAT=json environment variable to enable JSON output.
 *
 * Usage (same as standard Logger):
 * ```
 * protected readonly logger = new ContextLogger(this.constructor.name);
 * ```
 */
export class ContextLogger extends ConsoleLogger {
  private static readonly isJsonFormat =
    process.env.LOG_FORMAT?.toLowerCase() === 'json';

  constructor(context: string) {
    super(context);
  }

  private getLogContext(): LogContext {
    try {
      const cls = ClsServiceManager.getClsService();
      return {
        correlationId: cls.get<string | undefined>(CORRELATION_ID_KEY),
        eventType: cls.get<string | undefined>(EVENT_TYPE_KEY),
        jobName: cls.get<string | undefined>(JOB_NAME_KEY),
      };
    } catch {
      // CLS not initialized yet (e.g., during bootstrap)
      return {};
    }
  }

  private getPrefix(): string {
    const ctx = this.getLogContext();

    if (!ctx.correlationId && !ctx.eventType) {
      return '';
    }

    const parts: string[] = [];
    if (ctx.correlationId) {
      parts.push(`[${ctx.correlationId}]`);
    }
    if (ctx.eventType) {
      parts.push(`[${ctx.eventType}]`);
    }

    return parts.join(' ') + ' ';
  }

  private formatJsonLog(
    level: string,
    message: unknown,
    context?: string,
    additionalData?: Record<string, unknown>,
  ): string {
    const ctx = this.getLogContext();
    const messageStr =
      typeof message === 'string' ? message : JSON.stringify(message);

    const logEntry: JsonLogEntry = {
      '@timestamp': new Date().toISOString(),
      level: level.toUpperCase(),
      context: context || this.context || 'Application',
      message: messageStr,
      pid: process.pid,
    };

    // Add context fields if present
    if (ctx.correlationId) {
      logEntry.correlationId = ctx.correlationId;
    }
    if (ctx.eventType) {
      logEntry.eventType = ctx.eventType;
    }
    if (ctx.jobName) {
      logEntry.jobName = ctx.jobName;
    }

    // Add any additional data
    if (additionalData) {
      Object.assign(logEntry, additionalData);
    }

    return JSON.stringify(logEntry);
  }

  // Override logging methods for JSON format
  log(message: unknown, context?: string): void;
  log(message: unknown, ...optionalParams: unknown[]): void;
  log(message: unknown, ...optionalParams: unknown[]): void {
    if (ContextLogger.isJsonFormat) {
      const context =
        optionalParams.length > 0 && typeof optionalParams[0] === 'string'
          ? optionalParams[0]
          : undefined;
      process.stdout.write(this.formatJsonLog('log', message, context) + '\n');
      return;
    }
    super.log(message, ...optionalParams);
  }

  error(message: unknown, stackOrContext?: string): void;
  error(message: unknown, stack?: string, context?: string): void;
  error(message: unknown, ...optionalParams: unknown[]): void;
  error(message: unknown, ...optionalParams: unknown[]): void {
    if (ContextLogger.isJsonFormat) {
      const stack =
        optionalParams.length > 0 && typeof optionalParams[0] === 'string'
          ? optionalParams[0]
          : undefined;
      const context =
        optionalParams.length > 1 && typeof optionalParams[1] === 'string'
          ? optionalParams[1]
          : undefined;
      process.stderr.write(
        this.formatJsonLog('error', message, context, { stack }) + '\n',
      );
      return;
    }
    super.error(message, ...optionalParams);
  }

  warn(message: unknown, context?: string): void;
  warn(message: unknown, ...optionalParams: unknown[]): void;
  warn(message: unknown, ...optionalParams: unknown[]): void {
    if (ContextLogger.isJsonFormat) {
      const context =
        optionalParams.length > 0 && typeof optionalParams[0] === 'string'
          ? optionalParams[0]
          : undefined;
      process.stdout.write(this.formatJsonLog('warn', message, context) + '\n');
      return;
    }
    super.warn(message, ...optionalParams);
  }

  debug(message: unknown, context?: string): void;
  debug(message: unknown, ...optionalParams: unknown[]): void;
  debug(message: unknown, ...optionalParams: unknown[]): void {
    if (ContextLogger.isJsonFormat) {
      const context =
        optionalParams.length > 0 && typeof optionalParams[0] === 'string'
          ? optionalParams[0]
          : undefined;
      process.stdout.write(
        this.formatJsonLog('debug', message, context) + '\n',
      );
      return;
    }
    super.debug(message, ...optionalParams);
  }

  verbose(message: unknown, context?: string): void;
  verbose(message: unknown, ...optionalParams: unknown[]): void;
  verbose(message: unknown, ...optionalParams: unknown[]): void {
    if (ContextLogger.isJsonFormat) {
      const context =
        optionalParams.length > 0 && typeof optionalParams[0] === 'string'
          ? optionalParams[0]
          : undefined;
      process.stdout.write(
        this.formatJsonLog('verbose', message, context) + '\n',
      );
      return;
    }
    super.verbose(message, ...optionalParams);
  }

  fatal(message: unknown, context?: string): void;
  fatal(message: unknown, ...optionalParams: unknown[]): void;
  fatal(message: unknown, ...optionalParams: unknown[]): void {
    if (ContextLogger.isJsonFormat) {
      const context =
        optionalParams.length > 0 && typeof optionalParams[0] === 'string'
          ? optionalParams[0]
          : undefined;
      process.stderr.write(
        this.formatJsonLog('fatal', message, context) + '\n',
      );
      return;
    }
    super.fatal(message, ...optionalParams);
  }

  // Text format: Add prefix to messages
  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
    // JSON format is handled in the override methods above
    if (ContextLogger.isJsonFormat) {
      return '';
    }

    const prefix = this.getPrefix();
    const messageStr =
      typeof message === 'string' ? message : JSON.stringify(message);

    return super.formatMessage(
      logLevel,
      `${prefix}${messageStr}`,
      pidMessage,
      formattedLogLevel,
      contextMessage,
      timestampDiff,
    );
  }
}
