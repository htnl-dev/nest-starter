import { Prop, Schema } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CrudEntityDocument = HydratedDocument<CrudEntity>;

/**
 * Generic document type that includes Mongoose version field for optimistic locking
 */
export type GenericCrudDocument = CrudEntity & { __v: number };

@Schema()
export abstract class CrudEntity {
  @Prop({ type: String, ref: 'User', required: false, index: true, sparse: true })
  user?: string;

  @Prop()
  name?: string;

  @Prop()
  description?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}
