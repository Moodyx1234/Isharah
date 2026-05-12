import type { ExtendedWebSocket, ClientMessage } from '@/types/websocket';
import { sessionHandler } from './handlers/sessionHandler';
import { lecturerHandler } from './handlers/lecturerHandler';
import { logger } from '@/middleware/logger';
import { WebSocket } from 'ws';

function sendError(ws: ExtendedWebSocket, code: string, message: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { code, message } }));
  }
}

export function routeMessage(ws: ExtendedWebSocket, message: ClientMessage): void {
  switch (message.type) {
    case 'JOIN_AS_LECTURER':
      lecturerHandler
        .handleJoinAsLecturer(ws, message.payload)
        .catch((err: unknown) => {
          logger.error('Unhandled error in handleJoinAsLecturer', { err });
          sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع');
        });
      break;

    case 'JOIN_SESSION':
      sessionHandler
        .handleJoin(ws, message.payload)
        .catch((err: unknown) => {
          logger.error('Unhandled error in handleJoin', { err });
          sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع');
        });
      break;

    case 'LEAVE_SESSION':
      sessionHandler
        .handleLeave(ws, message.payload)
        .catch((err: unknown) => {
          logger.error('Unhandled error in handleLeave', { err });
          sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع');
        });
      break;

    case 'RAISE_HAND':
      sessionHandler.handleRaiseHand(ws, message.payload);
      break;

    case 'ASK_QUESTION':
      sessionHandler
        .handleQuestion(ws, message.payload)
        .catch((err: unknown) => {
          logger.error('Unhandled error in handleQuestion', { err });
          sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع');
        });
      break;

    case 'START_SESSION':
      lecturerHandler
        .handleStart(ws, message.payload)
        .catch((err: unknown) => {
          logger.error('Unhandled error in handleStart', { err });
          sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع');
        });
      break;

    case 'END_SESSION':
      lecturerHandler
        .handleEnd(ws, message.payload)
        .catch((err: unknown) => {
          logger.error('Unhandled error in handleEnd', { err });
          sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع');
        });
      break;

    case 'HEARTBEAT':
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'HEARTBEAT_ACK',
          payload: { timestamp: message.payload.timestamp },
        }));
      }
      break;

    default: {
      const unknownMsg = message as { type: string };
      logger.warn('Unknown WebSocket message type', { type: unknownMsg.type });
      sendError(ws, 'UNKNOWN_TYPE', 'نوع رسالة غير معروف');
      break;
    }
  }
}
