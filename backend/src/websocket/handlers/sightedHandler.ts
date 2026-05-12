import { WebSocket } from 'ws';
import type { ExtendedWebSocket, ServerMessage } from '@/types/websocket';
import type { SessionRoom } from '@/types/session';

export const sightedHandler = {
  sendCaption(
    room: SessionRoom,
    text: string,
    timestamp: string,
    isFinal: boolean,
  ): void {
    const msg = JSON.stringify({
      type: 'CAPTION_UPDATE',
      payload: { text, timestamp, isFinal },
    } satisfies ServerMessage);

    for (const ws of room.sightedClients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  },

  sendTranscript(
    room: SessionRoom,
    entry: {
      id: string;
      text: string;
      simplified?: string;
      tokens?: string[];
      timestamp: string;
      sequenceNum: number;
      isFinal: boolean;
    },
  ): void {
    const msg = JSON.stringify({
      type: 'TRANSCRIPT_UPDATE',
      payload: entry,
    } satisfies ServerMessage);

    for (const ws of room.sightedClients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  },

  sendSummary(room: SessionRoom, content: string, intervalNum: number): void {
    const msg = JSON.stringify({
      type: 'SUMMARY_UPDATE',
      payload: { content, intervalNum },
    } satisfies ServerMessage);

    for (const ws of room.sightedClients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  },

  sendKeyPoints(room: SessionRoom, points: string[]): void {
    const msg = JSON.stringify({
      type: 'KEYPOINTS_UPDATE',
      payload: { points },
    } satisfies ServerMessage);

    for (const ws of room.sightedClients.values()) {
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

    for (const ws of room.sightedClients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  },

  sendQuestionAnswer(
    ws: ExtendedWebSocket,
    question: string,
    answer: string,
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'QUESTION_ANSWER',
          payload: { question, answer },
        } satisfies ServerMessage),
      );
    }
  },
};
