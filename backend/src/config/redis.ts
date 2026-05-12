import Redis from 'ioredis';
import { env } from '@/config/env';

const redis = new Redis(env.REDIS_URL, {
  // Give up quickly so startup isn't blocked for long
  retryStrategy: (times: number) => (times >= 3 ? null : times * 100),
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

redis.on('error', () => { /* suppress — unavailability is handled at call sites */ });

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

export { redis };
