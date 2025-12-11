import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateCrudDto as AbstractCreateDto } from '../dto/create-crud.dto';
import { UpdateCrudDto as AbstractUpdateDto } from '../dto/update-crud.dto';
import { QueryDto } from '../dto/crud-query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { CrudEntity, GenericCrudDocument } from '../entities/crud.entity';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  type ClientSession,
  Connection,
  isValidObjectId,
  Model,
  Types,
  PopulateOptions,
  HydratedDocument,
  SortOrder,
  FilterQuery,
  QueryWithHelpers,
} from 'mongoose';
import { MongoServerError } from 'mongodb';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { CurrentUser } from '../types/current-user.type';

@Injectable()
export abstract class AbstractCrudService<
  Entity extends GenericCrudDocument,
  CreateDto extends object = AbstractCreateDto,
  UpdateDto extends object = AbstractUpdateDto,
> implements OnApplicationShutdown
{
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectConnection() protected readonly connection: Connection,
    @InjectModel(CrudEntity.name) protected readonly model: Model<Entity>,
    protected readonly eventEmitter?: EventEmitter2,
    protected readonly schedulerRegistry?: SchedulerRegistry,
  ) {}

  onApplicationShutdown(signal?: string) {
    this.logger.log(
      `${this.constructor.name} shutting down on signal: ${signal}`,
    );
    if (this.schedulerRegistry) {
      this.logger.log(`Stopping ${this.constructor.name} scheduled jobs`);
      this.schedulerRegistry.getCronJobs().forEach((job) => {
        void job.stop();
      });
      this.logger.log(`${this.constructor.name} scheduled jobs stopped`);
    }

    this.logger.log(`${this.constructor.name} shutdown complete`);
  }

  get populator(): Array<string | PopulateOptions> {
    return [
      {
        path: 'user',
        select: 'firstName lastName email',
      },
    ];
  }

  /**
   * Define which fields should be included in Server-Sent Events (SSE) updates.
   * Override in child services to specify the most important fields for real-time updates.
   */
  get sseFields(): string[] {
    return ['name'];
  }

  protected async withSession<R>(
    session: ClientSession | undefined,
    fn: (session: ClientSession) => Promise<R>,
    expectedExceptions: (new (...args: unknown[]) => Error)[] = [
      InternalServerErrorException,
      ConflictException,
      BadRequestException,
    ],
    retries: number = 3,
  ): Promise<R> {
    const localSession = session ?? (await this.connection.startSession());
    const isTransactionOwner = !session;
    let isRetrying = false;

    if (isTransactionOwner) {
      localSession.startTransaction();
    }

    try {
      const result = await fn(localSession);
      if (isTransactionOwner) {
        await localSession.commitTransaction();
      }
      return result;
    } catch (e: unknown) {
      // Check for MongoDB duplicate key error (E11000)
      const isDuplicateKeyError =
        e instanceof MongoServerError && e.code === 11000;

      let error: unknown = e;
      if (isDuplicateKeyError) {
        error = new ConflictException(`${this.model.modelName} already exists`);
      }

      if (isTransactionOwner) {
        await localSession.abortTransaction();
      }

      if (retries === 0 && isTransactionOwner) {
        this.logger.error('Transaction failed after all retries', error);
        throw error;
      }

      if (
        [...expectedExceptions, NotFoundException, ConflictException].some(
          (Exception) => error instanceof Exception,
        )
      ) {
        throw error;
      }

      if (isTransactionOwner) {
        isRetrying = true;
        await new Promise((resolve) =>
          setTimeout(resolve, 20 * (3 - retries + 1)),
        );

        return this.withSession(session, fn, expectedExceptions, retries - 1);
      } else {
        throw error;
      }
    } finally {
      if (isTransactionOwner && !isRetrying) {
        await localSession.endSession();
      }
    }
  }

  async create(
    createCrudDto: CreateDto,
    user?: CurrentUser,
    session?: ClientSession,
  ) {
    return this.withSession(session, async (session) => {
      const entity = new this.model({
        ...createCrudDto,
        ...(user && { user: user._id }),
      });
      return entity
        .save({ session })
        .then((savedEntity) => savedEntity.populate(this.populator));
    });
  }

  async findAll(
    query: QueryDto,
    session?: ClientSession,
  ): Promise<PaginatedResponseDto<HydratedDocument<Entity>>> {
    return this.withSession(session, async (session) => {
      const {
        search,
        page = 1,
        limit = 10,
        sort = 'createdAt:desc',
        createdAfter,
        createdBefore,
        filters,
        select,
        mongoQuery = {},
      } = query;

      const filterQuery: FilterQuery<Entity> = { ...mongoQuery };

      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined) {
            (filterQuery as Record<string, unknown>)[key] = value;
          }
        }
      }

      for (const [key, value] of Object.entries(filterQuery)) {
        if (isValidObjectId(value)) {
          (filterQuery as Record<string, unknown>)[key] = {
            $in: [new Types.ObjectId(value as string), value as string],
          };
        }
      }

      // Handle text search if search parameter is provided
      if (search) {
        if (filterQuery.$or) {
          (filterQuery.$or as unknown[]).push({ $text: { $search: search } });
        } else {
          filterQuery.$text = { $search: search };
        }
      }

      if (createdAfter) {
        const existingCreatedAt =
          ((filterQuery as Record<string, unknown>).createdAt as Record<
            string,
            unknown
          >) ?? {};
        (filterQuery as Record<string, unknown>).createdAt = {
          ...existingCreatedAt,
          $gte: new Date(createdAfter),
        };
      }
      if (createdBefore) {
        const existingCreatedAt =
          ((filterQuery as Record<string, unknown>).createdAt as Record<
            string,
            unknown
          >) ?? {};
        (filterQuery as Record<string, unknown>).createdAt = {
          ...existingCreatedAt,
          $lte: new Date(createdBefore),
        };
      }

      // Build query
      let queryBuilder: QueryWithHelpers<
        HydratedDocument<Entity>[],
        HydratedDocument<Entity>
      > = this.model.find(filterQuery).session(session);

      // Apply select before populate to avoid conflicts
      if (select && select.length > 0) {
        queryBuilder = queryBuilder.select(select.join(' '));
      } else {
        queryBuilder = queryBuilder.populate(this.populator);
      }

      // Handle sorting
      if (sort) {
        const sortObj: Record<string, SortOrder> = {};
        const sortFields = sort.split(',');

        for (const field of sortFields) {
          const [key, order] = field.trim().split(':');
          sortObj[key] = order === 'desc' ? -1 : 1;
        }

        queryBuilder = queryBuilder.sort(sortObj);
      }

      // Handle pagination
      let skipValue = 0;
      let limitValue = 10;
      if (page && limit) {
        skipValue = (page - 1) * limit;
        limitValue = limit;
      } else if (limit) {
        limitValue = limit;
      }

      // Get total count for pagination metadata
      const totalCount = await this.model
        .countDocuments(filterQuery)
        .session(session);

      // Apply pagination
      const results = await queryBuilder.skip(skipValue).limit(limitValue);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limitValue);
      const currentPage = page || 1;

      return {
        data: results,
        pagination: {
          total: totalCount,
          page: currentPage,
          limit: limitValue,
          totalPages,
        },
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
  ) {
    return this.withSession(session, async (session) => {
      let query: QueryWithHelpers<
        HydratedDocument<Entity> | null,
        HydratedDocument<Entity>
      > = this.model.findById(id).session(session);

      // Apply custom select if provided
      if (options?.select) {
        const selectStr = Array.isArray(options.select)
          ? options.select.join(' ')
          : options.select;
        query = query.select(selectStr);
      }

      // Apply custom populate if provided, otherwise use default populator
      if (options?.populate) {
        const populateOptions = Array.isArray(options.populate)
          ? options.populate
          : [options.populate];
        query = query.populate(populateOptions);
      } else {
        query = query.populate(this.populator);
      }

      const item = await query;
      if (!item) {
        throw new NotFoundException(`${this.model.modelName} not found`);
      }

      return item;
    });
  }

  getUpdate(id: string | Types.ObjectId) {
    return this.model.findById(id).select(this.sseFields.join(' '));
  }

  /**
   * Update an entity with optimistic locking
   *
   * OPTIMISTIC LOCKING:
   * This method uses the __v field to prevent race conditions.
   * If the entity was modified by another process since it was read,
   * a ConflictException will be thrown and the caller should retry.
   *
   * To bypass optimistic locking (not recommended), pass { skipVersionCheck: true } in options.
   */
  async update(
    id: string | Types.ObjectId,
    updateCrudDto: UpdateDto,
    session?: ClientSession,
    options?: { skipVersionCheck?: boolean },
  ) {
    const currentEntity = await this.model
      .findById(id)
      .session(session ?? null);

    if (!currentEntity) {
      throw new NotFoundException(`${this.model.modelName} not found`);
    }

    const currentVersion = options?.skipVersionCheck
      ? undefined
      : currentEntity.__v;

    const result = await this.withSession(session, async (session) => {
      const filter: FilterQuery<Entity> = { _id: id } as FilterQuery<Entity>;
      if (currentVersion !== undefined) {
        (filter as Record<string, unknown>).__v = currentVersion;
      }

      const updateObject: Record<string, unknown> = {
        ...(updateCrudDto as Record<string, unknown>),
      };
      if (currentVersion !== undefined) {
        updateObject.$inc = { __v: 1 };
      }

      const updatedResult = await this.model
        .findOneAndUpdate(filter, updateObject, {
          new: true,
          session,
        })
        .populate(this.populator);

      if (!updatedResult && currentVersion !== undefined) {
        throw new ConflictException(
          `${this.model.modelName} was modified by another process. Please retry.`,
        );
      }

      if (!updatedResult) {
        throw new NotFoundException(`${this.model.modelName} not found`);
      }

      return updatedResult;
    });

    if (result && this.eventEmitter) {
      this.eventEmitter.emit(`entity.${String(result._id)}.updated`, {
        id: result._id,
      });
    }

    return result;
  }

  async increment(
    id: string | Types.ObjectId,
    fields: Record<string, number>,
    session?: ClientSession,
  ) {
    return this.withSession(session, async (session) => {
      return this.model.findByIdAndUpdate(
        id,
        { $inc: fields },
        { new: true, session },
      );
    });
  }

  /**
   * Force update an entity with optimistic locking
   *
   * OPTIMISTIC LOCKING:
   * This method automatically includes version checking to prevent race conditions.
   * If the entity was modified by another process since it was read, a ConflictException
   * will be thrown and the caller should retry the operation.
   *
   * To bypass optimistic locking (not recommended), pass { skipVersionCheck: true } in options.
   */
  async forceUpdate(
    id: string | Types.ObjectId,
    update: Partial<Entity> & Record<string, unknown>,
    session?: ClientSession,
    options?: { skipVersionCheck?: boolean },
  ) {
    let model = this.model;
    let currentVersion: number | undefined;

    const entity = await this.model.findById(id).session(session ?? null);

    if (!entity) {
      return null;
    }

    if (!options?.skipVersionCheck) {
      currentVersion = entity.__v;
    }

    // Handle discriminators
    if (this.model.discriminators) {
      const discriminatorKey = this.model.schema.get(
        'discriminatorKey',
      ) as string;
      const discriminatorValue = entity.get(discriminatorKey) as string;
      if (discriminatorValue && this.model.discriminators[discriminatorValue]) {
        model = this.model.discriminators[discriminatorValue] as Model<Entity>;
      }
    }

    const result = await this.withSession(session, async (session) => {
      const filter: FilterQuery<Entity> = { _id: id } as FilterQuery<Entity>;
      if (currentVersion !== undefined) {
        (filter as Record<string, unknown>).__v = currentVersion;
      }

      const updateObject: Record<string, unknown> = { ...update };
      const existingInc = updateObject.$inc as
        | Record<string, unknown>
        | undefined;
      if (currentVersion !== undefined && !existingInc?.__v) {
        updateObject.$inc = { ...existingInc, __v: 1 };
      }

      return model
        .findOneAndUpdate(filter, updateObject, {
          new: true,
          session,
        })
        .populate(this.populator);
    });

    if (!result && currentVersion !== undefined) {
      throw new ConflictException(
        `${this.model.modelName} was modified by another process. Please retry.`,
      );
    }

    if (result && this.eventEmitter) {
      this.eventEmitter.emit(`entity.${String(result._id)}.updated`, {
        id: result._id,
      });
    }

    return result;
  }

  async remove(id: string | Types.ObjectId, session?: ClientSession) {
    return this.withSession(session, async (session) => {
      return this.model.findByIdAndDelete(id, { session });
    });
  }
}
