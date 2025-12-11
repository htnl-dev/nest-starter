import { FilterQuery } from 'mongoose';

/**
 * Result of building a MongoDB query from QueryDto
 */
export interface QueryBuildResult<TDocument> {
  mongoQuery: FilterQuery<TDocument>;
  sortOptions: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}

/**
 * Pagination metadata returned with paginated queries
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
