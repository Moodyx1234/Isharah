import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

const isDev = process.env['NODE_ENV'] !== 'production';

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

const logsDir = path.join(process.cwd(), 'logs');

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev ? devFormat : prodFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
});

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startMs = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - startMs;
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms,
      ip: req.ip ?? req.socket.remoteAddress,
    });
  });

  next();
}
