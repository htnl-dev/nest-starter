import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsObject } from 'class-validator';

export class LogtoCreateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsEmail()
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

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  profile?: {
    familyName?: string;
    givenName?: string;
    middleName?: string;
    nickname?: string;
    gender?: string;
    birthdate?: string;
    address?: {
      formatted?: string;
      streetAddress?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
      country?: string;
    };
  };
}
