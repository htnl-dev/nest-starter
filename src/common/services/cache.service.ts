import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheOptions } from '../types/cache.types';

export type { CacheOptions } from '../types/cache.types';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null = null;
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.defaultTtl = this.configService.get<number>('CACHE_TTL', 300); // 5 minutes default

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured. Caching is disabled. Set REDIS_URL to enable caching.',
      );
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected');
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis error', error);
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', error);
    }
  }

  get isEnabled(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache key: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.client) return;

    try {
      const ttl = options?.ttl ?? this.defaultTtl;
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key: ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.client) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache pattern: ${pattern}`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  buildKey(...parts: string[]): string {
    return parts.join(':');
  }
}
