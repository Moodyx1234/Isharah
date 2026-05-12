import type { SessionRoom } from '@/types/session';
import type { ExtendedWebSocket, ServerMessage } from '@/types/websocket';
import { WebSocket } from 'ws';

class NotificationService {
  sendToClient(ws: ExtendedWebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcastToAll(room: SessionRoom, message: ServerMessage): void {
    if (room.lecturerWs) {
      this.sendToClient(room.lecturerWs, message);
    }
    room.deafClients.forEach((ws) => this.sendToClient(ws, message));
    room.sightedClients.forEach((ws) => this.sendToClient(ws, message));
  }

  broadcastToDeaf(room: SessionRoom, message: ServerMessage): void {
    room.deafClients.forEach((ws) => this.sendToClient(ws, message));
  }

  broadcastToSighted(room: SessionRoom, message: ServerMessage): void {
    room.sightedClients.forEach((ws) => this.sendToClient(ws, message));
  }

  broadcastToLecturer(room: SessionRoom, message: ServerMessage): void {
    if (room.lecturerWs) {
      this.sendToClient(room.lecturerWs, message);
    }
  }

  notifyHandRaised(
    room: SessionRoom,
    enrollmentId: string,
    studentName: string,
    raised: boolean,
  ): void {
    this.broadcastToLecturer(room, {
      type: 'HAND_RAISED',
      payload: { enrollmentId, studentName, raised },
    });
  }

  notifyStudentCount(room: SessionRoom): void {
    const deaf = room.deafClients.size;
    const sighted = room.sightedClients.size;
    this.broadcastToLecturer(room, {
      type: 'STUDENT_COUNT',
      payload: { deaf, sighted, total: deaf + sighted },
    });
  }
}

export const notificationService = new NotificationService();
