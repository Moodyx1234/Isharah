import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { setupWebSocketServer } from './websocket/wsServer';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { env } from './config/env';
import { logger, requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { restRateLimit } from './middleware/rateLimit';
import sessionRoutes from './routes/sessions';
import lecturerRoutes from './routes/lecturer';
import studentRoutes from './routes/student';
import transcriptRoutes from './routes/transcripts';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // ── Database ───────────────────────────────────────────────────────────────
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Failed to connect to database', { err });
    process.exit(1);
  }

  // ── Redis (optional — app works without it, just no caching) ──────────────
  try {
    await redis.ping();
    logger.info('Redis connected successfully');
  } catch (err) {
    logger.warn('Redis unavailable — continuing without cache', { err });
  }

  // ── Express app ────────────────────────────────────────────────────────────
  const app = express();

  // Security & compression
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // REST rate limiting on all /api routes
  app.use('/api', restRateLimit);

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/lecturer', lecturerRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/transcripts', transcriptRoutes);

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── 404 handler ────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'المسار غير موجود',
      },
    });
  });

  // ── Global error handler (must have 4 params) ───────────────────────────────
  app.use(errorHandler);

  // ── HTTP server & WebSocket ────────────────────────────────────────────────
  const server = http.createServer(app);
  setupWebSocketServer(server);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`, {
      env: env.NODE_ENV,
      port: env.PORT,
    });
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);

    // Force exit after 10 seconds
    const forceExit = setTimeout(() => {
      logger.error('Forced exit after timeout');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await prisma.$disconnect();
        logger.info('Database disconnected');
      } catch (err) {
        logger.warn('Error disconnecting database', { err });
      }

      try {
        redis.disconnect();
        logger.info('Redis disconnected');
      } catch (err) {
        logger.warn('Error disconnecting Redis', { err });
      }

      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ── Unhandled error guards ──────────────────────────────────────────────────

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { err, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

// ── Start ───────────────────────────────────────────────────────────────────

bootstrap().catch((err: unknown) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
