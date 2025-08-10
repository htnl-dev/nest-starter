import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCrudDto as AbstractCreateDto } from '../dto/create-crud.dto';
import { UpdateCrudDto as AbstractUpdateDto } from '../dto/update-crud.dto';
import { QueryDto } from '../dto/crud-query.dto';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { CrudEntity } from '../entities/crud.entity';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Connection,
  isValidObjectId,
  Model,
  Types,
} from 'mongoose';

// TODO: Add user to the entity
type UserDocument = any;

@Injectable()
export class AbstractCrudService<
  Entity extends CrudEntity,
  CreateDto extends {} = AbstractCreateDto,
  UpdateDto extends {} = AbstractUpdateDto,
> {
  protected readonly logger = new Logger();

  constructor(
    @InjectConnection() protected readonly connection: Connection,
    @InjectModel(CrudEntity.name) protected readonly model: Model<Entity>,
  ) {}

  get populator(): string[] {
    return ['user'];
  }

  protected async withSession<R>(
    session: ClientSession | undefined,
    fn: (session: ClientSession) => Promise<R>,
    expectedExceptions: any[] = [InternalServerErrorException],
    retries: number = 3,
  ): Promise<R> {
    const localSession = session ?? (await this.connection.startSession());
    const isTransactionOwner = !session;
    let isRetrying = false;

    this.logger.log(
      isTransactionOwner ? 'Using local session' : 'Using global session',
    );

    if (isTransactionOwner) {
      localSession.startTransaction();
    }

    try {
      const result = await fn(localSession);
      if (isTransactionOwner) {
        this.logger.log('Committing transaction');
        await localSession.commitTransaction();
        this.logger.log('Transaction committed');
      }
      return result;
    } catch (error) {
      this.logger.error('An error occurred');
      this.logger.error(error);
      if (isTransactionOwner) {
        this.logger.error('Rolling back transaction');
        await localSession.abortTransaction();
        this.logger.error('Transaction rolled back successfully');
      }

      if (retries === 0) {
        this.logger.error('Transaction failed after all retries');
        throw error;
      }

      if (
        [...expectedExceptions, NotFoundException].some(
          (Exception) => error instanceof Exception,
        )
      ) {
        this.logger.error(
          'Transaction failed a known error was thrown! No retries to be made',
        );
        throw error;
      }

      this.logger.log(`Retrying transaction (${retries} attempts remaining)`);
      // Add a small delay before retrying to avoid immediate retry

      isRetrying = true;
      await new Promise((resolve) =>
        setTimeout(resolve, 20 * (3 - retries + 1)),
      );

      // Recursive call with decremented retry count
      return this.withSession(session, fn, expectedExceptions, retries - 1);
    } finally {
      if (isTransactionOwner && !isRetrying) {
        this.logger.log('Ending session');
        await localSession.endSession();
        this.logger.log('Session ended');
      }
    }
  }

  async create(
    createCrudDto: CreateDto,
    user?: UserDocument,
    session?: ClientSession,
  ) {
    return this.withSession(session, async (session) => {
      const entity = new this.model({
        ...createCrudDto,
        ...(user && { user: user._id }),
      });
      return entity
        .save({ session })
        .then((entity) => entity.populate(this.populator));
    });
  }

  async findAll(
    query: QueryDto,
    session?: ClientSession,
  ): Promise<PaginatedResponseDto<Entity>> {
    return this.withSession(session, async (session) => {
      const { search, page, limit, sort, ...queryParams } = query;

      let mongoQuery: any = { ...queryParams };

      for (const [key, value] of Object.entries(mongoQuery)) {
        if (isValidObjectId(value)) {
          mongoQuery[key] = new Types.ObjectId(value as string);
        }
      }
      // Handle text search if search parameter is provided
      if (search) {
        mongoQuery.$text = { $search: search };
      }

      // Build query
      let queryBuilder = this.model
        .find(mongoQuery)
        .populate(this.populator)
        .session(session);

      // Handle sorting
      if (sort) {
        const sortObj: any = {};
        const sortFields = sort.split(',');

        for (const field of sortFields) {
          const [key, order] = field.trim().split(':');
          sortObj[key] = order === 'desc' ? -1 : 1;
        }

        queryBuilder = queryBuilder.sort(sortObj);
      }

      // Handle pagination
      let skipValue = 0;
      let limitValue = 10; // default limit

      if (page && limit) {
        skipValue = (page - 1) * limit;
        limitValue = limit;
      } else if (limit) {
        limitValue = limit;
      }

      // Get total count for pagination metadata
      const totalCount = await this.model
        .countDocuments(mongoQuery)
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

  findOne(id: string | Types.ObjectId, session?: ClientSession) {
    return this.withSession(session, async (session) => {
      const item = await this.model.findById(id).populate(this.populator).session(session);
      if (!item) {
        throw new NotFoundException(`Item not found`);
      }
      return item;
    });
  }

  update(
    id: string | Types.ObjectId,
    updateCrudDto: UpdateDto,
    session?: ClientSession,
  ) {
    return this.withSession(session, async (session) => {
      return this.model.findByIdAndUpdate(id, updateCrudDto, {
        new: true,
        session,
      });
    });
  }


  increment(id: string | Types.ObjectId, fields: Record<string, number>, session?: ClientSession) {
    return this.withSession(session, async (session) => {
      return this.model.findByIdAndUpdate(id, { $inc: fields }, { new: true, session });
    });
  }

  forceUpdate(
    id: string | Types.ObjectId,
    update: Partial<Entity>,
    session?: ClientSession,
  ) {
    return this.withSession(session, async (session) => {
      return this.model.findByIdAndUpdate(id, update, {
        new: true,
        session,
      });
    });
  }

  remove(id: string | Types.ObjectId, session?: ClientSession) {
    return this.withSession(session, async (session) => {
      return this.model.findByIdAndDelete(id, { session });
    });
  }
}
