import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsArray, IsNumber } from 'class-validator';

export class InviteUserDto {
  @ApiProperty()
  @IsEmail()
  invitee: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  organizationRoleIds?: string[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  expiresAt?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  messagePayload?: string;
}
