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
