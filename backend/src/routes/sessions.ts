import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '@/middleware/validate';
import { AppError } from '@/middleware/errorHandler';
import { sessionService } from '@/services/sessionService';
import { transcriptService } from '@/services/transcriptService';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSessionSchema = z.object({
  title: z.string().min(1).default('محاضرة جديدة'),
  subject: z.string().optional(),
  lecturerName: z.string().optional(),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// ─── POST / — create session (no auth required) ───────────────────────────────

router.post(
  '/',
  validate(createSessionSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, subject, lecturerName } = req.body as z.infer<typeof createSessionSchema>;
      const session = await sessionService.createSession(lecturerName, title, subject);
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:code/info — public session lookup ──────────────────────────────────

router.get(
  '/:code/info',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await sessionService.getSessionByCode(req.params.code.toUpperCase());
      if (!session) {
        return next(new AppError(404, 'SESSION_NOT_FOUND', 'الجلسة غير موجودة'));
      }
      res.status(200).json({ session });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id/transcript ──────────────────────────────────────────────────────

router.get(
  '/:id/transcript',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transcript = await transcriptService.getTranscript(req.params.id);
      res.status(200).json({ transcript });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id/summary ─────────────────────────────────────────────────────────

router.get(
  '/:id/summary',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summaries = await transcriptService.getSummaries(req.params.id);
      res.status(200).json({ summaries });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /:id/keypoints ───────────────────────────────────────────────────────

router.get(
  '/:id/keypoints',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keyPoints = await transcriptService.getKeyPoints(req.params.id);
      res.status(200).json({ keyPoints });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /:id/export — transcript download ───────────────────────────────────

router.post(
  '/:id/export',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const transcript = await transcriptService.getTranscript(sessionId);

      const textContent = transcript
        .map((entry: { timestamp: Date | string; text: string }) =>
          `[${formatTimestamp(entry.timestamp)}] ${entry.text}`,
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="transcript-${sessionId}.txt"`);
      res.send(textContent);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
