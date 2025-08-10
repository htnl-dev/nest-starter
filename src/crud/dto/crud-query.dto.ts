import {
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryDto {
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

  // Allow any additional properties for flexible querying
  
  [key: string]: any;

  @ApiProperty({
    description: 'Filter by metadata (partial match on object keys/values)',
    example: { key: 'value' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
