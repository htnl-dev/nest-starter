import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuditableEntity } from '../../crud/entities/auditable.entity';

export type UserDocument = HydratedDocument<User>;

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

@Schema({
  timestamps: true,
  _id: false,
})
export class User extends AuditableEntity {
  @Prop({ type: String, required: true, immutable: true })
  _id: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ nullable: true, type: String })
  middleName?: string;

  @Prop({ required: true })
  lastName: string;

  // Virtual property
  fullName?: string;

  @Prop({ nullable: true, type: String })
  avatar?: string;

  @Prop({ required: true, index: true, unique: true })
  username: string;

  @Prop({ required: true, index: true, unique: true })
  email: string;

  @Prop({ type: String, index: true, sparse: true })
  phoneNumber?: string;

  @Prop({ unique: true, required: true, index: true })
  logtoId: string;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ nullable: true })
  lastSignInAt?: Date;

  @Prop({
    type: String,
    required: true,
    default: UserStatus.ACTIVE,
    enum: Object.values(UserStatus),
  })
  declare status: UserStatus;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('fullName').get(function () {
  const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
  return parts.join(' ');
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

UserSchema.index({ '$**': 'text' });
