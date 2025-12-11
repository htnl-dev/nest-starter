import { Injectable, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';

export interface VersionedFilter {
  _id: string | Types.ObjectId;
  __v?: number;
}

export interface VersionedUpdate {
  $inc?: { __v: number } & Record<string, number>;
  [key: string]: unknown;
}

@Injectable()
export class OptimisticLockingService {
  /**
   * Build a filter that includes version checking for optimistic locking
   */
  buildVersionedFilter(
    id: string | Types.ObjectId,
    currentVersion?: number,
  ): VersionedFilter {
    const filter: VersionedFilter = { _id: id };
    if (currentVersion !== undefined) {
      filter.__v = currentVersion;
    }
    return filter;
  }

  /**
   * Build an update object that increments the version field
   */
  buildVersionedUpdate<T extends Record<string, unknown>>(
    update: T,
    currentVersion?: number,
  ): T & VersionedUpdate {
    if (currentVersion === undefined) {
      return update as T & VersionedUpdate;
    }

    const existingInc = (update.$inc as Record<string, number>) ?? {};

    return {
      ...update,
      $inc: { ...existingInc, __v: 1 },
    } as T & VersionedUpdate;
  }

  /**
   * Extract version from an entity for optimistic locking
   */
  extractVersion<T extends { __v?: number }>(
    entity: T,
    skipVersionCheck?: boolean,
  ): number | undefined {
    if (skipVersionCheck) {
      return undefined;
    }
    return entity.__v;
  }

  /**
   * Check if an update failed due to version mismatch and throw appropriate error
   */
  assertNotStale<T>(
    result: T | null,
    currentVersion: number | undefined,
    modelName: string,
  ): asserts result is T {
    if (!result && currentVersion !== undefined) {
      throw new ConflictException(
        `${modelName} was modified by another process. Please retry.`,
      );
    }
  }

  /**
   * Check if result is null due to version conflict
   */
  isVersionConflict<T>(result: T | null, currentVersion?: number): boolean {
    return result === null && currentVersion !== undefined;
  }
}
