import { Job } from 'bullmq';
import { AbstractProcessor } from './abstract.processor';
import { AuditableService } from './auditable.service';
import { NotFoundException } from '@nestjs/common';
import { FsmHandlerResponse } from '../types/fsm.types';
import { GenericAuditableDocument } from '../entities/auditable.entity';

/**
 * Abstract FSM processor for handling state machine jobs
 */
export abstract class AbstractFsmProcessor<
  T extends GenericAuditableDocument,
> extends AbstractProcessor {
  abstract entityKey: string;

  protected maxRetries = 10;
  protected baseDelay = 5000;
  protected maxDelay = 300000;

  constructor(protected readonly service: AuditableService<T>) {
    super();
  }

  /**
   * Determine if entity can be processed
   */
  abstract canProcess(entity: T): boolean;

  /**
   * Handle the job processing
   */
  abstract handleJob(entity: T): Promise<FsmHandlerResponse>;

  /**
   * Requeue job for later processing
   */
  abstract requeueJob(entityId: string, delay: number): Promise<void>;

  /**
   * Calculate exponential backoff delay
   */
  protected getDelay(retryCount: number): number {
    const delay = this.baseDelay * Math.pow(2, retryCount);
    return Math.min(delay, this.maxDelay);
  }

  async process(job: Job): Promise<void> {
    const entityId = job.data[this.entityKey] as string;

    const entity = await this.service.findOne(entityId);
    if (!entity) {
      throw new NotFoundException(`Entity not found: ${entityId}`);
    }

    if (!this.canProcess(entity)) {
      this.logger.log(
        `Entity ${entityId} cannot be processed in current state`,
      );
      return;
    }

    try {
      const response = await this.handleJob(entity);

      await this.service.updateStatus(entityId, {
        status: response.nextStatus,
        metadata: response.metadata,
      });

      if (response.delay) {
        await this.requeueJob(entityId, response.delay);
      }
    } catch (error) {
      const currentState = this.service.getCurrentState(entity);
      const retryCount = currentState?.iterations ?? 0;

      if (retryCount < this.maxRetries) {
        const delay = this.getDelay(retryCount);
        this.logger.warn(
          `Retrying entity ${entityId} in ${delay}ms (attempt ${retryCount + 1})`,
        );
        await this.requeueJob(entityId, delay);
      } else {
        this.logger.error(`Entity ${entityId} exceeded max retries`, error);
      }
    }
  }
}
