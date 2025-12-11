import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';
import { MongoServerError } from 'mongodb';
import {
  MongoErrorCode,
  DuplicateKeyException,
  WriteConflictException,
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

  /**
   * Start a new session without a transaction (useful for read operations)
   */
  async startSession(): Promise<ClientSession> {
    return this.connection.startSession();
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
      localSession.startTransaction();
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

      if (isTransactionOwner && retriesLeft > 0 && this.isTransientError(e)) {
        shouldEndSession = false;
        await localSession.endSession();
        await this.delay(
          this.baseRetryDelayMs * (this.maxRetries - retriesLeft + 1),
        );
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
        return error;
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

  private isTransientError(error: unknown): boolean {
    if (!(error instanceof MongoServerError)) {
      return false;
    }

    if (error.code === MongoErrorCode.WRITE_CONFLICT) {
      return true;
    }

    if (error.errorLabels?.includes('TransientTransactionError')) {
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
