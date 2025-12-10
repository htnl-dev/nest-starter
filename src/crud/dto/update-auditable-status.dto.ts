import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { AuditableEntity } from '../entities/auditable.entity';
import { FsmProcessingState } from '../enums/fsm.enums';

export class UpdateAuditableStatusDto<
  T extends AuditableEntity = AuditableEntity,
> {
  @ApiProperty({
    description: 'The status to update to',
    example: 'active',
  })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({
    description: 'The description of the status update',
    example: 'User has been activated',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'The user who updated the status (logto ID)',
    example: 'user_abc123xyz',
  })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({
    description: 'The metadata of the status update',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Optional step name for FSM state tracking',
    example: FsmProcessingState.START,
  })
  @IsOptional()
  @IsString()
  step?: string;

  @ApiPropertyOptional({
    description: 'Optional iteration count for FSM state tracking',
    example: 0,
  })
  @IsOptional()
  iterations?: number;

  updates?: Partial<Omit<T, 'status' | 'stateTransitions'>>;
}

/**
 * Type alias for UpdateAuditableStatusDto used in state transitions
 */
export type UpdateStateDto<T extends AuditableEntity = AuditableEntity> =
  UpdateAuditableStatusDto<T>;
