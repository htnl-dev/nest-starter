import { IsString } from 'class-validator';
import { CreateCrudDto } from './create-crud.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSlugAwareCrudDto extends CreateCrudDto {
  slug: string;
}
