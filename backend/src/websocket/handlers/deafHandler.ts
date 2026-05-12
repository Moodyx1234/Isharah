import { WebSocket } from 'ws';
import type { ExtendedWebSocket, ServerMessage } from '@/types/websocket';
import type { GestureSequence } from '@/types/gestures';
import type { SessionRoom } from '@/types/session';

export const deafHandler = {
  sendGestures(
    room: SessionRoom,
    gestures: GestureSequence[],
    sentenceId: string,
    sentenceText: string,
  ): void {
    const msg = JSON.stringify({
      type: 'SIGN_GESTURE',
      payload: { gestures, sentenceId, sentenceText },
    } satisfies ServerMessage);

    for (const ws of room.deafClients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  },

  sendTranscriptUpdate(
    room: SessionRoom,
    entry: {
      id: string;
      text: string;
      simplified?: string;
      tokens?: string[];
      timestamp: string;
      sequenceNum: number;
    },
  ): void {
    const msg = JSON.stringify({
      type: 'TRANSCRIPT_UPDATE',
      payload: {
        id: entry.id,
        text: entry.text,
        simplified: entry.simplified,
        tokens: entry.tokens,
        timestamp: entry.timestamp,
        sequenceNum: entry.sequenceNum,
        isFinal: true,
      },
    } satisfies ServerMessage);

    for (const ws of room.deafClients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  },

  sendSessionEnded(room: SessionRoom): void {
    const msg = JSON.stringify({
      type: 'SESSION_ENDED',
      payload: { sessionId: room.sessionId },
    } satisfies ServerMessage);

    for (const ws of room.deafClients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  },
};
