import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CrudEntity } from './crud.entity';
import { FsmProcessingState } from '../enums/fsm.enums';

@Schema({
  _id: false,
  timestamps: true,
})
export class AuditState {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true, default: FsmProcessingState.START })
  step: string;

  @Prop({ required: true, default: 0 })
  iterations: number;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

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

  // Virtual property to get compacted audit trail
  auditTrail?: AuditState[];
}

export type GenericAuditableDocument = AuditableEntity & {
  _id: string | Types.ObjectId;
  __v: number;
};
