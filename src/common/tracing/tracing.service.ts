import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import {
  CORRELATION_ID_KEY,
  EVENT_TYPE_KEY,
  JOB_NAME_KEY,
  EventType,
} from './tracing.constants';

@Injectable()
export class TracingService {
  constructor(private readonly cls: ClsService) {}

  get correlationId(): string | undefined {
    return this.cls.get(CORRELATION_ID_KEY);
  }

  get eventType(): EventType | undefined {
    return this.cls.get(EVENT_TYPE_KEY);
  }

  get jobName(): string | undefined {
    return this.cls.get(JOB_NAME_KEY);
  }

  generateCorrelationId(): string {
    return randomUUID();
  }

  runWithContext<T>(
    eventType: EventType,
    callback: () => T,
    options?: {
      correlationId?: string;
      jobName?: string;
    },
  ): T {
    return this.cls.run(() => {
      this.cls.set(
        CORRELATION_ID_KEY,
        options?.correlationId || this.generateCorrelationId(),
      );
      this.cls.set(EVENT_TYPE_KEY, eventType);
      if (options?.jobName) {
        this.cls.set(JOB_NAME_KEY, options.jobName);
      }
      return callback();
    });
  }
}
