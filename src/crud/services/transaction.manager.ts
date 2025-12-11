import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';
import { MongoServerError } from 'mongodb';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 20;

@Injectable()
export class TransactionManager {
  private readonly logger = new Logger(TransactionManager.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Execute a function within a MongoDB transaction.
   * Automatically retries on transient errors (WriteConflict, TransientTransactionError).
   */
  async withTransaction<R>(
    session: ClientSession | undefined,
    fn: (session: ClientSession) => Promise<R>,
  ): Promise<R> {
    return this.executeWithRetry(session, fn, MAX_RETRIES);
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
        await this.delay(BASE_RETRY_DELAY_MS * (MAX_RETRIES - retriesLeft + 1));
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
    if (error instanceof MongoServerError && error.code === 11000) {
      return new ConflictException('Resource already exists');
    }
    return error as Error;
  }

  private isTransientError(error: unknown): boolean {
    if (!(error instanceof MongoServerError)) {
      return false;
    }

    // WriteConflict error
    if (error.code === 112) {
      return true;
    }

    // TransientTransactionError label
    if (error.errorLabels?.includes('TransientTransactionError')) {
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
