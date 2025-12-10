import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateAuditableStatusDto {
  @ApiProperty({
    description: 'The status to update to',
    example: 'active',
  })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiPropertyOptional({
    description: 'Description of the status change',
    example: 'User has been activated',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'User ID who made the change',
    example: 'user_abc123xyz',
  })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
