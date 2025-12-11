import { IndexDefinition, IndexOptions } from 'mongoose';

/**
 * Custom index definition for schema creation
 */
export interface SchemaIndex {
  fields: IndexDefinition;
  options?: IndexOptions;
}

/**
 * Options for schema creation
 */
export interface CreateSchemaOptions {
  /**
   * Add a wildcard text index on all string fields for full-text search
   * @default true
   */
  textIndex?: boolean;

  /**
   * Additional indices to create on the schema
   */
  indices?: SchemaIndex[];
}
