import { WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import {
  ContextLogger,
  CORRELATION_ID_KEY,
  EVENT_TYPE_KEY,
  JOB_NAME_KEY,
} from '../tracing';

@Injectable()
export abstract class AbstractProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  protected readonly logger = new ContextLogger(this.constructor.name);

  /**
   * Template method that wraps job processing in CLS context.
   * Subclasses should implement processJob() instead of overriding this method.
   */
  async process(job: Job): Promise<void> {
    const cls = ClsServiceManager.getClsService();

    return cls.run(async () => {
      // Extract correlation ID from job data or generate a new one
      const jobData = job.data as Record<string, unknown> | undefined;
      const correlationId =
        (jobData?.[CORRELATION_ID_KEY] as string | undefined) || randomUUID();
      cls.set(CORRELATION_ID_KEY, correlationId);
      cls.set(EVENT_TYPE_KEY, 'queue');
      cls.set(JOB_NAME_KEY, job.name);

      return this.processJob(job);
    });
  }

  /**
   * Abstract method that subclasses must implement to handle job processing.
   * This method is called within a CLS context with correlation ID set.
   */
  abstract processJob(job: Job): Promise<void>;

  async onApplicationShutdown(signal?: string) {
    this.logger.log(
      `${this.constructor.name} shutting down on signal: ${signal}`,
    );
    const worker = this.worker;
    if (worker) {
      this.logger.log(`Closing ${this.constructor.name} worker`);
      await worker.close();
      this.logger.log(`${this.constructor.name} worker closed`);
    }

    this.logger.log(`${this.constructor.name} shutdown complete`);
  }
}
