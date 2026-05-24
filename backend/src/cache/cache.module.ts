import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const disabled = config.get<boolean>('redis.disabled') ?? false;
        if (disabled) {
          // In-memory fallback — built-in memory adapter when no `store` is specified.
          return { ttl: 5 * 60 * 1000 };
        }
        const redisUrl = config.get<string>('redis.url') ?? 'redis://localhost:6379';
        // Cast to satisfy the narrowed type that registerAsync infers from the first branch.
        return {
          store: 'redis',
          url: redisUrl,
          ttl: 5 * 60 * 1000,
        } as never;
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
