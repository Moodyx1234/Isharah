import { useState, useEffect, useRef, useCallback } from "react";
import { wsClient, EVENTS } from "@/lib/socket-client";

export interface SessionEntry {
  id: string;
  text: string;
  simplified?: string;
  tokens?: string[];
  timestamp: Date;
  sequenceNum?: number;
}

interface Options {
  role: "deaf" | "blind" | "sighted";
  onJoined: (code: string, transcript: SessionEntry[]) => void;
}

export function useSessionJoin({ role, onJoined }: Options) {
  const [sessionCode,  setSessionCode]  = useState("");
  const [notFound,     setNotFound]     = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  const codeRef     = useRef("");
  const onJoinedRef = useRef(onJoined);
  useEffect(() => { codeRef.current     = sessionCode; }, [sessionCode]);
  useEffect(() => { onJoinedRef.current = onJoined;    }, [onJoined]);

  useEffect(() => {
    if (!wsClient.isConnected) wsClient.connect();

    const handleJoined = (data: unknown) => {
      const d = data as { sessionId: string; transcript?: Array<{ id: string; text: string; simplified?: string; tokens?: string[]; timestamp: string; sequenceNum?: number }> };
      wsClient.sessionId = d.sessionId;
      const transcript: SessionEntry[] = (d.transcript ?? []).map((e) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
      onJoinedRef.current(codeRef.current.toUpperCase(), transcript);
    };

    const handleError = (data: unknown) => {
      const d = data as { code: string };
      if (
        d.code === 'SESSION_NOT_FOUND' ||
        d.code === 'SESSION_ENDED'     ||
        d.code === 'NOT_FOUND'         ||
        d.code === 'INVALID_CODE'
      ) {
        setNotFound(true);
      }
    };

    const handleEnded = () => setSessionEnded(true);

    wsClient.on(EVENTS.SESSION_JOINED, handleJoined);
    wsClient.on(EVENTS.ERROR,          handleError);
    wsClient.on(EVENTS.SESSION_ENDED,  handleEnded);

    return () => {
      wsClient.off(EVENTS.SESSION_JOINED, handleJoined);
      wsClient.off(EVENTS.ERROR,          handleError);
      wsClient.off(EVENTS.SESSION_ENDED,  handleEnded);
    };
  }, []);

  // deaf → DEAF (receives SIGN_GESTURE + TRANSCRIPT_UPDATE with tokens)
  // blind/sighted → SIGHTED (receives CAPTION_UPDATE + SUMMARY_UPDATE)
  const studentType = role === 'deaf' ? 'DEAF' : 'SIGHTED';

  const joinSession = useCallback(() => {
    if (!sessionCode.trim()) return;
    setNotFound(false);
    wsClient.send('JOIN_SESSION', {
      code: sessionCode.toUpperCase(),
      studentType,
    });
  }, [sessionCode, studentType]);

  return { sessionCode, setSessionCode, notFound, sessionEnded, joinSession };
}
