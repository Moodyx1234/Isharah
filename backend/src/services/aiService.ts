import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/config/env';
import { AI_SUMMARY_INTERVAL_MS, TRANSCRIPT_MIN_CHARS_FOR_AI } from '@/config/constants';
import { withRetry } from '@/utils/retry';
import { logger } from '@/middleware/logger';

const MODEL = 'claude-sonnet-4-6';

class AIService {
  private client: Anthropic;
  private summaryTimers: Map<string, ReturnType<typeof setInterval>>;
  private summaryCounters: Map<string, number>;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    this.summaryTimers = new Map();
    this.summaryCounters = new Map();
  }

  async generateSummary(transcript: string, previousSummary?: string): Promise<string> {
    return withRetry(async () => {
      const userContent = previousSummary
        ? `الملخص السابق:\n${previousSummary}\n\nالنص الجديد:\n${transcript}`
        : transcript;

      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 512,
        system: 'أنت مساعد أكاديمي. مهمتك تلخيص المحاضرات بشكل دقيق ومفيد باللغة العربية.',
        messages: [
          {
            role: 'user',
            content: `لخّص المحاضرة التالية في 3 إلى 4 جمل باللغة العربية، مع التركيز على النقاط الأساسية:\n\n${userContent}`,
          },
        ],
      });

      const block = response.content[0];
      if (block.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return block.text;
    });
  }

  async extractKeyPoints(transcript: string): Promise<string[]> {
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 512,
        system: 'أجب فقط بـ JSON array',
        messages: [
          {
            role: 'user',
            content: `استخرج أهم 5 نقاط من النص التالي وأعدها كـ JSON array من النصوص باللغة العربية:\n\n${transcript}`,
          },
        ],
      });

      const block = response.content[0];
      if (block.type !== 'text') {
        return [];
      }

      try {
        // Extract JSON array from the response text
        const match = block.text.match(/\[[\s\S]*\]/);
        if (!match) return [];
        const parsed = JSON.parse(match[0]) as unknown;
        if (!Array.isArray(parsed)) return [];
        return (parsed as unknown[])
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 5);
      } catch {
        logger.warn('Failed to parse key points JSON', { text: block.text });
        return [];
      }
    });
  }

  async answerQuestion(question: string, transcript: string): Promise<string> {
    return withRetry(async () => {
      const context = transcript.slice(-3000);

      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 512,
        system: 'أنت مساعد أكاديمي. أجب على أسئلة الطلاب بناءً على محتوى المحاضرة باللغة العربية.',
        messages: [
          {
            role: 'user',
            content: `محتوى المحاضرة (آخر جزء):\n${context}\n\nسؤال الطالب: ${question}\n\nأجب على السؤال باللغة العربية بناءً على محتوى المحاضرة.`,
          },
        ],
      });

      const block = response.content[0];
      if (block.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return block.text;
    });
  }

  async simplifyForArSL(arabicText: string): Promise<string> {
    try {
      return await withRetry(async () => {
        const response = await this.client.messages.create({
          model: MODEL,
          max_tokens: 256,
          system:
            'أنت متخصص في لغة الإشارة العربية (ArSL). مهمتك تبسيط الجمل العربية لتناسب قواعد لغة الإشارة: جمل قصيرة ومباشرة، بدون أدوات ربط غير ضرورية، بدون تشكيل، مع الحفاظ على المعنى الأساسي.',
          messages: [
            {
              role: 'user',
              content: `بسّط الجملة التالية لتناسب لغة الإشارة العربية (ArSL). أعد الجملة المبسطة فقط بدون شرح:\n\n${arabicText}`,
            },
          ],
        });

        const block = response.content[0];
        if (block.type !== 'text') {
          return arabicText;
        }

        return block.text.trim();
      }, 2, 300);
    } catch (err) {
      logger.warn('simplifyForArSL failed, returning original text', { err });
      return arabicText;
    }
  }

  startAutoSummary(
    sessionId: string,
    getTranscript: () => string,
    onSummary: (summary: string, count: number) => void,
  ): void {
    if (this.summaryTimers.has(sessionId)) {
      return;
    }

    this.summaryCounters.set(sessionId, 0);

    const timer = setInterval(async () => {
      const transcript = getTranscript();

      if (transcript.length < TRANSCRIPT_MIN_CHARS_FOR_AI) {
        return;
      }

      try {
        const count = (this.summaryCounters.get(sessionId) ?? 0) + 1;
        this.summaryCounters.set(sessionId, count);

        const summary = await this.generateSummary(transcript);

        // Fire and forget key points — errors are non-fatal
        this.extractKeyPoints(transcript).catch((err) => {
          logger.warn('Auto key points extraction failed', { sessionId, err });
        });

        onSummary(summary, count);
      } catch (err) {
        logger.error('Auto summary generation failed', { sessionId, err });
      }
    }, AI_SUMMARY_INTERVAL_MS);

    this.summaryTimers.set(sessionId, timer);

    logger.debug('Auto summary started', { sessionId });
  }

  stopAutoSummary(sessionId: string): void {
    const timer = this.summaryTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.summaryTimers.delete(sessionId);
    }
    this.summaryCounters.delete(sessionId);

    logger.debug('Auto summary stopped', { sessionId });
  }
}

export const aiService = new AIService();
