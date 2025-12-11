import {
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import type { FilterQuery } from 'mongoose';

/**
 * Dangerous MongoDB operators that should not be allowed from user input
 */
const DANGEROUS_OPERATORS = [
  '$where',
  '$expr',
  '$function',
  '$accumulator',
  '$jsonSchema',
];

/**
 * Sanitize user input to remove dangerous MongoDB operators
 */
function sanitizeFilters(obj: unknown): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) {
    return {};
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (DANGEROUS_OPERATORS.includes(key)) {
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeFilters(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export class QueryDto<TDocument = unknown> {
  @ApiProperty({
    description: 'Search text to find in entity fields (performs text search)',
    example: 'search term',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    description: 'Sort field and order (e.g., "createdAt:desc", "name:asc")',
    example: 'createdAt:desc',
    required: false,
  })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiProperty({
    description: 'Fields to select (comma-separated)',
    example: 'name,description,createdAt',
    required: false,
  })
  @IsString()
  @IsOptional()
  select?: string;

  @ApiProperty({
    description: 'Filter by creation date (after this date)',
    example: '2024-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  createdAfter?: string;

  @ApiProperty({
    description: 'Filter by creation date (before this date)',
    example: '2024-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  createdBefore?: string;

  @ApiProperty({
    description: 'Filter object for querying (dangerous operators are stripped)',
    example: { status: 'active' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  @Transform(({ value }: { value: unknown }): Record<string, unknown> => {
    if (typeof value === 'string') {
      try {
        return sanitizeFilters(JSON.parse(value));
      } catch {
        return {};
      }
    }
    return sanitizeFilters(value);
  })
  filters?: Record<string, unknown>;

  /**
   * Internal use only - preset MongoDB query from code
   * Not exposed via API, not sanitized
   */
  mongoQuery?: FilterQuery<TDocument>;
}
