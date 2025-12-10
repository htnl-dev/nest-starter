import { Job } from 'bullmq';
import { AbstractProcessor } from './abstract.processor';
import { AuditableService } from './auditable.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FsmHandlerResponse } from '../types/fsm.types';
import { GenericAuditableDocument } from '../entities/auditable.entity';
import { Types } from 'mongoose';
import { FsmJobState } from '../enums/fsm.enums';

export abstract class AbstractFsmProcessor<
  T extends GenericAuditableDocument,
> extends AbstractProcessor {
  abstract key: string;

  constructor(protected readonly service: AuditableService<T>) {
    super();
  }

  abstract getJobState(entity: T): FsmJobState;
  abstract handleJob(entity: T): Promise<FsmHandlerResponse<T>>;
  abstract handleRequeueJob(entity: T, delay: number): Promise<void>;

  canProcess(entity: T): boolean {
    const state = this.getJobState(entity);

    switch (state) {
      case FsmJobState.INITIAL:
      case FsmJobState.PROCESSING:
      case FsmJobState.STUCK:
        return true;
      case FsmJobState.FINAL:
        return false;
    }
  }

  shouldRequeue(entity: T): boolean {
    const state = this.getJobState(entity);
    switch (state) {
      case FsmJobState.INITIAL:
      case FsmJobState.PROCESSING:
        return true;
      case FsmJobState.FINAL:
      case FsmJobState.STUCK:
        return false;
    }
  }

  async process(job: Job): Promise<void> {
    const entityId = job.data[this.key] as string;

    if (!entityId) {
      throw new BadRequestException('Entity ID is required');
    }

    try {
      const entity = await this.service.findOne(entityId);

      if (!entity) {
        throw new NotFoundException('Entity not found');
      }

      if (!this.canProcess(entity)) {
        this.logger.warn(`Entity ${entityId} cannot be processed.`);
        return;
      }

      const handlerResponse = await this.handleJob(entity);

      const updatedEntity = await this.service.updateStatus(
        entityId,
        handlerResponse.statusUpdate,
      );

      await this.finishProcessing(updatedEntity, handlerResponse.delay);
    } catch (error) {
      this.logger.error(`Error processing entity ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Maximum number of retry iterations before considering an entity stuck
   * Can be overridden in subclasses if different limits are needed
   */
  protected get maxRetries(): number {
    return 50;
  }

  /**
   * Calculate exponential backoff delay with staggered retry pattern
   * Staggers retries every 10 iterations to give old entities a second chance
   * @param baseDelay - Base delay in milliseconds (default: 200ms)
   * @param retryCount - Current retry iteration count
   * @returns Delay in milliseconds, capped at 15 minutes
   */
  private getDelay(baseDelay = 200, retryCount: number = 0): number {
    retryCount %= 10;
    const max_delay = 1000 * 60 * 15; // 15 minutes
    const getDelay = (count: number) => baseDelay * Math.pow(2, count - 1);
    return Math.min(getDelay(retryCount), max_delay);
  }

  async finishProcessing(entity: T, baseDelay?: number): Promise<void> {
    entity = entity as T & { _id: Types.ObjectId };
    const entityId = entity._id.toString();
    if (this.shouldRequeue(entity)) {
      const fsmState = this.service.getCurrentState(entity)!;
      const iterations = fsmState?.iterations || 0;

      // Check if we've exceeded max retries
      if (iterations >= this.maxRetries) {
        this.logger.error(
          `Entity ${entityId} exceeded max retries (${this.maxRetries}). Manual intervention required.`,
        );
        return;
      }

      const delay = this.getDelay(baseDelay, iterations);
      await this.handleRequeueJob(entity, delay);
      this.logger.log(
        `Entity ${entityId} requeued for processing in ${delay}ms (iteration ${iterations + 1}/${this.maxRetries})`,
      );
    } else {
      this.logger.log(`Entity ${entityId} processed successfully`);
    }
  }
}
