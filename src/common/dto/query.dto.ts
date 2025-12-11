import {
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import type { FilterQuery } from 'mongoose';

type SelectableKeys<T> = Extract<keyof T, string>;

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
    description: 'Fields to select from the document',
    example: ['name', 'description', 'createdAt'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): string[] | undefined => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
    return undefined;
  })
  select?: SelectableKeys<TDocument>[];

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
    description: 'Filter by document fields',
    example: { status: 'active' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return value;
  })
  filters?: Partial<TDocument>;

  /**
   * Internal use only - preset MongoDB query from code
   * Not exposed via API
   */
  @ApiHideProperty()
  mongoQuery?: FilterQuery<TDocument>;
}
