import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LogtoUserProfileDto } from './update-user.dto';

export class LogtoCreateUserDto {
  @ApiProperty({
    description: 'Unique username for the user',
    example: 'john_doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'Primary email address for the user',
    example: 'john@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  primaryEmail?: string;

  @ApiProperty({
    description: 'Primary phone number for the user',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  primaryPhone?: string;

  @ApiProperty({
    description: 'Display name of the user',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'URL to the user avatar image',
    example: 'https://example.com/avatar.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'Custom data associated with the user',
    example: { department: 'Engineering', employeeId: '12345' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  customData?: Record<string, unknown>;

  @ApiProperty({
    description: 'User profile information',
    type: LogtoUserProfileDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => LogtoUserProfileDto)
  @IsOptional()
  profile?: LogtoUserProfileDto;
}
