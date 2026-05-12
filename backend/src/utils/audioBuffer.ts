import {
  AUDIO_SAMPLE_RATE,
  AUDIO_CHANNELS,
  AUDIO_BIT_DEPTH,
} from '@/config/constants';

/**
 * Build a WAV file buffer from raw PCM data.
 *
 * WAV structure:
 *   RIFF chunk  (12 bytes): 'RIFF' + file-size-minus-8 + 'WAVE'
 *   fmt  chunk  (24 bytes): 'fmt ' + 16 + audioFormat(1=PCM) + numChannels +
 *                            sampleRate + byteRate + blockAlign + bitsPerSample
 *   data chunk  ( 8 bytes): 'data' + dataLen
 *   PCM payload
 */
export function createWavBuffer(
  pcmData: Buffer,
  sampleRate: number = AUDIO_SAMPLE_RATE,
  channels: number = AUDIO_CHANNELS,
  bitsPerSample: number = AUDIO_BIT_DEPTH,
): Buffer {
  const dataLen = pcmData.length;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  const header = Buffer.alloc(44);
  let offset = 0;

  // RIFF chunk descriptor
  header.write('RIFF', offset, 'ascii');            offset += 4;
  header.writeUInt32LE(36 + dataLen, offset);        offset += 4;
  header.write('WAVE', offset, 'ascii');            offset += 4;

  // fmt sub-chunk
  header.write('fmt ', offset, 'ascii');            offset += 4;
  header.writeUInt32LE(16, offset);                  offset += 4; // sub-chunk size
  header.writeUInt16LE(1, offset);                   offset += 2; // PCM = 1
  header.writeUInt16LE(channels, offset);            offset += 2;
  header.writeUInt32LE(sampleRate, offset);          offset += 4;
  header.writeUInt32LE(byteRate, offset);            offset += 4;
  header.writeUInt16LE(blockAlign, offset);          offset += 2;
  header.writeUInt16LE(bitsPerSample, offset);       offset += 2;

  // data sub-chunk
  header.write('data', offset, 'ascii');            offset += 4;
  header.writeUInt32LE(dataLen, offset);             // offset += 4 (last field)

  return Buffer.concat([header, pcmData]);
}

/**
 * Manages per-session PCM chunk accumulation.
 */
export class AudioBufferManager {
  private buffers = new Map<string, Buffer[]>();
  private totalSizes = new Map<string, number>();

  append(sessionId: string, chunk: Buffer): void {
    if (!this.buffers.has(sessionId)) {
      this.buffers.set(sessionId, []);
      this.totalSizes.set(sessionId, 0);
    }
    this.buffers.get(sessionId)!.push(chunk);
    this.totalSizes.set(
      sessionId,
      (this.totalSizes.get(sessionId) ?? 0) + chunk.length,
    );
  }

  getSize(sessionId: string): number {
    return this.totalSizes.get(sessionId) ?? 0;
  }

  /**
   * Concatenate all buffered chunks, remove the entry, and return the combined buffer.
   * Returns null if there are no chunks for the given session.
   */
  flush(sessionId: string): Buffer | null {
    const chunks = this.buffers.get(sessionId);
    if (!chunks || chunks.length === 0) return null;
    const combined = Buffer.concat(chunks);
    this.buffers.delete(sessionId);
    this.totalSizes.delete(sessionId);
    return combined;
  }

  clear(sessionId: string): void {
    this.buffers.delete(sessionId);
    this.totalSizes.delete(sessionId);
  }

  hasSession(sessionId: string): boolean {
    return this.buffers.has(sessionId);
  }
}
