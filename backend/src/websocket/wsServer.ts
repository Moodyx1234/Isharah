import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type * as http from 'http';
import { routeMessage } from './wsRouter';
import { sessionHandler } from './handlers/sessionHandler';
import { lecturerHandler } from './handlers/lecturerHandler';
import type { ExtendedWebSocket } from '@/types/websocket';
import { WS_HEARTBEAT_INTERVAL_MS, WS_MAX_MESSAGES_PER_MINUTE } from '@/config/constants';
import { logger } from '@/middleware/logger';

export function setupWebSocketServer(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((rawWs) => {
      const ws = rawWs as ExtendedWebSocket;
      if (!ws.isAlive) {
        logger.debug('Terminating stale WebSocket connection', { sessionId: ws.sessionId });
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, WS_HEARTBEAT_INTERVAL_MS);

  wss.on('connection', (rawWs: WebSocket, _req: IncomingMessage) => {
    const ws = rawWs as ExtendedWebSocket;

    ws.isAlive = true;
    ws._msgCount = 0;
    ws._msgWindowStart = Date.now();

    logger.debug('WebSocket connection established — guest accepted');

    ws.on('message', (data: Buffer | string, isBinary: boolean) => {
      if (isBinary) {
        lecturerHandler.handleAudioChunk(ws, data as Buffer).catch((err: unknown) => {
          logger.error('Error handling audio chunk', { sessionId: ws.sessionId, err });
        });
        return;
      }

      const now = Date.now();
      if (now - ws._msgWindowStart > 60_000) {
        ws._msgCount = 1;
        ws._msgWindowStart = now;
      } else {
        ws._msgCount += 1;
      }

      if (ws._msgCount > WS_MAX_MESSAGES_PER_MINUTE) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { code: 'RATE_LIMITED', message: 'تجاوزت الحد المسموح به من الرسائل، يرجى الانتظار' },
          }));
        }
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { code: 'INVALID_JSON', message: 'تنسيق الرسالة غير صالح' },
          }));
        }
        return;
      }

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('type' in parsed) ||
        typeof (parsed as Record<string, unknown>).type !== 'string'
      ) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { code: 'INVALID_MESSAGE', message: 'شكل الرسالة غير صالح' },
          }));
        }
        return;
      }

      routeMessage(ws, parsed as import('@/types/websocket').ClientMessage);
    });

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', (code: number, reason: Buffer) => {
      logger.debug('WebSocket closed', {
        code,
        reason: reason.toString(),
        sessionId: ws.sessionId,
        clientType: ws.clientType,
      });
      sessionHandler.handleDisconnect(ws);
    });

    ws.on('error', (err: Error) => {
      logger.error('WebSocket error', { err, sessionId: ws.sessionId });
      if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
        ws.terminate();
      }
    });
  });

  wss.on('error', (err: Error) => {
    logger.error('WebSocketServer error', { err });
  });

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    logger.info('WebSocketServer closed, heartbeat cleared');
  });

  logger.info('WebSocket server ready at /ws');

  return wss;
}
