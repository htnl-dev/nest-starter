import { PickType } from '@nestjs/mapped-types';
import { AbstractCreateDto } from './create-crud.dto';

export class AbstractUpdateDto extends PickType(AbstractCreateDto, [
  'description',
  'metadata',
]) {}
