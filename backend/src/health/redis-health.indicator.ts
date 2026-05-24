import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    super();
  }

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(this.config.get<string>('redis.url') ?? 'redis://localhost:6379', {
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 3000,
        commandTimeout: 3000,
        maxRetriesPerRequest: 0,
      });
    }
    return this.client;
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.getClient();
      await client.ping();
      return this.getStatus(key, true);
    } catch (error) {
      const result = this.getStatus(key, false, { message: (error as Error).message });
      throw new HealthCheckError('Redis check failed', result);
    }
  }
}
