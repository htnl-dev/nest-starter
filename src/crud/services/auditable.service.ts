import { AbstractCrudService } from './crud.service';
import {
  GenericAuditableDocument,
  AuditState,
} from '../entities/auditable.entity';
import { CrudEntity } from '../entities/crud.entity';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CurrentUser } from '../types/current-user.type';
import { TransitionTable, TransitionEffect } from '../types/fsm.types';
import { createSimpleTransitionTable } from '../utils/fsm.utils';
import { SchedulerRegistry } from '@nestjs/schedule';

export interface StatusUpdateDto {
  status: string;
  description?: string;
  metadata?: Record<string, unknown>;
  user?: string;
}

export abstract class AuditableService<
  Entity extends GenericAuditableDocument,
  CreateDto extends object = object,
  UpdateDto extends object = object,
  TStatus extends string = string,
> extends AbstractCrudService<Entity, CreateDto, UpdateDto> {
  private transitionValidator?: ReturnType<
    typeof createSimpleTransitionTable<TStatus>
  >;

  constructor(
    @InjectConnection() protected readonly connection: Connection,
    @InjectModel(CrudEntity.name) protected readonly model: Model<Entity>,
    protected readonly eventEmitter?: EventEmitter2,
    protected readonly schedulerRegistry?: SchedulerRegistry,
  ) {
    super(connection, model, eventEmitter, schedulerRegistry);
  }

  /**
   * Define allowed transitions. Override in subclass.
   * Return empty object for lenient mode (any transition allowed).
   */
  get transitions(): TransitionTable<TStatus> {
    return {} as TransitionTable<TStatus>;
  }

  /**
   * Define transition effects. Override in subclass.
   */
  get effects(): Partial<Record<TStatus, TransitionEffect<Entity>>> {
    return {};
  }

  private getValidator() {
    if (!this.transitionValidator) {
      this.transitionValidator = createSimpleTransitionTable(this.transitions);
    }
    return this.transitionValidator;
  }

  /**
   * Check if transitions are enforced (strict mode)
   */
  get isStrictMode(): boolean {
    return Object.keys(this.transitions).length > 0;
  }

  /**
   * Get the current audit state
   */
  getCurrentState(entity: Entity): AuditState | undefined {
    return entity.stateTransitions?.at(-1);
  }

  /**
   * Update entity status with audit trail
   */
  async updateStatus(
    id: string | Types.ObjectId,
    dto: StatusUpdateDto,
    session?: ClientSession,
  ) {
    return this.withSession(session, async (session) => {
      const entity = await this.findOne(id, session);
      if (!entity) {
        throw new Error(`Entity not found: ${id.toString()}`);
      }

      const currentStatus = entity.status as TStatus;
      const nextStatus = dto.status as TStatus;

      // Validate transition if in strict mode
      if (this.isStrictMode) {
        this.getValidator().validate(currentStatus, nextStatus);
      }

      const auditEntry: AuditState = {
        status: nextStatus,
        step: 'complete',
        iterations: 0,
        description: dto.description || `Status changed to ${nextStatus}`,
        metadata: dto.metadata,
        user: dto.user,
      };

      const updated = await this.forceUpdate(
        id,
        {
          status: nextStatus,
          $push: { stateTransitions: auditEntry },
        } as unknown as Partial<Entity>,
        session,
      );

      // Execute transition effect if defined
      const effect = this.effects[nextStatus];
      if (effect && updated) {
        await effect(updated, session);
      }

      return updated;
    });
  }

  /**
   * Create with initial status audit entry
   */
  async create(
    createDto: CreateDto,
    user?: CurrentUser,
    session?: ClientSession,
  ) {
    return this.withSession(session, async (session) => {
      const entity = await super.create(createDto, user, session);

      await this.updateStatus(
        entity._id,
        {
          status: entity.status,
          description: `${this.model.modelName} created`,
          user: user?._id,
        },
        session,
      );

      return this.findOne(entity._id, session);
    });
  }
}
