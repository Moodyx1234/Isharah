import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { sessionService } from '@/services/sessionService';
import { prisma } from '@/config/database';

const router = Router();

// ─── GET /sessions/:code/check — verify session exists and is joinable ─────────

router.get(
  '/sessions/:code/check',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await sessionService.getSessionByCode(req.params.code.toUpperCase());

      if (!session) {
        return next(new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة'));
      }

      if (session.status === 'ENDED') {
        return next(new AppError(400, 'SESSION_ENDED', 'انتهت هذه الجلسة'));
      }

      res.status(200).json({
        joinable: true,
        title: session.title,
        subject: session.subject,
        status: session.status,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /sessions/:code/transcript — recent transcript for late-joiners ───────

router.get(
  '/sessions/:code/transcript',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await prisma.session.findUnique({
        where: { code: req.params.code.toUpperCase() },
      });

      if (!session) {
        return next(new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة'));
      }

      const transcript = await prisma.transcriptEntry.findMany({
        where: { sessionId: session.id },
        orderBy: { sequenceNum: 'desc' },
        take: 50,
      });

      // Return in ascending order so the client can display oldest-first
      transcript.reverse();

      res.status(200).json({ transcript });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
