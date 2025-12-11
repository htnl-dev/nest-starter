import { SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema } from 'mongoose';

/**
 * Generic document type helper for Mongoose entities
 */
export type Document<T> = HydratedDocument<T>;

export interface CreateSchemaOptions {
  /**
   * Add a wildcard text index on all string fields for full-text search
   * @default true
   */
  textIndex?: boolean;
}

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
 * export type UserDocument = Document<User>;
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
