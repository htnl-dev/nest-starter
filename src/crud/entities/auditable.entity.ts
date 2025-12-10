import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CrudEntity } from './crud.entity';

@Schema({ _id: false, timestamps: true })
export class AuditState {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;

  @Prop({ type: String, ref: 'User', required: false })
  user?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditStateSchema = SchemaFactory.createForClass(AuditState);

@Schema()
export abstract class AuditableEntity extends CrudEntity {
  @Prop({ required: true })
  status: string;

  @Prop({ type: [AuditStateSchema], default: [] })
  stateTransitions: AuditState[];
}

export type GenericAuditableDocument = AuditableEntity & {
  _id: string | Types.ObjectId;
  __v: number;
};
