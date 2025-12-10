import { AbstractCrudService } from './crud.service';
import {
  GenericAuditableDocument,
  AuditState,
} from '../entities/auditable.entity';
import { CrudEntity } from '../entities/crud.entity';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { UpdateAuditableStatusDto } from '../dto/update-auditable-status.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CurrentUser } from '../types/current-user.type';
import { Transition, TransitionTable } from '../types/fsm.types';
import {
  FinalStateTransitionException,
  InvalidTransitionException,
} from '../errors/fsm.errors';
import { FsmMode } from '../enums/fsm.enums';
import { SchedulerRegistry } from '@nestjs/schedule';

export abstract class AuditableService<
  Entity extends GenericAuditableDocument,
  CreateDto extends object = object,
  UpdateDto extends object = object,
> extends AbstractCrudService<Entity, CreateDto, UpdateDto> {
  constructor(
    @InjectConnection() protected readonly connection: Connection,
    @InjectModel(CrudEntity.name) protected readonly model: Model<Entity>,
    protected readonly eventEmitter?: EventEmitter2,
    protected readonly schedulerRegistry?: SchedulerRegistry,
  ) {
    super(connection, model, eventEmitter, schedulerRegistry);
  }

  abstract get transitions(): TransitionTable<Entity>;

  get fsmMode(): FsmMode {
    // if has transition table, return strict
    if (Object.keys(this.transitions).length > 0) {
      return FsmMode.STRICT as unknown as FsmMode;
    }
    return FsmMode.LENIENT as unknown as FsmMode;
  }

  getTransition(
    currentStatus: Entity['status'],
    nextStatus: Entity['status'],
  ): Transition<Entity> {
    const transition = this.transitions[currentStatus]?.find(
      (transition) => transition.to === nextStatus,
    );
    if (!transition) {
      if (this.transitions[currentStatus]) {
        // allows transitions, but not this one
        throw new InvalidTransitionException(currentStatus, nextStatus);
      }
      // doesn't allow transition at all, considered a final state
      throw new FinalStateTransitionException(currentStatus, nextStatus);
    }
    return {
      from: currentStatus,
      ...transition,
    };
  }

  getCurrentState(entity: Entity): AuditState | undefined {
    if (!entity.auditTrail) {
      return undefined;
    }
    return entity.auditTrail?.at(-1);
  }

  updateStatus<T extends UpdateAuditableStatusDto>(
    id: string | Types.ObjectId,
    updateDto: T,
    session?: ClientSession,
  ) {
    const { updates, ...stateTransition } = updateDto;
    return this.withSession(session, async (session) => {
      let transition: Transition<Entity> | undefined;
      const status = stateTransition.status;

      // Get current entity to check current status
      const entity = await this.findOne(id, session);
      if (!entity) {
        throw new Error(`Entity not found: ${id.toString()}`);
      }

      // Apply transition based on FSM mode
      if (this.fsmMode === (FsmMode.STRICT as unknown as FsmMode)) {
        // Validate that the transition is allowed
        transition = this.getTransition(
          entity.status as Entity['status'],
          status as Entity['status'],
        );

        this.logger.log(
          `Applying strict transition: ${String(entity.status)} -> ${String(status)}`,
          { transition },
        );
      } else {
        // Lenient mode - allow any transition
        this.logger.log(
          `Applying lenient transition: ${String(entity.status)} -> ${String(status)}`,
        );
      }

      // Perform the update with optimistic locking via forceUpdate
      const updatedEntity = await this.forceUpdate(
        id,
        {
          status,
          ...updates,
          $push: { stateTransitions: stateTransition },
        } as Partial<Entity & { $push?: any }>,
        session,
      );

      if (!updatedEntity) {
        throw new Error(`Failed to update ${this.model.modelName}`);
      }

      if (transition && transition.effect) {
        await transition.effect(updatedEntity, session);
      }

      return updatedEntity;
    });
  }

  create(createDto: CreateDto, user?: CurrentUser, session?: ClientSession) {
    return this.withSession(session, async (session) => {
      const entity = await super.create(createDto, user, session);
      await this.updateStatus(
        entity._id,
        {
          status: entity.status,
          description: `${this.model.modelName} ${entity.status}`,
          user: user?._id,
        },
        session,
      );
      return this.findOne(entity._id, session);
    });
  }
}
