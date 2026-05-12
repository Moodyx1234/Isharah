import OpenAI from 'openai';
import { createWavBuffer, AudioBufferManager } from '@/utils/audioBuffer';
import { withRetry } from '@/utils/retry';
import type { TranscriptResult } from '@/types/gestures';
import { env } from '@/config/env';
import { AUDIO_BUFFER_SIZE_BYTES } from '@/config/constants';
import { logger } from '@/middleware/logger';

class SpeechService {
  private openai: OpenAI;
  private bufferManager: AudioBufferManager;

  constructor() {
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.bufferManager = new AudioBufferManager();
  }

  async processChunk(sessionId: string, chunk: Buffer): Promise<TranscriptResult | null> {
    this.bufferManager.append(sessionId, chunk);

    if (this.bufferManager.getSize(sessionId) >= AUDIO_BUFFER_SIZE_BYTES) {
      return this.flushAndTranscribe(sessionId);
    }

    return null;
  }

  async flushAndTranscribe(sessionId: string): Promise<TranscriptResult | null> {
    const pcmData = this.bufferManager.flush(sessionId);

    if (!pcmData || pcmData.length < 1000) {
      return null;
    }

    return this.transcribeBuffer(pcmData);
  }

  private async transcribeBuffer(pcmData: Buffer): Promise<TranscriptResult> {
    return withRetry(async () => {
      const wavBuffer = createWavBuffer(pcmData);
      const file = new File([wavBuffer], 'audio.wav', { type: 'audio/wav' });

      const response = await this.openai.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: 'ar',
        response_format: 'verbose_json',
      });

      // Calculate confidence from segments avg_logprob
      let confidence = 0.8; // default fallback
      const segments = (response as unknown as { segments?: Array<{ avg_logprob?: number }> }).segments;
      if (segments && segments.length > 0) {
        const logprobs = segments
          .map((s) => s.avg_logprob)
          .filter((v): v is number => typeof v === 'number');

        if (logprobs.length > 0) {
          const meanLogprob = logprobs.reduce((a, b) => a + b, 0) / logprobs.length;
          confidence = Math.min(1, Math.max(0, Math.exp(meanLogprob)));
        }
      }

      logger.debug('Transcription complete', {
        textLength: response.text.length,
        confidence,
      });

      return {
        text: response.text,
        confidence,
        isFinal: true,
        language: 'ar',
      };
    }, 3, 500);
  }

  clearSession(sessionId: string): void {
    this.bufferManager.clear(sessionId);
  }
}

export const speechService = new SpeechService();
