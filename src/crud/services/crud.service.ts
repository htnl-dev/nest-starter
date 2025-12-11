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
import { AbstractCreateDto } from '../dto/create-crud.dto';
import { AbstractUpdateDto } from '../dto/update-crud.dto';
import { QueryDto } from '../dto/crud-query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { AbstractEntity, GenericDocument } from '../entities/crud.entity';
import { TransactionManager } from './transaction.manager';
import { buildQuery, executePaginatedQuery } from '../utils/query-builder.util';
import type { CurrentUser } from '../types/current-user.type';

@Injectable()
export abstract class AbstractService<
  Entity extends GenericDocument,
  CreateDto extends object = AbstractCreateDto,
  UpdateDto extends object = AbstractUpdateDto,
> implements OnApplicationShutdown
{
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectModel(AbstractEntity.name) protected readonly model: Model<Entity>,
    protected readonly transactionManager: TransactionManager,
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
   * Get the model name for error messages
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
      const queryResult = buildQuery(query);
      const { data, pagination } = await executePaginatedQuery(
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

  async update(
    id: string | Types.ObjectId,
    updateDto: UpdateDto,
    session?: ClientSession,
  ): Promise<HydratedDocument<Entity>> {
    return this.transactionManager.withTransaction(session, async (session) => {
      const updated = await this.model
        .findByIdAndUpdate(id, updateDto, { new: true, session })
        .populate(this.populator);

      if (!updated) {
        throw new NotFoundException(`${this.modelName} not found`);
      }

      return updated;
    });
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
   * Supports discriminator models.
   */
  async forceUpdate(
    id: string | Types.ObjectId,
    update: Partial<Entity> & Record<string, unknown>,
    session?: ClientSession,
  ): Promise<HydratedDocument<Entity> | null> {
    const entity = await this.model.findById(id).session(session ?? null);

    if (!entity) {
      return null;
    }

    const targetModel = this.resolveDiscriminatorModel(entity);

    return this.transactionManager.withTransaction(session, async (session) => {
      return targetModel
        .findByIdAndUpdate(id, update, { new: true, session })
        .populate(this.populator);
    });
  }

  async remove(
    id: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<HydratedDocument<Entity> | null> {
    return this.transactionManager.withTransaction(session, async (session) => {
      return this.model.findByIdAndDelete(id, { session });
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
