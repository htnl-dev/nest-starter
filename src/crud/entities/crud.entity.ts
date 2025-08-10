import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export abstract class CrudEntity {
  // TODO: Add user to the entity
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user: Types.ObjectId;

  @Prop()
  name?: string;

  @Prop()
  description?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}
