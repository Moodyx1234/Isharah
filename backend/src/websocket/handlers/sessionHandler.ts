import { WebSocket } from 'ws';
import type { ExtendedWebSocket, ClientMessage } from '@/types/websocket';
import { sessionService } from '@/services/sessionService';
import { notificationService } from '@/services/notificationService';
import { aiService } from '@/services/aiService';
import { transcriptService } from '@/services/transcriptService';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/middleware/logger';
import { sanitizeArabic } from '@/utils/arabicNLP';
import { prisma } from '@/config/database';

// ─── Helper ───────────────────────────────────────────────────────────────────

function sendError(ws: ExtendedWebSocket, code: string, message: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ERROR', payload: { code, message } }));
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const sessionHandler = {
  async handleJoin(
    ws: ExtendedWebSocket,
    payload: { code: string; studentType: 'DEAF' | 'SIGHTED'; guestName?: string },
  ): Promise<void> {
    const { code, studentType } = payload;

    // Validate code
    if (!code || code.length !== 6) {
      sendError(ws, 'INVALID_CODE', 'رمز الجلسة يجب أن يكون 6 أحرف');
      return;
    }

    // Sanitize guest name
    const guestName = payload.guestName
      ? sanitizeArabic(payload.guestName, 100).trim() || undefined
      : undefined;

    try {
      const room = await sessionService.joinSession(
        code.toUpperCase(),
        ws,
        studentType,
        ws.userId,
        guestName,
      );

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'SESSION_JOINED',
            payload: {
              sessionId: room.sessionId,
              title: room.title,
              subject: room.subject,
              status: room.status,
              transcript: room.transcriptBuffer.slice(-50),
            },
          }),
        );
      }

      notificationService.notifyStudentCount(room);

      logger.info('Student joined session via WebSocket', {
        sessionId: room.sessionId,
        studentType,
        enrollmentId: ws.enrollmentId,
      });
    } catch (err) {
      if (err instanceof AppError) {
        sendError(ws, err.code, err.message);
      } else {
        logger.error('Unexpected error in handleJoin', { err });
        sendError(ws, 'INTERNAL_ERROR', 'حدث خطأ أثناء الانضمام إلى الجلسة');
      }
    }
  },

  async handleLeave(
    ws: ExtendedWebSocket,
    payload: { sessionId: string },
  ): Promise<void> {
    sessionService.removeClient(ws);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'SESSION_ENDED',
          payload: { sessionId: payload.sessionId },
        }),
      );
    }

    logger.info('Client left session', {
      sessionId: payload.sessionId,
      enrollmentId: ws.enrollmentId,
      clientType: ws.clientType,
    });
  },

  handleRaiseHand(
    ws: ExtendedWebSocket,
    payload: { sessionId: string; raised: boolean },
  ): void {
    if (ws.sessionId !== payload.sessionId) {
      sendError(ws, 'SESSION_MISMATCH', 'معرف الجلسة غير متطابق');
      return;
    }

    if (!ws.enrollmentId) {
      sendError(ws, 'NOT_ENROLLED', 'لم تنضم إلى جلسة بعد');
      return;
    }

    const enrollmentId = ws.enrollmentId;
    const studentName = ws.guestName ?? 'طالب';

    // Fire and forget DB update
    prisma.enrollment
      .update({
        where: { id: enrollmentId },
        data: { handRaised: payload.raised },
      })
      .catch((err: unknown) => {
        logger.warn('Failed to update handRaised in DB', { enrollmentId, err });
      });

    const room = sessionService.getRoom(payload.sessionId);
    if (room) {
      notificationService.notifyHandRaised(room, enrollmentId, studentName, payload.raised);
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'HAND_RAISED',
          payload: {
            enrollmentId,
            studentName,
            raised: payload.raised,
          },
        }),
      );
    }
  },

  async handleQuestion(
    ws: ExtendedWebSocket,
    payload: { sessionId: string; question: string },
  ): Promise<void> {
    if (ws.sessionId !== payload.sessionId) {
      sendError(ws, 'SESSION_MISMATCH', 'معرف الجلسة غير متطابق');
      return;
    }

    const question = sanitizeArabic(payload.question, 500).trim();
    if (!question) {
      sendError(ws, 'INVALID_QUESTION', 'السؤال فارغ أو غير صالح');
      return;
    }

    try {
      const transcriptText = await transcriptService.getTranscriptText(payload.sessionId);

      if (!transcriptText || transcriptText.trim().length === 0) {
        sendError(ws, 'NO_CONTENT', 'لا يوجد محتوى للجلسة بعد');
        return;
      }

      const answer = await aiService.answerQuestion(question, transcriptText);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'QUESTION_ANSWER',
            payload: { question, answer },
          }),
        );
      }
    } catch (err) {
      logger.error('Error answering question', { sessionId: payload.sessionId, err });
      sendError(ws, 'AI_ERROR', 'حدث خطأ أثناء معالجة سؤالك');
    }
  },

  handleDisconnect(ws: ExtendedWebSocket): void {
    sessionService.removeClient(ws);
    logger.debug('WebSocket client disconnected', {
      sessionId: ws.sessionId,
      enrollmentId: ws.enrollmentId,
      clientType: ws.clientType,
      userId: ws.userId,
    });
  },
};
