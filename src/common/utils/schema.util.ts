import { SchemaFactory } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { CreateSchemaOptions } from '../types/schema.types';

export type { CreateSchemaOptions, SchemaIndex } from '../types/schema.types';

/**
 * Creates a Mongoose schema from a class with common configurations
 *
 * @param entityClass - The entity class decorated with @Schema()
 * @param options - Schema creation options
 * @returns The configured Mongoose schema
 *
 * @example
 * ```typescript
 * // Basic usage:
 * export const UserSchema = createSchema(User);
 *
 * // Without text index:
 * export const UserSchema = createSchema(User, { textIndex: false });
 *
 * // With custom indices:
 * export const UserSchema = createSchema(User, {
 *   indices: [
 *     { fields: { email: 1 }, options: { unique: true } },
 *     { fields: { createdAt: -1 } },
 *   ],
 * });
 * ```
 */
export function createSchema<T>(
  entityClass: new (...args: unknown[]) => T,
  options: CreateSchemaOptions = {},
): Schema<T> {
  const { textIndex = true, indices = [] } = options;

  const schema = SchemaFactory.createForClass(entityClass) as Schema<T>;

  if (textIndex) {
    schema.index({ '$**': 'text' });
  }

  for (const { fields, options: indexOptions } of indices) {
    schema.index(fields, indexOptions);
  }

  return schema;
}
