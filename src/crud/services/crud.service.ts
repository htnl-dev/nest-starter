import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  type ClientSession,
  Model,
  Types,
  PopulateOptions,
  HydratedDocument,
} from 'mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CreateCrudDto as AbstractCreateDto } from '../dto/create-crud.dto';
import { UpdateCrudDto as AbstractUpdateDto } from '../dto/update-crud.dto';
import { QueryDto } from '../dto/crud-query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { CrudEntity, GenericCrudDocument } from '../entities/crud.entity';
import { TransactionManager } from './transaction.manager';
import { QueryBuilderService } from './query-builder.service';
import { OptimisticLockingService } from './optimistic-locking.service';
import { EntityEventEmitter } from './entity-event.emitter';
import type { CurrentUser } from '../types/current-user.type';

export interface UpdateOptions {
  skipVersionCheck?: boolean;
}

@Injectable()
export abstract class AbstractCrudService<
  Entity extends GenericCrudDocument,
  CreateDto extends object = AbstractCreateDto,
  UpdateDto extends object = AbstractUpdateDto,
> implements OnApplicationShutdown
{
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectModel(CrudEntity.name) protected readonly model: Model<Entity>,
    protected readonly transactionManager: TransactionManager,
    protected readonly queryBuilder: QueryBuilderService,
    protected readonly lockingService: OptimisticLockingService,
    protected readonly entityEvents: EntityEventEmitter,
    protected readonly schedulerRegistry?: SchedulerRegistry,
  ) {}

  onApplicationShutdown(signal?: string): void {
    this.logger.log(
      `${this.constructor.name} shutting down on signal: ${signal}`,
    );

    if (this.schedulerRegistry) {
      this.logger.log(`Stopping ${this.constructor.name} scheduled jobs`);
      for (const job of this.schedulerRegistry.getCronJobs().values()) {
        void job.stop();
      }
      this.logger.log(`${this.constructor.name} scheduled jobs stopped`);
    }

    this.logger.log(`${this.constructor.name} shutdown complete`);
  }

  /**
   * Define relationships to populate on queries.
   * Override in child services to customize population.
   */
  get populator(): Array<string | PopulateOptions> {
    return [{ path: 'user', select: 'firstName lastName email' }];
  }

  /**
   * Define which fields should be included in Server-Sent Events (SSE) updates.
   * Override in child services to specify the most important fields for real-time updates.
   */
  get sseFields(): string[] {
    return ['name'];
  }

  /**
   * Get the model name for event emission and error messages
   */
  protected get modelName(): string {
    return this.model.modelName;
  }

  async create(
    createDto: CreateDto,
    user?: CurrentUser,
    session?: ClientSession,
  ): Promise<HydratedDocument<Entity>> {
    return this.transactionManager.withTransaction(session, async (session) => {
      const entity = new this.model({
        ...createDto,
        ...(user && { user: user._id }),
      });

      const saved = await entity.save({ session });
      return saved.populate(this.populator);
    });
  }

  async findAll(
    query: QueryDto<Entity>,
    session?: ClientSession,
  ): Promise<PaginatedResponseDto<HydratedDocument<Entity>>> {
    return this.transactionManager.withTransaction(session, async (session) => {
      const queryResult = this.queryBuilder.buildQuery(query);
      const { data, pagination } =
        await this.queryBuilder.executePaginatedQuery(
          this.model,
          queryResult,
          session,
          {
            select: query.select as string[],
            populator: query.select ? undefined : this.populator,
          },
        );

      return {
        data: data as HydratedDocument<Entity>[],
        pagination,
      };
    });
  }

  async findOne(
    id: string | Types.ObjectId,
    session?: ClientSession,
    options?: {
      select?: string | string[];
      populate?: string[] | PopulateOptions | PopulateOptions[];
    },
  ): Promise<HydratedDocument<Entity>> {
    return this.transactionManager.withTransaction(session, async (session) => {
      let queryBuilder = this.model.findById(id).session(session);

      if (options?.select) {
        const selectStr = Array.isArray(options.select)
          ? options.select.join(' ')
          : options.select;
        queryBuilder = queryBuilder.select(selectStr);
      }

      const populateOptions = options?.populate ?? this.populator;
      if (populateOptions) {
        const populateArray = Array.isArray(populateOptions)
          ? populateOptions
          : [populateOptions];
        queryBuilder = queryBuilder.populate(populateArray);
      }

      const item = await queryBuilder;
      if (!item) {
        throw new NotFoundException(`${this.modelName} not found`);
      }

      return item;
    });
  }

  /**
   * Get entity data for SSE updates (lightweight query)
   */
  getUpdate(id: string | Types.ObjectId) {
    return this.model.findById(id).select(this.sseFields.join(' '));
  }

  /**
   * Update an entity with optimistic locking.
   *
   * Uses the __v field to prevent race conditions. If the entity was modified
   * by another process since it was read, a ConflictException will be thrown.
   */
  async update(
    id: string | Types.ObjectId,
    updateDto: UpdateDto,
    session?: ClientSession,
    options?: UpdateOptions,
  ): Promise<HydratedDocument<Entity>> {
    const currentEntity = await this.model
      .findById(id)
      .session(session ?? null);

    if (!currentEntity) {
      throw new NotFoundException(`${this.modelName} not found`);
    }

    const currentVersion = this.lockingService.extractVersion(
      currentEntity,
      options?.skipVersionCheck,
    );

    const filter = this.lockingService.buildVersionedFilter(id, currentVersion);
    const updateObject = this.lockingService.buildVersionedUpdate(
      updateDto as Record<string, unknown>,
      currentVersion,
    );

    const result = await this.transactionManager.withTransaction(
      session,
      async (session) => {
        const updated = await this.model
          .findOneAndUpdate(filter, updateObject, { new: true, session })
          .populate(this.populator);

        this.lockingService.assertNotStale(
          updated,
          currentVersion,
          this.modelName,
        );

        if (!updated) {
          throw new NotFoundException(`${this.modelName} not found`);
        }

        return updated;
      },
    );

    this.entityEvents.emitUpdated(result._id, this.modelName);

    return result;
  }

  /**
   * Atomically increment numeric fields
   */
  async increment(
    id: string | Types.ObjectId,
    fields: Record<string, number>,
    session?: ClientSession,
  ): Promise<HydratedDocument<Entity> | null> {
    return this.transactionManager.withTransaction(session, async (session) => {
      return this.model.findByIdAndUpdate(
        id,
        { $inc: fields },
        { new: true, session },
      );
    });
  }

  /**
   * Force update an entity with direct MongoDB update operators.
   * Supports optimistic locking and discriminator models.
   */
  async forceUpdate(
    id: string | Types.ObjectId,
    update: Partial<Entity> & Record<string, unknown>,
    session?: ClientSession,
    options?: UpdateOptions,
  ): Promise<HydratedDocument<Entity> | null> {
    const entity = await this.model.findById(id).session(session ?? null);

    if (!entity) {
      return null;
    }

    const currentVersion = this.lockingService.extractVersion(
      entity,
      options?.skipVersionCheck,
    );
    const targetModel = this.resolveDiscriminatorModel(entity);

    const filter = this.lockingService.buildVersionedFilter(id, currentVersion);
    const updateObject = this.lockingService.buildVersionedUpdate(
      update as Record<string, unknown>,
      currentVersion,
    );

    const result = await this.transactionManager.withTransaction(
      session,
      async (session) => {
        return targetModel
          .findOneAndUpdate(filter, updateObject, { new: true, session })
          .populate(this.populator);
      },
    );

    this.lockingService.assertNotStale(result, currentVersion, this.modelName);

    if (result) {
      this.entityEvents.emitUpdated(result._id, this.modelName);
    }

    return result;
  }

  async remove(
    id: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<HydratedDocument<Entity> | null> {
    return this.transactionManager.withTransaction(session, async (session) => {
      const deleted = await this.model.findByIdAndDelete(id, { session });

      if (deleted) {
        this.entityEvents.emitDeleted(deleted._id, this.modelName);
      }

      return deleted;
    });
  }

  /**
   * Resolve the correct model for discriminator-based inheritance
   */
  private resolveDiscriminatorModel(entity: Entity): Model<Entity> {
    if (!this.model.discriminators) {
      return this.model;
    }

    const discriminatorKey = this.model.schema.get(
      'discriminatorKey',
    ) as string;
    const rawValue = (entity as Record<string, unknown>)[discriminatorKey];
    const discriminatorValue =
      typeof rawValue === 'string' ? rawValue : undefined;

    if (discriminatorValue && this.model.discriminators[discriminatorValue]) {
      return this.model.discriminators[discriminatorValue] as Model<Entity>;
    }

    return this.model;
  }
}
