import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWebRTC } from './useWebRTC';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShareMode = 'none' | 'screen' | 'file';
export type Role = 'lecturer' | 'deaf' | 'blind' | 'sighted';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SharedFile {
  fileId:       string;
  type:         'pdf' | 'image';
  url:          string;
  filename:     string;
  totalSlides?: number;
  slides?:      string[];
}

export interface SessionState {
  isLive:      boolean;
  shareMode:   ShareMode;
  currentFile: SharedFile | null;
  currentSlide: number;
  totalSlides:  number;
}

export interface ConnectedUser {
  socketId:   string;
  role:       Role;
  userId:     string;
  userName:   string;
  handRaised: boolean;
}

export interface HandRaisedEvent {
  socketId: string;
  userId:   string;
  userName: string;
}

const SOCKET_URL = (import.meta.env['VITE_SOCKET_URL'] as string | undefined) ?? '';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSession(
  sessionCode: string,
  role: Role,
  userId: string,
  userName: string,
) {
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [handRaised, setHandRaised] = useState(false);

  const [sessionState, setSessionState] = useState<SessionState>({
    isLive: false, shareMode: 'none', currentFile: null, currentSlide: 0, totalSlides: 0,
  });
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUsers>([]);
  const [raisedHands, setRaisedHands] = useState<HandRaisedEvent[]>([]);

  const { createOffer, handleOffer, handleAnswer, handleIceCandidate, closeAll } =
    useWebRTC(socketRef);

  // ── Socket.io connection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionCode) return;

    const socket = io(`${SOCKET_URL}/share`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setErrorMsg(null);
      socket.emit('join-session', { sessionCode, role, userId, userName });
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
      setErrorMsg('تعذّر الاتصال بالخادم — تحقق من اتصالك بالإنترنت');
    });

    socket.on('disconnect', () => setConnectionStatus('disconnected'));

    // ── Session state sync ─────────────────────────────────────────────────
    socket.on('session-state', (state: {
      shareMode: ShareMode; currentFile: SharedFile | null;
      currentSlide: number; isLive: boolean; connectedUsers: ConnectedUser[];
    }) => {
      setSessionState({
        isLive:       state.isLive,
        shareMode:    state.shareMode,
        currentFile:  state.currentFile,
        currentSlide: state.currentSlide,
        totalSlides:  state.currentFile?.totalSlides ?? 0,
      });
      setConnectedUsers(state.connectedUsers);
    });

    socket.on('user-joined', (user: ConnectedUser) => {
      setConnectedUsers(prev => [...prev.filter(u => u.socketId !== user.socketId), user]);
    });

    socket.on('user-left', ({ socketId }: { socketId: string }) => {
      setConnectedUsers(prev => prev.filter(u => u.socketId !== socketId));
      setRaisedHands(prev => prev.filter(h => h.socketId !== socketId));
    });

    // ── Share mode events (students) ───────────────────────────────────────
    socket.on('share-mode-changed', ({ shareMode }: { shareMode: ShareMode }) => {
      setSessionState(prev => ({ ...prev, shareMode }));
    });

    socket.on('share-stopped', () => {
      setSessionState(prev => ({ ...prev, shareMode: 'none', currentFile: null, currentSlide: 0 }));
      setRemoteStream(null);
    });

    socket.on('file-shared', (file: SharedFile) => {
      setSessionState(prev => ({
        ...prev,
        shareMode:    'file',
        currentFile:  file,
        currentSlide: 0,
        totalSlides:  file.totalSlides ?? 1,
      }));
    });

    socket.on('slide-changed', ({ slideIndex }: { slideIndex: number }) => {
      setSessionState(prev => ({ ...prev, currentSlide: slideIndex }));
    });

    socket.on('session-ended', () => {
      setSessionState(prev => ({ ...prev, isLive: false, shareMode: 'none' }));
      setRemoteStream(null);
    });

    // ── WebRTC (lecturer side) ─────────────────────────────────────────────
    socket.on('create-offers-for', async ({ studentIds }: { studentIds: string[] }) => {
      if (!localStreamRef.current) return;
      for (const sid of studentIds) {
        try {
          await createOffer(sid, localStreamRef.current);
        } catch { /* individual peer failure doesn't kill session */ }
      }
    });

    socket.on('new-student-for-webrtc', async ({ studentId }: { studentId: string }) => {
      if (!localStreamRef.current) return;
      try { await createOffer(studentId, localStreamRef.current); } catch { /* */ }
    });

    // ── WebRTC (student side) ──────────────────────────────────────────────
    socket.on('webrtc-offer', async ({ fromId, offer }: {
      fromId: string; offer: RTCSessionDescriptionInit;
    }) => {
      try {
        await handleOffer(fromId, offer, (stream) => setRemoteStream(stream));
      } catch { /* */ }
    });

    socket.on('webrtc-answer', async ({ fromId, answer }: {
      fromId: string; answer: RTCSessionDescriptionInit;
    }) => {
      try { await handleAnswer(fromId, answer); } catch { /* */ }
    });

    socket.on('webrtc-ice-candidate', async ({ fromId, candidate }: {
      fromId: string; candidate: RTCIceCandidateInit;
    }) => {
      try { await handleIceCandidate(fromId, candidate); } catch { /* */ }
    });

    // ── Hand raise events ──────────────────────────────────────────────────
    socket.on('hand-raised', (ev: HandRaisedEvent) => {
      setRaisedHands(prev => [...prev.filter(h => h.socketId !== ev.socketId), ev]);
      setConnectedUsers(prev => prev.map(u =>
        u.socketId === ev.socketId ? { ...u, handRaised: true } : u));
    });

    socket.on('hand-lowered', ({ socketId }: { socketId: string }) => {
      setRaisedHands(prev => prev.filter(h => h.socketId !== socketId));
      setConnectedUsers(prev => prev.map(u =>
        u.socketId === socketId ? { ...u, handRaised: false } : u));
    });

    socket.on('hand-acknowledged', () => {
      setHandRaised(false);
    });

    socket.on('error', ({ message }: { message: string }) => {
      setErrorMsg(message);
    });

    return () => {
      closeAll(localStreamRef.current);
      localStreamRef.current = null;
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, role, userId, userName]);

  // ── Lecturer actions ────────────────────────────────────────────────────────

  const startScreenShare = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      socketRef.current?.emit('start-screen-share');

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });
    } catch (err: unknown) {
      const msg = (err as Error)?.name === 'NotAllowedError'
        ? 'تم رفض إذن مشاركة الشاشة. اسمح بالمشاركة من إعدادات المتصفح.'
        : 'تعذّر بدء مشاركة الشاشة — حاول مجدداً';
      setErrorMsg(msg);
      throw new Error(msg);
    }
  }, []);

  const stopScreenShare = useCallback((): void => {
    closeAll(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setSessionState(prev => ({ ...prev, shareMode: 'none' }));
    socketRef.current?.emit('stop-screen-share');
  }, [closeAll]);

  const uploadAndShareFile = useCallback(async (
    file: File,
    sessionCodeForUpload: string,
    onProgress: (pct: number) => void,
  ): Promise<SharedFile> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result: SharedFile = JSON.parse(xhr.responseText);
          socketRef.current?.emit('share-file', result);
          setSessionState(prev => ({
            ...prev,
            shareMode:    'file',
            currentFile:  result,
            currentSlide: 0,
            totalSlides:  result.totalSlides ?? 1,
          }));
          resolve(result);
        } else {
          let msg = 'فشل رفع الملف';
          try { msg = JSON.parse(xhr.responseText)?.error ?? msg; } catch { /* */ }
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => reject(new Error('فشل رفع الملف — تحقق من الاتصال'));
      xhr.open('POST', `/api/upload/${sessionCodeForUpload}`);
      xhr.send(formData);
    });
  }, []);

  const goToSlide = useCallback((index: number): void => {
    setSessionState(prev => {
      const maxIdx = Math.max(0, (prev.totalSlides ?? 1) - 1);
      const clamped = Math.max(0, Math.min(index, maxIdx));
      socketRef.current?.emit('change-slide', { slideIndex: clamped });
      return { ...prev, currentSlide: clamped };
    });
  }, []);

  const nextSlide = useCallback((): void => {
    setSessionState(prev => {
      const next = Math.min(prev.currentSlide + 1, (prev.totalSlides ?? 1) - 1);
      socketRef.current?.emit('change-slide', { slideIndex: next });
      return { ...prev, currentSlide: next };
    });
  }, []);

  const prevSlide = useCallback((): void => {
    setSessionState(prev => {
      const prev2 = Math.max(0, prev.currentSlide - 1);
      socketRef.current?.emit('change-slide', { slideIndex: prev2 });
      return { ...prev, currentSlide: prev2 };
    });
  }, []);

  const stopSharing = useCallback((): void => {
    if (localStreamRef.current) {
      closeAll(localStreamRef.current);
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setSessionState(prev => ({ ...prev, shareMode: 'none', currentFile: null, currentSlide: 0 }));
    socketRef.current?.emit('stop-sharing');
  }, [closeAll]);

  /** Emit share-file event with an already-uploaded file result */
  const shareFileData = useCallback((file: SharedFile): void => {
    socketRef.current?.emit('share-file', file);
    setSessionState(prev => ({
      ...prev,
      shareMode:    'file',
      currentFile:  file,
      currentSlide: 0,
      totalSlides:  file.totalSlides ?? 1,
    }));
  }, []);

  const acknowledgeHand = useCallback((studentId: string): void => {
    socketRef.current?.emit('acknowledge-hand', { studentId });
  }, []);

  // ── Student actions ─────────────────────────────────────────────────────────

  const raiseHand = useCallback((): void => {
    setHandRaised(true);
    socketRef.current?.emit('raise-hand', { userName });
  }, [userName]);

  const lowerHand = useCallback((): void => {
    setHandRaised(false);
    socketRef.current?.emit('lower-hand');
  }, []);

  return {
    sessionState,
    connectedUsers,
    raisedHands,
    remoteStream,
    localStream,
    connectionStatus,
    errorMsg,
    handRaised,
    // Lecturer
    startScreenShare,
    stopScreenShare,
    uploadAndShareFile,
    shareFileData,
    goToSlide,
    nextSlide,
    prevSlide,
    stopSharing,
    acknowledgeHand,
    // Student
    raiseHand,
    lowerHand,
  };
}

type ConnectedUsers = ConnectedUser[];
