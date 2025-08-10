import { PickType } from '@nestjs/mapped-types';
import { CreateCrudDto } from './create-crud.dto';

export class UpdateCrudDto extends PickType(CreateCrudDto, [
  'description',
  'metadata',
]) {}
