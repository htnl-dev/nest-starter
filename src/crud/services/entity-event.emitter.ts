import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';

export type EntityId = string | Types.ObjectId;

export interface EntityEvent {
  id: EntityId;
  timestamp: Date;
}

export interface EntityCreatedEvent extends EntityEvent {
  type: 'created';
}

export interface EntityUpdatedEvent extends EntityEvent {
  type: 'updated';
}

export interface EntityDeletedEvent extends EntityEvent {
  type: 'deleted';
}

@Injectable()
export class EntityEventEmitter {
  constructor(@Optional() private readonly eventEmitter?: EventEmitter2) {}

  /**
   * Check if event emission is available
   */
  get isEnabled(): boolean {
    return !!this.eventEmitter;
  }

  /**
   * Emit an entity created event
   */
  emitCreated(entityId: EntityId, entityType?: string): void {
    if (!this.eventEmitter) return;

    const event: EntityCreatedEvent = {
      id: entityId,
      type: 'created',
      timestamp: new Date(),
    };

    this.eventEmitter.emit(this.buildEventName(entityId, 'created'), event);

    if (entityType) {
      this.eventEmitter.emit(`${entityType}.created`, event);
    }
  }

  /**
   * Emit an entity updated event
   */
  emitUpdated(entityId: EntityId, entityType?: string): void {
    if (!this.eventEmitter) return;

    const event: EntityUpdatedEvent = {
      id: entityId,
      type: 'updated',
      timestamp: new Date(),
    };

    this.eventEmitter.emit(this.buildEventName(entityId, 'updated'), event);

    if (entityType) {
      this.eventEmitter.emit(`${entityType}.updated`, event);
    }
  }

  /**
   * Emit an entity deleted event
   */
  emitDeleted(entityId: EntityId, entityType?: string): void {
    if (!this.eventEmitter) return;

    const event: EntityDeletedEvent = {
      id: entityId,
      type: 'deleted',
      timestamp: new Date(),
    };

    this.eventEmitter.emit(this.buildEventName(entityId, 'deleted'), event);

    if (entityType) {
      this.eventEmitter.emit(`${entityType}.deleted`, event);
    }
  }

  /**
   * Emit a custom entity event
   */
  emitCustom(
    entityId: EntityId,
    eventName: string,
    payload?: Record<string, unknown>,
  ): void {
    if (!this.eventEmitter) return;

    this.eventEmitter.emit(this.buildEventName(entityId, eventName), {
      id: entityId,
      timestamp: new Date(),
      ...payload,
    });
  }

  private buildEventName(entityId: EntityId, action: string): string {
    return `entity.${String(entityId)}.${action}`;
  }
}
