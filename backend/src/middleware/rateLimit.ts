import { Request, Response, NextFunction } from 'express';
import { redis } from '@/config/redis';
import {
  REST_MAX_REQUESTS_PER_MINUTE,
  WS_MAX_MESSAGES_PER_MINUTE,
} from '@/config/constants';
import { AppError } from './errorHandler';

export async function restRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const minuteWindow = Math.floor(Date.now() / 60_000);
  const key = `ratelimit:rest:${ip}:${minuteWindow}`;

  try {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, 60);
    const results = await multi.exec();

    // results[0] is [error, count]
    const count = results?.[0]?.[1] as number | null;

    if (count != null && count > REST_MAX_REQUESTS_PER_MINUTE) {
      return next(new AppError(429, 'RATE_LIMIT_EXCEEDED', 'تجاوزت الحد المسموح به من الطلبات، يرجى المحاولة لاحقاً'));
    }

    const remaining = count != null
      ? Math.max(0, REST_MAX_REQUESTS_PER_MINUTE - count)
      : REST_MAX_REQUESTS_PER_MINUTE;
    res.setHeader('X-RateLimit-Remaining', remaining);

    next();
  } catch {
    // Fail open on Redis error
    next();
  }
}

export function checkWsMessageRate(
  msgCount: number,
  windowStart: number,
): { allowed: boolean; newCount: number; newWindowStart: number } {
  const now = Date.now();
  const windowMs = 60_000;

  if (now - windowStart > windowMs) {
    // New window: reset
    return { allowed: true, newCount: 1, newWindowStart: now };
  }

  const newCount = msgCount + 1;

  if (newCount > WS_MAX_MESSAGES_PER_MINUTE) {
    return { allowed: false, newCount, newWindowStart: windowStart };
  }

  return { allowed: true, newCount, newWindowStart: windowStart };
}
