import type { ExtendedWebSocket } from './websocket';

export type SessionStatus = 'WAITING' | 'LIVE' | 'ENDED';
export type StudentType = 'DEAF' | 'SIGHTED';

export interface TranscriptLine {
  id: string;
  text: string;
  simplified?: string;
  tokens?: string[];
  timestamp: string;
  sequenceNum: number;
}

export interface SessionRoom {
  sessionId: string;
  code: string;
  title: string;
  subject?: string;
  lecturerId: string;
  lecturerWs: ExtendedWebSocket | null;
  deafClients:    Map<string, ExtendedWebSocket>;
  sightedClients: Map<string, ExtendedWebSocket>;
  transcriptBuffer: TranscriptLine[];
  sequenceNum: number;
  status: SessionStatus;
  lastSummary?: string;
  summaryCount: number;
  startedAt?: Date;
}

export interface StudentCounts {
  deaf: number;
  sighted: number;
  total: number;
}
