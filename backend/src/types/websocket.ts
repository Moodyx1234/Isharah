import type { WebSocket } from 'ws';
import type { GestureSequence } from './gestures';
import type { TranscriptLine } from './session';

export type ClientType = 'LECTURER' | 'DEAF' | 'SIGHTED';

export interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  sessionId?: string;
  clientType?: ClientType;
  enrollmentId?: string;
  guestName?: string;
  _msgCount: number;
  _msgWindowStart: number;
}

export type ClientMessage =
  | { type: 'JOIN_AS_LECTURER'; payload: { sessionId: string } }
  | { type: 'JOIN_SESSION';     payload: { code: string; studentType: 'DEAF' | 'SIGHTED'; guestName?: string } }
  | { type: 'LEAVE_SESSION';   payload: { sessionId: string } }
  | { type: 'START_SESSION';   payload: { sessionId: string } }
  | { type: 'END_SESSION';     payload: { sessionId: string } }
  | { type: 'RAISE_HAND';      payload: { sessionId: string; raised: boolean } }
  | { type: 'ASK_QUESTION';    payload: { sessionId: string; question: string } }
  | { type: 'HEARTBEAT';       payload: { timestamp: number } };

export type ServerMessage =
  | { type: 'SESSION_JOINED';    payload: { sessionId: string; title: string; subject?: string; status: string; transcript: TranscriptLine[] } }
  | { type: 'SESSION_STARTED';   payload: { sessionId: string; startedAt: string } }
  | { type: 'SESSION_ENDED';     payload: { sessionId: string } }
  | { type: 'TRANSCRIPT_UPDATE'; payload: { id: string; text: string; simplified?: string; tokens?: string[]; timestamp: string; sequenceNum: number; isFinal: boolean } }
  | { type: 'SIGN_GESTURE';      payload: { gestures: GestureSequence[]; sentenceId: string; sentenceText: string } }
  | { type: 'CAPTION_UPDATE';    payload: { text: string; timestamp: string; isFinal: boolean } }
  | { type: 'SUMMARY_UPDATE';    payload: { content: string; intervalNum: number } }
  | { type: 'KEYPOINTS_UPDATE';  payload: { points: string[] } }
  | { type: 'QUESTION_ANSWER';   payload: { question: string; answer: string } }
  | { type: 'STUDENT_COUNT';     payload: { deaf: number; sighted: number; total: number } }
  | { type: 'HAND_RAISED';       payload: { enrollmentId: string; studentName: string; raised: boolean } }
  | { type: 'ERROR';             payload: { code: string; message: string } }
  | { type: 'HEARTBEAT_ACK';     payload: { timestamp: number } };
