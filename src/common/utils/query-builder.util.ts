import {
  ClientSession,
  FilterQuery,
  isValidObjectId,
  Model,
  PopulateOptions,
  Types,
} from 'mongoose';
import { QueryDto } from '../dto/query.dto';

export interface QueryBuildResult<TDocument> {
  mongoQuery: FilterQuery<TDocument>;
  sortOptions: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Build a complete MongoDB query from QueryDto parameters
 */
export function buildQuery<TDocument>(
  query: QueryDto<TDocument>,
): QueryBuildResult<TDocument> {
  const mongoQuery = buildMongoQuery(query);
  const sortOptions = buildSortOptions(query.sort);
  const { skip, limit } = buildPagination(query.page, query.limit);

  return { mongoQuery, sortOptions, skip, limit };
}

/**
 * Build the MongoDB filter query from various query parameters
 */
export function buildMongoQuery<TDocument>(
  query: QueryDto<TDocument>,
): FilterQuery<TDocument> {
  const {
    search,
    createdAfter,
    createdBefore,
    filters,
    mongoQuery = {},
  } = query;
  const result: FilterQuery<TDocument> = { ...mongoQuery };

  applyFilters(result, filters);
  convertObjectIdValues(result);
  applyTextSearch(result, search);
  applyDateFilters(result, createdAfter, createdBefore);

  return result;
}

/**
 * Execute a paginated query and return results with metadata
 */
export async function executePaginatedQuery<TDocument>(
  model: Model<TDocument>,
  queryResult: QueryBuildResult<TDocument>,
  session: ClientSession | null,
  options?: {
    select?: string[];
    populator?: Array<string | PopulateOptions>;
  },
): Promise<{ data: TDocument[]; pagination: PaginationMeta }> {
  const { mongoQuery, sortOptions, skip, limit } = queryResult;

  let queryBuilder = model.find(mongoQuery).session(session);

  if (options?.select && options.select.length > 0) {
    queryBuilder = queryBuilder.select(options.select.join(' '));
  } else if (options?.populator) {
    queryBuilder = queryBuilder.populate(options.populator);
  }

  queryBuilder = queryBuilder.sort(sortOptions).skip(skip).limit(limit);

  const [data, total] = await Promise.all([
    queryBuilder.exec(),
    model.countDocuments(mongoQuery).session(session),
  ]);

  return {
    data: data as TDocument[],
    pagination: {
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function applyFilters<TDocument>(
  mongoQuery: FilterQuery<TDocument>,
  filters?: Partial<TDocument>,
): void {
  if (!filters) return;

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) {
      (mongoQuery as Record<string, unknown>)[key] = value;
    }
  }
}

function convertObjectIdValues<TDocument>(
  mongoQuery: FilterQuery<TDocument>,
): void {
  for (const [key, value] of Object.entries(mongoQuery)) {
    if (typeof value === 'string' && isValidObjectId(value)) {
      (mongoQuery as Record<string, unknown>)[key] = {
        $in: [new Types.ObjectId(value), value],
      };
    }
  }
}

function applyTextSearch<TDocument>(
  mongoQuery: FilterQuery<TDocument>,
  search?: string,
): void {
  if (!search) return;

  const query = mongoQuery as Record<string, unknown>;
  if (query.$or) {
    (query.$or as unknown[]).push({ $text: { $search: search } });
  } else {
    query.$text = { $search: search };
  }
}

function applyDateFilters<TDocument>(
  mongoQuery: FilterQuery<TDocument>,
  createdAfter?: string,
  createdBefore?: string,
): void {
  if (!createdAfter && !createdBefore) return;

  const query = mongoQuery as Record<string, unknown>;
  const createdAt: Record<string, Date> =
    (query.createdAt as Record<string, Date>) ?? {};

  if (createdAfter) {
    createdAt.$gte = new Date(createdAfter);
  }
  if (createdBefore) {
    createdAt.$lte = new Date(createdBefore);
  }

  query.createdAt = createdAt;
}

function buildSortOptions(sort?: string): Record<string, 1 | -1> {
  if (!sort) {
    return { createdAt: -1 };
  }

  const sortObj: Record<string, 1 | -1> = {};
  const sortFields = sort.split(',');

  for (const field of sortFields) {
    const [key, order] = field.trim().split(':');
    sortObj[key] = order === 'desc' ? -1 : 1;
  }

  return sortObj;
}

function buildPagination(
  page?: number,
  limit?: number,
): { skip: number; limit: number } {
  const effectiveLimit = limit ?? 10;
  const effectivePage = page ?? 1;
  const skip = (effectivePage - 1) * effectiveLimit;

  return { skip, limit: effectiveLimit };
}
