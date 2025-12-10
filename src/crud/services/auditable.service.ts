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
import { SchedulerRegistry } from '@nestjs/schedule';
import { createActor, createMachine, AnyStateMachine } from 'xstate';
import { InvalidTransitionException } from '../errors/fsm.errors';

export interface StatusUpdateDto {
  status: string;
  description?: string;
  metadata?: Record<string, unknown>;
  user?: string;
}

export type TransitionEffect<TContext = unknown> = (
  context: TContext,
  session?: ClientSession,
) => Promise<void>;

export abstract class AuditableService<
  Entity extends GenericAuditableDocument,
  CreateDto extends object = object,
  UpdateDto extends object = object,
  TStatus extends string = string,
> extends AbstractCrudService<Entity, CreateDto, UpdateDto> {
  constructor(
    @InjectConnection() protected readonly connection: Connection,
    @InjectModel(CrudEntity.name) protected readonly model: Model<Entity>,
    protected readonly eventEmitter?: EventEmitter2,
    protected readonly schedulerRegistry?: SchedulerRegistry,
  ) {
    super(connection, model, eventEmitter, schedulerRegistry);
  }

  /**
   * Override to provide an XState machine for transition validation.
   * Return undefined for lenient mode (any transition allowed).
   */
  get machine(): AnyStateMachine | undefined {
    return undefined;
  }

  /**
   * Define transition effects. Override in subclass.
   */
  get effects(): Partial<Record<TStatus, TransitionEffect<Entity>>> {
    return {};
  }

  /**
   * Check if transitions are enforced (strict mode)
   */
  get isStrictMode(): boolean {
    return this.machine !== undefined;
  }

  /**
   * Validate transition using XState machine
   */
  private canTransition(from: TStatus, to: TStatus): boolean {
    if (!this.machine) return true;

    const actor = createActor(this.machine, {
      snapshot: this.machine.resolveState({ value: from, context: {} }),
    });

    return actor.getSnapshot().can({ type: to });
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
      if (this.isStrictMode && !this.canTransition(currentStatus, nextStatus)) {
        throw new InvalidTransitionException(currentStatus, nextStatus);
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

/**
 * Helper to create an XState machine for status transitions
 */
export function createStatusMachine<TStatus extends string>(config: {
  id: string;
  initial: TStatus;
  states: {
    [K in TStatus]: {
      on?: { [event: string]: TStatus };
      type?: 'final';
    };
  };
}) {
  return createMachine({
    id: config.id,
    initial: config.initial,
    states: config.states as Record<string, object>,
  });
}
