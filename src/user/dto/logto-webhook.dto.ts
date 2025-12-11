import {
  IsString,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogtoWebhookUserData {
  @ApiProperty({ description: 'Logto user ID' })
  @IsString()
  id: string;

  [key: string]: unknown;
}

export class LogtoWebhookPayload {
  @ApiProperty({ description: 'Webhook hook ID' })
  @IsString()
  hookId: string;

  @ApiProperty({ description: 'Event type (e.g., User.Created, PostSignIn)' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Event creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiPropertyOptional({ description: 'User data from the event' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LogtoWebhookUserData)
  data?: LogtoWebhookUserData;

  @ApiPropertyOptional({ description: 'User object for sign-in events' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LogtoWebhookUserData)
  user?: LogtoWebhookUserData;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
