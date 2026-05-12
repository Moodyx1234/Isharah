import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';
import { transcriptService } from '@/services/transcriptService';
import { aiService } from '@/services/aiService';
import { validate } from '@/middleware/validate';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const askSchema = z.object({
  question: z.string().min(5).max(500),
});

// ─── GET /:sessionId — paginated transcript ───────────────────────────────────

router.get(
  '/:sessionId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
      const rawLimit = parseInt(String(req.query['limit'] ?? '50'), 10) || 50;
      const limit = Math.min(Math.max(1, rawLimit), 200);
      const skip = (page - 1) * limit;

      const sessionId = req.params.sessionId;

      const [transcript, total] = await Promise.all([
        prisma.transcriptEntry.findMany({
          where: { sessionId },
          skip,
          take: limit,
          orderBy: { sequenceNum: 'asc' },
        }),
        prisma.transcriptEntry.count({ where: { sessionId } }),
      ]);

      res.status(200).json({
        transcript,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /:sessionId/ask — ask AI a question about the lecture ───────────────

router.post(
  '/:sessionId/ask',
  validate(askSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question } = req.body as z.infer<typeof askSchema>;
      const sessionId = req.params.sessionId;

      const transcriptText = await transcriptService.getTranscriptText(sessionId);

      if (!transcriptText || transcriptText.trim().length === 0) {
        return next(new AppError(400, 'NO_TRANSCRIPT', 'لا يوجد محتوى للجلسة بعد'));
      }

      const answer = await aiService.answerQuestion(question, transcriptText);

      res.status(200).json({ question, answer });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
