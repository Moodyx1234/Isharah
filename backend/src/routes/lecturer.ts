import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';

const router = Router();

// ─── GET /sessions — all sessions ────────────────────────────────────────────

router.get(
  '/sessions',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = await prisma.session.findMany({
        include: {
          _count: {
            select: { enrollments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ sessions });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /sessions/:id — single session details ───────────────────────────────

router.get(
  '/sessions/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await prisma.session.findUnique({
        where: { id: req.params.id },
        include: {
          summaries: true,
          keyPoints: true,
          _count: {
            select: { enrollments: true },
          },
        },
      });

      if (!session) {
        return next(new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة'));
      }

      res.status(200).json({ session });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /sessions/:id — soft-delete ──────────────────────────────────────

router.delete(
  '/sessions/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const existing = await prisma.session.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        return next(new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة'));
      }

      if (existing.status === 'LIVE') {
        return next(new AppError(400, 'SESSION_ACTIVE', 'أنهِ الجلسة أولاً'));
      }

      await prisma.session.update({
        where: { id: req.params.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });

      res.status(200).json({ message: 'تم حذف الجلسة' });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /dashboard — aggregated stats ───────────────────────────────────────

router.get(
  '/dashboard',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [totalSessions, liveSessions, enrollmentCount] = await Promise.all([
        prisma.session.count(),
        prisma.session.count({ where: { status: 'LIVE' } }),
        prisma.enrollment.count(),
      ]);

      res.status(200).json({
        totalSessions,
        liveSessions,
        totalStudents: enrollmentCount,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
