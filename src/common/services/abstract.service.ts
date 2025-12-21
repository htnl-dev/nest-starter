import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  type ClientSession,
  HydratedDocument,
  Model,
  Types,
  PopulateOptions,
  PipelineStage,
} from 'mongoose';

/**
 * Extended populate options that includes collection name for $lookup.
 * Unlike Mongoose populate, collection name is required for aggregation.
 */
export interface LookupPopulateOptions
  extends Omit<PopulateOptions, 'populate'> {
  /** MongoDB collection name for $lookup (e.g., 'users', 'currencies') - REQUIRED */
  collection: string;
  /** Nested populate options */
  populate?: LookupPopulateOptions | LookupPopulateOptions[] | string;
}
import { SchedulerRegistry } from '@nestjs/schedule';
import { AbstractCreateDto } from '../dto/abstract-create.dto';
import { AbstractUpdateDto } from '../dto/abstract-update.dto';
import { QueryDto } from '../dto/query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { AbstractEntity, GenericDocument } from '../entities/abstract.entity';
import { TransactionManager } from './transaction.manager';
import { buildQuery } from '../utils/query-builder.util';
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
   * Define relationships to populate on queries using $lookup aggregation.
   * Override in child services to customize population.
   * Collection name is required for each population path.
   */
  get populator(): LookupPopulateOptions[] {
    return [
      { path: 'user', collection: 'users', select: 'firstName lastName email' },
    ];
  }

  /**
   * Get the model name for error messages
   */
  protected get modelName(): string {
    return this.model.modelName;
  }

  /**
   * Convert populator config to MongoDB $lookup aggregation stages.
   * More efficient than Mongoose populate as it runs in a single query.
   */
  protected buildLookupPipeline(): PipelineStage[] {
    const pipeline: PipelineStage[] = [];

    for (const pop of this.populator) {
      const path = pop.path;
      const collection = pop.collection;
      const select = pop.select as string | undefined;

      if (select) {
        const projection = this.parseSelectToProjection(select);
        pipeline.push({
          $lookup: {
            from: collection,
            let: { localId: `$${path}` },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$localId'] } } },
              { $project: projection },
            ],
            as: path,
          },
        });
      } else {
        pipeline.push({
          $lookup: {
            from: collection,
            localField: path,
            foreignField: '_id',
            as: path,
          },
        });
      }

      pipeline.push({
        $unwind: {
          path: `$${path}`,
          preserveNullAndEmptyArrays: true,
        },
      });
    }

    return pipeline;
  }

  /**
   * Parse Mongoose-style select string into MongoDB projection object.
   */
  private parseSelectToProjection(
    select: string,
  ): Record<string, 0 | 1 | boolean> {
    const fields = select.split(/\s+/).filter(Boolean);
    const projection: Record<string, 0 | 1 | boolean> = {};

    for (const field of fields) {
      if (field.startsWith('-')) {
        projection[field.slice(1)] = 0;
      } else {
        projection[field] = 1;
      }
    }

    return projection;
  }

  /**
   * Build pipeline stages for computed virtuals.
   * Override in subclasses to add $addFields stages.
   */
  protected buildVirtualsPipeline(): PipelineStage[] {
    return [];
  }

  /**
   * Find one entity using aggregation with $lookup instead of populate.
   * More efficient for complex populates as it runs in a single query.
   */
  async findOneWithLookup(
    id: string | Types.ObjectId,
    session?: ClientSession,
    options?: { select?: string },
  ): Promise<Entity | null> {
    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(id.toString()) } },
      ...this.buildLookupPipeline(),
      ...this.buildVirtualsPipeline(),
    ];

    if (options?.select) {
      const fields = options.select.split(' ').filter(Boolean);
      const projection: Record<string, 1> = {};
      for (const field of fields) {
        projection[field] = 1;
      }
      pipeline.push({ $project: projection } as PipelineStage);
    }

    const results = await this.model
      .aggregate(pipeline)
      .session(session ?? null);

    return (results[0] as Entity) ?? null;
  }

  async create(
    createDto: CreateDto,
    user?: CurrentUser,
    session?: ClientSession,
  ): Promise<Entity> {
    return this.transactionManager.withTransaction(session, async (session) => {
      const entity = new this.model({
        ...createDto,
        ...(user && { user: user._id }),
      });

      const saved = await entity.save({ session });
      const populated = await this.findOneWithLookup(saved._id, session);
      return populated ?? (saved as unknown as Entity);
    });
  }

  async findMany(
    query: QueryDto<Entity>,
    currentUser?: CurrentUser,
    session?: ClientSession,
  ): Promise<PaginatedResponseDto<Entity>> {
    return this.transactionManager.withTransaction(session, async (session) => {
      const { mongoQuery, sortOptions, skip, limit } = buildQuery(query);

      const pipeline: PipelineStage[] = [
        { $match: mongoQuery as Record<string, unknown> },
        ...this.buildLookupPipeline(),
        ...this.buildVirtualsPipeline(),
      ];

      if (query.select) {
        const fields = Array.isArray(query.select)
          ? query.select
          : (query.select as string).split(' ').filter(Boolean);
        const projection: Record<string, 1> = {};
        for (const field of fields) {
          projection[field] = 1;
        }
        pipeline.push({ $project: projection } as PipelineStage);
      }

      pipeline.push({ $sort: sortOptions } as PipelineStage);
      pipeline.push({ $skip: skip } as PipelineStage);
      pipeline.push({ $limit: limit } as PipelineStage);

      const [data, total] = await Promise.all([
        this.model.aggregate(pipeline).session(session),
        this.model.countDocuments(mongoQuery).session(session),
      ]);

      return {
        data: data as Entity[],
        pagination: {
          total,
          page: Math.floor(skip / limit) + 1,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  async findOne(
    id: string | Types.ObjectId,
    currentUser?: CurrentUser,
    session?: ClientSession,
    options?: {
      select?: string | string[];
    },
  ): Promise<Entity> {
    return this.transactionManager.withTransaction(session, async (session) => {
      const selectStr = options?.select
        ? Array.isArray(options.select)
          ? options.select.join(' ')
          : options.select
        : undefined;

      const result = await this.findOneWithLookup(id, session, {
        select: selectStr,
      });

      if (!result) {
        throw new NotFoundException(`${this.modelName} not found`);
      }

      return result;
    });
  }

  async update(
    id: string | Types.ObjectId,
    updateDto: UpdateDto,
    currentUser?: CurrentUser,
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
    currentUser?: CurrentUser,
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
    currentUser?: CurrentUser,
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
    currentUser?: CurrentUser,
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
