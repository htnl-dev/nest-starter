import { Prop } from '@nestjs/mongoose';
import { CrudEntity } from './crud.entity';

export abstract class SlugCrudEntity extends CrudEntity {
  @Prop({ required: true, unique: true, index: true })
  slug: string;
}
