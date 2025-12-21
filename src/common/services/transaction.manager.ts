import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';
import { MongoServerError } from 'mongodb';
import {
  MongoErrorCode,
  DuplicateKeyException,
  WriteConflictException,
  TransientTransactionException,
  DocumentValidationException,
  QueryTimeoutException,
} from '../errors/mongodb.errors';

@Injectable()
export class TransactionManager {
  private readonly logger = new Logger(TransactionManager.name);
  private readonly maxRetries = 3;
  private readonly baseRetryDelayMs = 20;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Execute a function within a MongoDB transaction.
   * Automatically retries on transient errors (WriteConflict, TransientTransactionError).
   */
  async withTransaction<R>(
    session: ClientSession | undefined,
    fn: (session: ClientSession) => Promise<R>,
  ): Promise<R> {
    return this.executeWithRetry(session, fn, this.maxRetries);
  }

  private async executeWithRetry<R>(
    session: ClientSession | undefined,
    fn: (session: ClientSession) => Promise<R>,
    retriesLeft: number,
  ): Promise<R> {
    const localSession = session ?? (await this.connection.startSession());
    const isTransactionOwner = !session;
    let shouldEndSession = isTransactionOwner;

    if (isTransactionOwner) {
      localSession.startTransaction({
        readPreference: 'primary',
      });
    }

    try {
      const result = await fn(localSession);
      if (isTransactionOwner) {
        await localSession.commitTransaction();
      }
      return result;
    } catch (e) {
      const error = this.transformError(e);

      if (isTransactionOwner) {
        await localSession.abortTransaction();
      }

      if (
        isTransactionOwner &&
        retriesLeft > 0 &&
        this.isTransientError(error)
      ) {
        const attempt = this.maxRetries - retriesLeft + 1;
        const delayMs = this.baseRetryDelayMs * attempt;
        this.logger.warn(
          `Transient error, retrying transaction (attempt ${attempt}/${this.maxRetries}, delay ${delayMs}ms)`,
        );
        shouldEndSession = false;
        await localSession.endSession();
        await this.delay(delayMs);
        return this.executeWithRetry(undefined, fn, retriesLeft - 1);
      }

      if (retriesLeft === 0 && isTransactionOwner) {
        this.logger.error('Transaction failed after all retries', error);
      }

      throw error;
    } finally {
      if (shouldEndSession) {
        await localSession.endSession();
      }
    }
  }

  private transformError(error: unknown): Error {
    if (!(error instanceof MongoServerError)) {
      return error as Error;
    }

    if (error.errorLabels?.includes('TransientTransactionError')) {
      return new TransientTransactionException();
    }

    switch (error.code) {
      case MongoErrorCode.DUPLICATE_KEY:
        return new DuplicateKeyException(
          this.extractDuplicateKeyField(error),
          'Resource already exists',
        );
      case MongoErrorCode.WRITE_CONFLICT:
        return new WriteConflictException();
      case MongoErrorCode.DOCUMENT_VALIDATION_FAILURE:
        return new DocumentValidationException(
          error.errInfo as Record<string, unknown>,
        );
      case MongoErrorCode.EXCEEDED_TIME_LIMIT:
        return new QueryTimeoutException();
      default:
        this.logger.error('Unhandled MongoDB error', error);
        return new InternalServerErrorException(
          'An unexpected database error occurred',
        );
    }
  }

  private extractDuplicateKeyField(
    error: MongoServerError,
  ): string | undefined {
    const keyPattern = error.keyPattern as Record<string, unknown> | undefined;
    if (keyPattern) {
      return Object.keys(keyPattern)[0];
    }
    return undefined;
  }

  private isTransientError(error: Error): boolean {
    return (
      error instanceof WriteConflictException ||
      error instanceof TransientTransactionException
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
