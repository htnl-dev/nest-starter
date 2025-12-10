import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class LogtoAddressDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  formatted?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  streetAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  country?: string;
}

export class LogtoUserProfileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  familyName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  givenName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  birthdate?: string;

  @ApiProperty({ required: false, type: LogtoAddressDto })
  @IsObject()
  @IsOptional()
  address?: LogtoAddressDto;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  primaryEmail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  primaryPhone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  customData?: Record<string, any>;

  @ApiProperty({ required: false, type: LogtoUserProfileDto })
  @IsObject()
  @IsOptional()
  profile?: LogtoUserProfileDto;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isSuspended?: boolean;
}
