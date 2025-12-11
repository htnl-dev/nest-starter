import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';
import { MongoServerError } from 'mongodb';

export interface TransactionOptions {
  expectedExceptions?: Array<new (...args: any[]) => Error>;
  retries?: number;
  retryDelayMs?: number;
}

@Injectable()
export class TransactionManager {
  private readonly logger = new Logger(TransactionManager.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Execute a function within a MongoDB transaction with automatic retry logic.
   *
   * @param session - Optional existing session to use (for nested transactions)
   * @param fn - The function to execute within the transaction
   * @param options - Transaction options including retry configuration
   * @returns The result of the function execution
   */
  async withTransaction<R>(
    session: ClientSession | undefined,
    fn: (session: ClientSession) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R> {
    const {
      expectedExceptions = [],
      retries = 3,
      retryDelayMs = 20,
    } = options ?? {};

    const localSession = session ?? (await this.connection.startSession());
    const isTransactionOwner = !session;
    let isRetrying = false;

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

      if (
        this.shouldThrowImmediately(
          error,
          expectedExceptions,
          retries,
          isTransactionOwner,
        )
      ) {
        throw error;
      }

      if (isTransactionOwner) {
        isRetrying = true;
        await this.delay(retryDelayMs * (4 - retries));
        return this.withTransaction(undefined, fn, {
          expectedExceptions,
          retries: retries - 1,
          retryDelayMs,
        });
      }

      throw error;
    } finally {
      if (isTransactionOwner && !isRetrying) {
        await localSession.endSession();
      }
    }
  }

  /**
   * Start a new session without a transaction (useful for read operations)
   */
  async startSession(): Promise<ClientSession> {
    return this.connection.startSession();
  }

  private transformError(error: unknown): Error {
    if (error instanceof MongoServerError && error.code === 11000) {
      return new ConflictException('Resource already exists');
    }
    return error as Error;
  }

  private shouldThrowImmediately(
    error: Error,
    expectedExceptions: Array<new (...args: any[]) => Error>,
    retries: number,
    isTransactionOwner: boolean,
  ): boolean {
    if (retries === 0 && isTransactionOwner) {
      this.logger.error('Transaction failed after all retries', error);
      return true;
    }

    const nonRetryableExceptions = [
      ...expectedExceptions,
      NotFoundException,
      ConflictException,
    ];

    return nonRetryableExceptions.some(
      (Exception) => error instanceof Exception,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
