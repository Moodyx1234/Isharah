import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { logger } from '@/middleware/logger';
import { generateSessionCode } from '@/utils/sessionCode';
import { notificationService } from './notificationService';
import { transcriptService } from './transcriptService';
import { AppError } from '@/middleware/errorHandler';
import type { SessionRoom, StudentType, StudentCounts } from '@/types/session';
import type { ExtendedWebSocket, ServerMessage } from '@/types/websocket';
import { SESSION_CODE_TTL_SECONDS, MAX_TRANSCRIPT_HISTORY } from '@/config/constants';
import { WebSocket } from 'ws';

class SessionService {
  private rooms = new Map<string, SessionRoom>();
  private codeToId = new Map<string, string>();

  async createSession(
    lecturerName: string | undefined,
    title: string,
    subject?: string,
  ): Promise<{ id: string; code: string; title: string; subject?: string; status: string; createdAt: Date }> {
    let code = '';
    let attempts = 0;

    while (attempts < 10) {
      const candidate = generateSessionCode();
      const existing = await redis.get(`code:${candidate}`).catch(() => null);
      if (!existing) {
        const dbExisting = await prisma.session.findUnique({ where: { code: candidate } });
        if (!dbExisting) {
          code = candidate;
          break;
        }
      }
      attempts++;
    }

    if (!code) {
      throw new AppError(500, 'CODE_GENERATION_FAILED', 'فشل توليد رمز الجلسة، يرجى المحاولة مرة أخرى');
    }

    const session = await prisma.session.create({
      data: {
        code,
        title,
        subject: subject ?? null,
        lecturerName: lecturerName ?? null,
        status: 'WAITING',
      },
    });

    await redis.set(`session:${session.id}:status`, 'WAITING', 'EX', SESSION_CODE_TTL_SECONDS).catch(() => undefined);
    await redis.set(`code:${code}`, session.id, 'EX', SESSION_CODE_TTL_SECONDS).catch(() => undefined);

    logger.info('Session created', { sessionId: session.id, code, lecturerName });

    return {
      id: session.id,
      code: session.code,
      title: session.title,
      subject: session.subject ?? undefined,
      status: session.status,
      createdAt: session.createdAt,
    };
  }

  async getSessionByCode(
    code: string,
  ): Promise<{ id: string; code: string; title: string; subject?: string; status: string } | null> {
    const cachedId = await redis.get(`code:${code}`).catch(() => null);
    let sessionId = cachedId;

    if (sessionId) {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (session) {
        return {
          id: session.id,
          code: session.code,
          title: session.title,
          subject: session.subject ?? undefined,
          status: session.status,
        };
      }
    }

    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) return null;

    await redis.set(`code:${code}`, session.id, 'EX', SESSION_CODE_TTL_SECONDS).catch(() => undefined);

    return {
      id: session.id,
      code: session.code,
      title: session.title,
      subject: session.subject ?? undefined,
      status: session.status,
    };
  }

  async joinSession(
    code: string,
    ws: ExtendedWebSocket,
    studentType: StudentType,
    userId?: string,
    guestName?: string,
  ): Promise<SessionRoom> {
    const session = await this.getSessionByCode(code);

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة');
    }

    if (session.status === 'ENDED') {
      throw new AppError(400, 'SESSION_ENDED', 'انتهت الجلسة');
    }

    let room = this.rooms.get(session.id);
    if (!room) {
      room = await this.loadRoom({
        id: session.id,
        code,
        title: session.title,
        subject: session.subject,
        status: session.status,
      });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        sessionId: session.id,
        guestName: guestName ?? null,
        studentType,
        joinedAt: new Date(),
      },
    });

    ws.sessionId = session.id;
    ws.clientType = studentType;
    ws.enrollmentId = enrollment.id;
    ws.userId = userId;
    ws.guestName = guestName;

    if (studentType === 'DEAF') {
      room.deafClients.set(enrollment.id, ws);
      await redis.hincrby(`session:${session.id}:counts`, 'deaf', 1).catch(() => undefined);
    } else {
      room.sightedClients.set(enrollment.id, ws);
      await redis.hincrby(`session:${session.id}:counts`, 'sighted', 1).catch(() => undefined);
    }

    logger.info('Student joined session', {
      sessionId: session.id,
      enrollmentId: enrollment.id,
      studentType,
    });

    return room;
  }

  async joinAsLecturer(
    sessionId: string,
    ws: ExtendedWebSocket,
  ): Promise<SessionRoom> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة');
    }

    let room = this.rooms.get(sessionId);
    if (!room) {
      room = await this.loadRoom({
        id: session.id,
        code: session.code,
        title: session.title,
        subject: session.subject ?? undefined,
        status: session.status,
      });
    }

    room.lecturerWs = ws;
    ws.clientType = 'LECTURER';
    ws.sessionId = sessionId;

    logger.info('Lecturer joined session', { sessionId });

    return room;
  }

  private async loadRoom(session: {
    id: string;
    code: string;
    title: string;
    subject?: string | null;
    status: string;
  }): Promise<SessionRoom> {
    const transcriptBuffer = await transcriptService.getTranscript(session.id);

    const room: SessionRoom = {
      sessionId: session.id,
      code: session.code,
      title: session.title,
      subject: session.subject ?? undefined,
      lecturerId: '',
      lecturerWs: null,
      deafClients: new Map(),
      sightedClients: new Map(),
      transcriptBuffer: transcriptBuffer.slice(-MAX_TRANSCRIPT_HISTORY),
      sequenceNum: transcriptBuffer.length,
      status: session.status as SessionRoom['status'],
      summaryCount: 0,
    };

    this.rooms.set(session.id, room);
    this.codeToId.set(session.code, session.id);

    logger.debug('Room loaded into memory', { sessionId: session.id });

    return room;
  }

  async startSession(sessionId: string): Promise<{ startedAt: Date }> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة');
    }

    if (session.status !== 'WAITING') {
      throw new AppError(400, 'SESSION_NOT_WAITING', 'الجلسة ليست في حالة انتظار');
    }

    const startedAt = new Date();

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'LIVE', startedAt },
    });

    await redis.set(`session:${sessionId}:status`, 'LIVE', 'EX', SESSION_CODE_TTL_SECONDS).catch(() => undefined);

    const room = this.rooms.get(sessionId);
    if (room) {
      room.status = 'LIVE';
      room.startedAt = startedAt;
    }

    logger.info('Session started', { sessionId });

    return { startedAt };
  }

  async endSession(sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'ENDED', endedAt: new Date() },
    });

    await redis.set(`session:${sessionId}:status`, 'ENDED', 'EX', SESSION_CODE_TTL_SECONDS).catch(() => undefined);

    await transcriptService.flushRedisToDb(sessionId);

    const room = this.rooms.get(sessionId);
    if (room) {
      room.status = 'ENDED';
    }

    logger.info('Session ended', { sessionId });
  }

  removeClient(ws: ExtendedWebSocket): void {
    if (!ws.sessionId) return;

    const room = this.rooms.get(ws.sessionId);

    if (ws.clientType === 'LECTURER') {
      if (room) {
        room.lecturerWs = null;
      }
      logger.info('Lecturer disconnected', { sessionId: ws.sessionId });
      return;
    }

    if (ws.enrollmentId && room) {
      if (ws.clientType === 'DEAF') {
        room.deafClients.delete(ws.enrollmentId);
        redis.hincrby(`session:${ws.sessionId}:counts`, 'deaf', -1).catch(() => undefined);
      } else if (ws.clientType === 'SIGHTED') {
        room.sightedClients.delete(ws.enrollmentId);
        redis.hincrby(`session:${ws.sessionId}:counts`, 'sighted', -1).catch(() => undefined);
      }

      prisma.enrollment
        .update({
          where: { id: ws.enrollmentId },
          data: { leftAt: new Date() },
        })
        .catch((err: unknown) => {
          logger.warn('Failed to update enrollment leftAt', { enrollmentId: ws.enrollmentId, err });
        });

      notificationService.notifyStudentCount(room);

      logger.info('Student removed from room', {
        sessionId: ws.sessionId,
        enrollmentId: ws.enrollmentId,
        clientType: ws.clientType,
      });
    }
  }

  getRoom(sessionId: string): SessionRoom | undefined {
    return this.rooms.get(sessionId);
  }

  getRoomByCode(code: string): SessionRoom | undefined {
    const sessionId = this.codeToId.get(code);
    if (!sessionId) return undefined;
    return this.rooms.get(sessionId);
  }

  getStudentCounts(sessionId: string): StudentCounts {
    const room = this.rooms.get(sessionId);
    if (!room) return { deaf: 0, sighted: 0, total: 0 };

    const deaf = room.deafClients.size;
    const sighted = room.sightedClients.size;
    return { deaf, sighted, total: deaf + sighted };
  }

  getDeafCount(sessionId: string): number {
    return this.rooms.get(sessionId)?.deafClients.size ?? 0;
  }

  getTranscriptText(sessionId: string): string {
    const room = this.rooms.get(sessionId);
    if (!room) return '';
    return room.transcriptBuffer.map((e) => e.text).join(' ');
  }

  addToTranscriptBuffer(
    sessionId: string,
    entry: import('@/types/session').TranscriptLine,
  ): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    room.transcriptBuffer.push(entry);

    if (room.transcriptBuffer.length > MAX_TRANSCRIPT_HISTORY) {
      room.transcriptBuffer.splice(0, room.transcriptBuffer.length - MAX_TRANSCRIPT_HISTORY);
    }
  }

  broadcastToAll(sessionId: string, message: ServerMessage): void {
    const room = this.rooms.get(sessionId);
    if (room) notificationService.broadcastToAll(room, message);
  }

  broadcastToDeaf(sessionId: string, message: ServerMessage): void {
    const room = this.rooms.get(sessionId);
    if (room) notificationService.broadcastToDeaf(room, message);
  }

  broadcastToSighted(sessionId: string, message: ServerMessage): void {
    const room = this.rooms.get(sessionId);
    if (room) notificationService.broadcastToSighted(room, message);
  }

  broadcastToLecturer(sessionId: string, message: ServerMessage): void {
    const room = this.rooms.get(sessionId);
    if (room) notificationService.broadcastToLecturer(room, message);
  }

  async saveTranscriptEntry(
    sessionId: string,
    id: string,
    text: string,
    seq: number,
    confidence?: number,
    simplified?: string,
    tokens?: string[],
  ): Promise<void> {
    await transcriptService.addEntry(sessionId, id, text, seq, confidence, simplified, tokens);

    const entry: import('@/types/session').TranscriptLine = {
      id,
      text,
      simplified,
      tokens,
      timestamp: new Date().toISOString(),
      sequenceNum: seq,
    };
    this.addToTranscriptBuffer(sessionId, entry);
  }
}

export const sessionService = new SessionService();
