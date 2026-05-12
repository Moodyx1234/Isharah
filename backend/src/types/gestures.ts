export interface GestureSequence {
  type: 'sign' | 'fingerspell';
  gestureId: string;
  word?: string;
  character?: string;
  durationMs: number;
  category?: string;
}

export interface GestureDefinition {
  gestureId: string;
  durationMs: number;
  category: string;
}

export interface HandshapeFrame {
  handshapeId: string;
  durationMs: number;
}

export interface TranscriptResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  language: string;
}
