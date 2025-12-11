import { IsMongoId, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class AbstractCreateDto {
  @ApiProperty({
    description: 'The name of the entity',
    example: 'The isle of man',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the entity',
    example: 'This is a description of the entity',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description:
      'The user who created the entity. This is optional and will be set to the current authenticated user',
    example: new Types.ObjectId().toString(),
  })
  @IsMongoId()
  @IsOptional()
  user?: Types.ObjectId;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The metadata of the entity',
    example: {
      key: 'value',
    },
  })
  metadata?: Record<string, unknown>;
}
