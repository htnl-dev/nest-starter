import { SchemaFactory } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { CreateSchemaOptions } from '../types/schema.types';

export type { CreateSchemaOptions } from '../types/schema.types';

/**
 * Creates a Mongoose schema from a class with common configurations
 *
 * @param entityClass - The entity class decorated with @Schema()
 * @param options - Schema creation options
 * @returns The configured Mongoose schema
 *
 * @example
 * ```typescript
 * // In your entity file:
 * export type UserDocument = HydratedDocument<User>;
 * export const UserSchema = createSchema(User);
 *
 * // Without text index:
 * export const UserSchema = createSchema(User, { textIndex: false });
 * ```
 */
export function createSchema<T>(
  entityClass: new (...args: unknown[]) => T,
  options: CreateSchemaOptions = {},
): Schema<T> {
  const { textIndex = true } = options;

  const schema = SchemaFactory.createForClass(entityClass) as Schema<T>;

  if (textIndex) {
    schema.index({ '$**': 'text' });
  }

  return schema;
}
