import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { CORRELATION_ID_KEY, EVENT_TYPE_KEY } from './tracing.constants';

/**
 * A context-aware logger that automatically prefixes log messages with
 * correlation ID and event type from the CLS context.
 *
 * Usage (same as standard Logger):
 * ```
 * protected readonly logger = new ContextLogger(this.constructor.name);
 * ```
 */
export class ContextLogger extends ConsoleLogger {
  constructor(context: string) {
    super(context);
  }

  private getPrefix(): string {
    try {
      const cls = ClsServiceManager.getClsService();
      const correlationId = cls.get<string | undefined>(CORRELATION_ID_KEY);
      const eventType = cls.get<string | undefined>(EVENT_TYPE_KEY);

      if (!correlationId && !eventType) {
        return '';
      }

      const parts: string[] = [];
      if (correlationId) {
        parts.push(`[${correlationId}]`);
      }
      if (eventType) {
        parts.push(`[${eventType}]`);
      }

      return parts.join(' ') + ' ';
    } catch {
      // CLS not initialized yet (e.g., during bootstrap)
      return '';
    }
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
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
