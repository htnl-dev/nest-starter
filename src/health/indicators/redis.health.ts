import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly redisUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    super();
    this.redisUrl = this.configService.get<string>('REDIS_URL');
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.redisUrl) {
      return this.getStatus(key, true, { status: 'not_configured' });
    }

    let client: Redis | null = null;
    try {
      client = new Redis(this.redisUrl, {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
      });

      const pong = await client.ping();
      const isHealthy = pong === 'PONG';

      if (isHealthy) {
        return this.getStatus(key, true, { status: 'connected' });
      }

      throw new HealthCheckError(
        'Redis ping failed',
        this.getStatus(key, false, { status: 'ping_failed' }),
      );
    } catch (error) {
      throw new HealthCheckError(
        'Redis connection failed',
        this.getStatus(key, false, {
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    } finally {
      if (client) {
        await client.quit().catch(() => {});
      }
    }
  }
}
