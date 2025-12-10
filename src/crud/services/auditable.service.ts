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
   * Return undefined to allow any transition.
   */
  get machine(): AnyStateMachine | undefined {
    return undefined;
  }

  /**
   * Validate transition using XState machine
   */
  canTransition(from: TStatus, to: TStatus): boolean {
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

      if (!this.canTransition(currentStatus, nextStatus)) {
        throw new InvalidTransitionException(currentStatus, nextStatus);
      }

      const auditEntry: AuditState = {
        status: nextStatus,
        description: dto.description || `Status changed to ${nextStatus}`,
        metadata: dto.metadata,
        user: dto.user,
      };

      return this.forceUpdate(
        id,
        {
          status: nextStatus,
          $push: { stateTransitions: auditEntry },
        } as unknown as Partial<Entity>,
        session,
      );
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
 * Create an XState machine for status transitions.
 * Events are the target status names.
 */
export function createStatusMachine<TStatus extends string>(
  id: string,
  initial: TStatus,
  transitions: Record<TStatus, TStatus[]>,
) {
  const states: Record<string, { on?: Record<string, string> }> = {};

  for (const [from, toStates] of Object.entries<TStatus[]>(transitions)) {
    states[from] = {
      on: Object.fromEntries(toStates.map((to) => [to, to])),
    };
  }

  return createMachine({ id, initial, states });
}
