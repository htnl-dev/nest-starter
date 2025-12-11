import { ConflictException, BadRequestException } from '@nestjs/common';

/**
 * MongoDB error codes
 */
export const MongoErrorCode = {
  DUPLICATE_KEY: 11000,
  WRITE_CONFLICT: 112,
  DOCUMENT_VALIDATION_FAILURE: 121,
  EXCEEDED_TIME_LIMIT: 50,
  NETWORK_TIMEOUT: 89,
  CURSOR_NOT_FOUND: 43,
} as const;

/**
 * Thrown when a unique constraint is violated (duplicate key)
 */
export class DuplicateKeyException extends ConflictException {
  constructor(
    public readonly field?: string,
    message = 'Resource already exists',
  ) {
    super(message);
  }
}

/**
 * Thrown when a write conflict occurs during a transaction
 */
export class WriteConflictException extends ConflictException {
  constructor(message = 'Write conflict occurred, please retry') {
    super(message);
  }
}

/**
 * Thrown when document validation fails
 */
export class DocumentValidationException extends BadRequestException {
  constructor(
    public readonly validationErrors?: Record<string, unknown>,
    message = 'Document validation failed',
  ) {
    super(message);
  }
}

/**
 * Thrown when a query exceeds the time limit
 */
export class QueryTimeoutException extends ConflictException {
  constructor(message = 'Query exceeded time limit') {
    super(message);
  }
}
