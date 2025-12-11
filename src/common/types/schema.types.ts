import { HydratedDocument } from 'mongoose';

/**
 * Generic document type helper for Mongoose entities
 */
export type Document<T> = HydratedDocument<T>;

/**
 * Options for schema creation
 */
export interface CreateSchemaOptions {
  /**
   * Add a wildcard text index on all string fields for full-text search
   * @default true
   */
  textIndex?: boolean;
}
