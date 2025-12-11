import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Email address of the user (must be unique)',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Logto user ID (external identity provider ID)',
    example: 'usr_abc123xyz',
  })
  @IsString()
  logtoId: string;

  @ApiPropertyOptional({
    description: 'Whether the user has admin privileges',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;
}
