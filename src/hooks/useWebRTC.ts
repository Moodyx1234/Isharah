import { useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(socketRef: React.MutableRefObject<Socket | null>) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const _createPC = useCallback((targetId: string): RTCPeerConnection => {
    const existing = peersRef.current.get(targetId);
    if (existing) { existing.close(); }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current.set(targetId, pc);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketRef.current?.emit('webrtc-ice-candidate', { targetId, candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peersRef.current.delete(targetId);
      }
    };

    return pc;
  }, [socketRef]);

  /** Lecturer: create offer and send to student */
  const createOffer = useCallback(async (
    targetId: string,
    stream: MediaStream,
  ): Promise<void> => {
    const pc = _createPC(targetId);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('webrtc-offer', { targetId, offer: pc.localDescription });
  }, [_createPC, socketRef]);

  /** Student: handle incoming offer, create answer */
  const handleOffer = useCallback(async (
    fromId: string,
    offer: RTCSessionDescriptionInit,
    onStream: (stream: MediaStream) => void,
  ): Promise<void> => {
    const pc = _createPC(fromId);

    pc.ontrack = (ev) => {
      if (ev.streams[0]) onStream(ev.streams[0]);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit('webrtc-answer', { targetId: fromId, answer: pc.localDescription });
  }, [_createPC, socketRef]);

  /** Lecturer: handle student's answer */
  const handleAnswer = useCallback(async (
    fromId: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> => {
    const pc = peersRef.current.get(fromId);
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  /** Both: add ICE candidate from remote */
  const handleIceCandidate = useCallback(async (
    fromId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> => {
    const pc = peersRef.current.get(fromId);
    if (pc) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
    }
  }, []);

  /** Close all connections and stop local tracks */
  const closeAll = useCallback((localStream?: MediaStream | null): void => {
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    localStream?.getTracks().forEach(t => t.stop());
  }, []);

  return { peersRef, createOffer, handleOffer, handleAnswer, handleIceCandidate, closeAll };
}
