import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LogtoAddressDto {
  @ApiProperty({
    description: 'Full formatted address',
    example: '123 Main St, City, State 12345, Country',
    required: false,
  })
  @IsString()
  @IsOptional()
  formatted?: string;

  @ApiProperty({
    description: 'Street address including house number',
    example: '123 Main Street',
    required: false,
  })
  @IsString()
  @IsOptional()
  streetAddress?: string;

  @ApiProperty({
    description: 'City or locality',
    example: 'San Francisco',
    required: false,
  })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiProperty({
    description: 'State, province, or region',
    example: 'California',
    required: false,
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({
    description: 'Postal or ZIP code',
    example: '94102',
    required: false,
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({
    description: 'Country name or code',
    example: 'United States',
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;
}

export class LogtoUserProfileDto {
  @ApiProperty({
    description: 'Family name (surname/last name)',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  familyName?: string;

  @ApiProperty({
    description: 'Given name (first name)',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  givenName?: string;

  @ApiProperty({
    description: 'Middle name',
    example: 'William',
    required: false,
  })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({
    description: 'Casual name or nickname',
    example: 'Johnny',
    required: false,
  })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({
    description: 'Gender identity',
    example: 'male',
    required: false,
  })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({
    description: 'Date of birth in ISO 8601 format',
    example: '1990-01-15',
    required: false,
  })
  @IsString()
  @IsOptional()
  birthdate?: string;

  @ApiProperty({
    description: 'Physical address information',
    type: LogtoAddressDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => LogtoAddressDto)
  @IsOptional()
  address?: LogtoAddressDto;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'Unique username for the user',
    example: 'john_doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'Primary email address',
    example: 'john@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  primaryEmail?: string;

  @ApiProperty({
    description: 'Primary phone number',
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

  @ApiProperty({
    description: 'Whether the user account is suspended',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isSuspended?: boolean;
}
