import { BadRequestException, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ClsServiceManager } from 'nestjs-cls';
import { ContextLogger, CORRELATION_ID_KEY } from '../tracing';
import { EnqueueJobOptions } from '../types/queue.types';

export type { EnqueueJobOptions } from '../types/queue.types';

@Injectable()
export abstract class AbstractListener {
  protected readonly logger = new ContextLogger(this.constructor.name);

  constructor(protected readonly queue: Queue) {}

  /**
   * Enqueues a job to the queue with duplicate checking
   * @param jobId - Unique identifier for the job (used as BullMQ jobId)
   * @param delay - Delay in milliseconds before processing (default: 0)
   * @param data - Additional job data (default: { [idKey]: jobId })
   * @param jobName - Name of the job (default: 'process-job')
   * @param options - Additional BullMQ job options
   */
  protected async enqueueJob({
    jobId,
    delay = 0,
    data,
    jobName,
    options = {},
  }: EnqueueJobOptions): Promise<void> {
    // Check for existing job with same jobId to prevent duplicates
    const existingJob = await this.queue.getJob(jobId);

    if (!data) {
      throw new BadRequestException(`No data provided for job: ${jobId}`);
    }

    if (existingJob) {
      const state = await existingJob.getState();

      switch (state) {
        case 'waiting':
        case 'delayed':
        case 'active':
          this.logger.debug(
            `Skipping duplicate job: ${jobId} (state: ${state})`,
          );
          return;

        case 'failed':
          this.logger.warn(
            `Job failed: ${jobId}, removing job and creating a new one.`,
          );
          await this.queue.remove(jobId);
      }
    }

    // Derive default job name from queue name
    const queueName = this.queue.name;
    const defaultJobName = `process-${queueName.replace('-queue', '')}`;
    const finalJobName = jobName || defaultJobName;

    // Auto-inject correlation ID from CLS context
    const cls = ClsServiceManager.getClsService();
    const correlationId = cls.get<string | undefined>(CORRELATION_ID_KEY);
    const enrichedData = correlationId
      ? { ...data, [CORRELATION_ID_KEY]: correlationId }
      : data;

    await this.queue.add(finalJobName, enrichedData, {
      jobId,
      removeOnFail: false,
      removeOnComplete: true,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      delay,
      ...options,
    });

    this.logger.log(
      `Enqueued ${this.constructor.name.replace('Listener', '')} job: ${String(jobId)} with delay: ${delay}ms`,
    );
  }
}
