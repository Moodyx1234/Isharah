import { WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import type { ExtendedWebSocket } from '@/types/websocket';
import { sessionService } from '@/services/sessionService';
import { speechService } from '@/services/speechService';
import { aiService } from '@/services/aiService';
import { signLanguageService } from '@/services/signLanguageService';
import { notificationService } from '@/services/notificationService';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/middleware/logger';
import { sanitizeArabic } from '@/utils/arabicNLP';
import { prisma } from '@/config/database';

function sendError(ws: ExtendedWebSocket, code: string, message: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { code, message } }));
  }
}

export const lecturerHandler = {
  async handleJoinAsLecturer(
    ws: ExtendedWebSocket,
    payload: { sessionId: string },
  ): Promise<void> {
    const { sessionId } = payload;
    try {
      const room = await sessionService.joinAsLecturer(sessionId, ws);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'SESSION_JOINED',
          payload: {
            sessionId: room.sessionId,
            title: room.title,
            subject: room.subject,
            status: room.status,
            transcript: room.transcriptBuffer.slice(-50),
          },
        }));
      }

      logger.info('Lecturer joined session via WebSocket', { sessionId });
    } catch (err) {
      if (err instanceof AppError) {
        sendError(ws, err.code, err.message);
      } else {
        logger.error('Unexpected error in handleJoinAsLecturer', { err });
        sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ أثناء الانضمام للجلسة');
      }
    }
  },

  async handleStart(
    ws: ExtendedWebSocket,
    payload: { sessionId: string },
  ): Promise<void> {
    if (ws.clientType !== 'LECTURER') {
      sendError(ws, 'FORBIDDEN', 'هذه العملية متاحة للمحاضرين فقط');
      return;
    }

    const { sessionId } = payload;

    try {
      const result = await sessionService.startSession(sessionId);
      const startedAt = result.startedAt ?? new Date();

      sessionService.broadcastToAll(sessionId, {
        type: 'SESSION_STARTED',
        payload: { sessionId, startedAt: startedAt.toISOString() },
      });

      aiService.startAutoSummary(
        sessionId,
        () => sessionService.getTranscriptText(sessionId),
        async (summary: string, intervalNum: number) => {
          const room = sessionService.getRoom(sessionId);
          if (!room) return;

          notificationService.broadcastToSighted(room, {
            type: 'SUMMARY_UPDATE',
            payload: { content: summary, intervalNum },
          });

          prisma.summary
            .create({ data: { sessionId, content: summary, intervalNum } })
            .catch((err: unknown) => logger.warn('Failed to persist summary', { sessionId, err }));

          const transcriptText = sessionService.getTranscriptText(sessionId);
          try {
            const points = await aiService.extractKeyPoints(transcriptText);
            if (points.length > 0) {
              notificationService.broadcastToSighted(room, {
                type: 'KEYPOINTS_UPDATE',
                payload: { points },
              });

              prisma.keyPoint
                .createMany({
                  data: points.map((point, i) => ({ sessionId, point, importance: points.length - i })),
                })
                .catch((err: unknown) => logger.warn('Failed to persist key points', { sessionId, err }));
            }
          } catch (err) {
            logger.warn('Key points extraction failed', { sessionId, err });
          }
        },
      );

      logger.info('Lecturer started session', { sessionId });
    } catch (err) {
      if (err instanceof AppError) {
        sendError(ws, err.code, err.message);
      } else {
        logger.error('Unexpected error in handleStart', { err });
        sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ أثناء بدء الجلسة');
      }
    }
  },

  async handleEnd(
    ws: ExtendedWebSocket,
    payload: { sessionId: string },
  ): Promise<void> {
    if (ws.clientType !== 'LECTURER') {
      sendError(ws, 'FORBIDDEN', 'هذه العملية متاحة للمحاضرين فقط');
      return;
    }

    const { sessionId } = payload;

    try {
      aiService.stopAutoSummary(sessionId);
      speechService.clearSession(sessionId);

      await sessionService.endSession(sessionId);

      sessionService.broadcastToAll(sessionId, {
        type: 'SESSION_ENDED',
        payload: { sessionId },
      });

      logger.info('Lecturer ended session', { sessionId });
    } catch (err) {
      if (err instanceof AppError) {
        sendError(ws, err.code, err.message);
      } else {
        logger.error('Unexpected error in handleEnd', { err });
        sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ أثناء إنهاء الجلسة');
      }
    }
  },

  async handleAudioChunk(ws: ExtendedWebSocket, data: Buffer): Promise<void> {
    if (ws.clientType !== 'LECTURER') return;
    if (!ws.sessionId) return;
    if (data.length < 4) return;

    const sequence = data.readUInt32BE(0);
    const audioData = data.subarray(4);
    const sessionId = ws.sessionId;

    let result: import('@/types/gestures').TranscriptResult | null = null;
    try {
      result = await speechService.processChunk(sessionId, audioData);
    } catch (err) {
      logger.warn('Speech processChunk error', { sessionId, err });
      return;
    }

    if (!result || !result.text) return;

    const text = sanitizeArabic(result.text).trim();
    if (!text) return;

    const entryId = uuid();
    const now = new Date();
    const timestamp = now.toISOString();

    await sessionService.saveTranscriptEntry(sessionId, entryId, text, sequence, result.confidence);

    sessionService.broadcastToAll(sessionId, {
      type: 'TRANSCRIPT_UPDATE',
      payload: { id: entryId, text, timestamp, sequenceNum: sequence, isFinal: true },
    });

    sessionService.broadcastToSighted(sessionId, {
      type: 'CAPTION_UPDATE',
      payload: { text, timestamp, isFinal: true },
    });

    setImmediate(() => {
      void (async () => {
        try {
          if (sessionService.getDeafCount(sessionId) === 0) return;

          const simplified = await aiService.simplifyForArSL(text);
          const gestures = signLanguageService.sentenceToGestures(simplified);
          const tokens = gestures.map((g) => g.gestureId);

          const room = sessionService.getRoom(sessionId);
          if (room) {
            const entry = room.transcriptBuffer.find((e) => e.id === entryId);
            if (entry) {
              entry.simplified = simplified;
              entry.tokens = tokens;
            }
          }

          sessionService.broadcastToDeaf(sessionId, {
            type: 'TRANSCRIPT_UPDATE',
            payload: { id: entryId, text, simplified, tokens, timestamp, sequenceNum: sequence, isFinal: true },
          });

          if (gestures.length > 0) {
            sessionService.broadcastToDeaf(sessionId, {
              type: 'SIGN_GESTURE',
              payload: { gestures, sentenceId: entryId, sentenceText: simplified },
            });
          }
        } catch (err) {
          logger.warn('ArSL processing error', { sessionId, entryId, err });
        }
      })();
    });
  },
};
