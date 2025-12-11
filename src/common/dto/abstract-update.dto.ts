import { PickType } from '@nestjs/mapped-types';
import { AbstractCreateDto } from './abstract-create.dto';

export class AbstractUpdateDto extends PickType(AbstractCreateDto, [
  'description',
  'metadata',
]) {}
