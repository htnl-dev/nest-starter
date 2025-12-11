import { JobsOptions } from 'bullmq';

/**
 * Options for enqueueing a job to a BullMQ queue
 */
export interface EnqueueJobOptions {
  /**
   * Unique identifier for the job (used as BullMQ jobId)
   */
  jobId: string;

  /**
   * Delay in milliseconds before processing
   * @default 0
   */
  delay?: number;

  /**
   * Job payload data
   */
  data?: Record<string, unknown>;

  /**
   * Name of the job (defaults to derived from queue name)
   */
  jobName?: string;

  /**
   * Additional BullMQ job options
   */
  options?: Partial<JobsOptions>;
}
