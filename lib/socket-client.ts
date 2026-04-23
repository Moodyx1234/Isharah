"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    socket = io(url, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export const EVENTS = {
  // Lecturer → Server
  START_SESSION: "start_session",
  END_SESSION: "end_session",
  TRANSCRIPT_UPDATE: "transcript_update",
  SLIDE_UPDATE: "slide_update",
  SLIDE_DESCRIPTION: "slide_description",

  // Student → Server
  JOIN_SESSION: "join_session",
  RAISE_HAND: "raise_hand",
  LOWER_HAND: "lower_hand",

  // Server → Client
  SESSION_STARTED: "session_started",
  SESSION_ENDED: "session_ended",
  SESSION_NOT_FOUND: "session_not_found",
  STUDENT_JOINED: "student_joined",
  STUDENT_LEFT: "student_left",
  HAND_RAISED: "hand_raised",
  NEW_TRANSCRIPT: "new_transcript",
  NEW_SLIDE: "new_slide",
  NEW_SLIDE_DESCRIPTION: "new_slide_description",
  CONNECTED: "connect",
  DISCONNECTED: "disconnect",
} as const;
