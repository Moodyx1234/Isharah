import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { logger } from '@/middleware/logger';
import { TRANSCRIPT_REDIS_TTL, MAX_TRANSCRIPT_HISTORY } from '@/config/constants';
import type { TranscriptLine } from '@/types/session';

class TranscriptService {
  async addEntry(
    sessionId: string,
    id: string,
    text: string,
    sequenceNum: number,
    confidence?: number,
    simplified?: string,
    tokens?: string[],
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry: TranscriptLine = {
      id,
      text,
      simplified,
      tokens,
      timestamp,
      sequenceNum,
    };

    const redisKey = `transcript:${sessionId}`;

    // Push to Redis (best-effort — silently skipped when Redis is unavailable)
    try {
      await redis.rpush(redisKey, JSON.stringify(entry));
      await redis.expire(redisKey, TRANSCRIPT_REDIS_TTL);
    } catch { /* no Redis — DB write below is the source of truth */ }

    // Async DB write — non-blocking
    setImmediate(() => {
      prisma.transcriptEntry
        .create({
          data: {
            id,
            sessionId,
            text,
            confidence: confidence ?? null,
            sequenceNum,
            timestamp: new Date(timestamp),
          },
        })
        .catch((err: unknown) => {
          logger.error('Failed to persist transcript entry to DB', { id, sessionId, err });
        });
    });
  }

  async getTranscript(sessionId: string): Promise<TranscriptLine[]> {
    const redisKey = `transcript:${sessionId}`;

    try {
      const raw = await redis.lrange(redisKey, 0, -1);

      if (raw && raw.length > 0) {
        return raw.map((item) => JSON.parse(item) as TranscriptLine);
      }
    } catch (err) {
      logger.warn('Redis lrange failed, falling back to DB', { sessionId, err });
    }

    // Fallback to DB
    try {
      const entries = await prisma.transcriptEntry.findMany({
        where: { sessionId },
        orderBy: { sequenceNum: 'asc' },
        take: MAX_TRANSCRIPT_HISTORY,
      });

      return entries.map((e) => ({
        id: e.id,
        text: e.text,
        timestamp: e.timestamp.toISOString(),
        sequenceNum: e.sequenceNum,
      }));
    } catch (err) {
      logger.error('Failed to fetch transcript from DB', { sessionId, err });
      return [];
    }
  }

  async getTranscriptText(sessionId: string): Promise<string> {
    const entries = await this.getTranscript(sessionId);
    return entries.map((e) => e.text).join(' ');
  }

  async flushRedisToDb(sessionId: string): Promise<void> {
    const redisKey = `transcript:${sessionId}`;

    let entries: TranscriptLine[] = [];
    try {
      const raw = await redis.lrange(redisKey, 0, -1);
      entries = raw.map((item) => JSON.parse(item) as TranscriptLine);
    } catch (err) {
      logger.error('Failed to read Redis transcript for flush', { sessionId, err });
      return;
    }

    logger.info(`Flushing ${entries.length} transcript entries to DB`, { sessionId });

    let persisted = 0;
    for (const entry of entries) {
      try {
        const existing = await prisma.transcriptEntry.findUnique({ where: { id: entry.id } });
        if (!existing) {
          await prisma.transcriptEntry.create({
            data: {
              id: entry.id,
              sessionId,
              text: entry.text,
              confidence: null,
              sequenceNum: entry.sequenceNum,
              timestamp: new Date(entry.timestamp),
            },
          });
          persisted++;
        }
      } catch (err) {
        logger.error('Failed to flush transcript entry to DB', { id: entry.id, sessionId, err });
      }
    }

    logger.info(`Flushed ${persisted} new transcript entries to DB`, { sessionId });
  }

  async getSummaries(sessionId: string) {
    return prisma.summary.findMany({
      where: { sessionId },
      orderBy: { generatedAt: 'asc' },
    });
  }

  async getKeyPoints(sessionId: string) {
    return prisma.keyPoint.findMany({
      where: { sessionId },
      orderBy: { generatedAt: 'asc' },
    });
  }
}

export const transcriptService = new TranscriptService();
