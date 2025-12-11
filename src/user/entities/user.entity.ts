import { Prop, Schema } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AbstractEntity } from '../../common/entities/abstract.entity';
import { createSchema } from '../../common/utils/schema.util';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  _id: false,
})
export class User extends AbstractEntity {
  @Prop({ type: String, required: true, immutable: true })
  _id: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, index: true, unique: true })
  email: string;

  @Prop({ unique: true, required: true, index: true })
  logtoId: string;

  @Prop({ default: false })
  isAdmin: boolean;
}

export const UserSchema = createSchema(User);
