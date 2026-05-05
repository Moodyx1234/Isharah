"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/nav/Navbar";
import { LiveCaptions } from "@/components/captions/LiveCaptions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { textToGestureTokens, GESTURES } from "@/lib/sign-language/gestures";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, Wifi, WifiOff, MessageSquare, Loader2, Ear } from "lucide-react";

const SignAvatar = dynamic(
  () => import("@/components/avatar/SignAvatar").then((m) => m.SignAvatar),
  { ssr: false, loading: () => <AvatarPlaceholder /> }
);

function AvatarPlaceholder() {
  return (
    <div className="avatar-container w-full h-full rounded-2xl flex items-center justify-center">
      <Loader2 className="text-white/50 animate-spin" size={40} />
    </div>
  );
}

interface TranscriptEntry {
  id: string;
  text: string;
  simplified?: string;
  tokens?: string[];
  timestamp: Date;
}

export default function DeafStudentPage() {
  const t = useTranslations();
  const locale = useLocale();

  const [sessionCode, setSessionCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [currentGesture, setCurrentGesture] = useState("neutral");
  const [currentCaption, setCurrentCaption] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [handRaisedMsg, setHandRaisedMsg] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const gestureQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const playGestureQueue = useCallback(async () => {
    if (isPlayingRef.current || gestureQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    while (gestureQueueRef.current.length > 0) {
      const gesture = gestureQueueRef.current.shift()!;
      const gestureDef = GESTURES[gesture] || GESTURES.neutral;
      setCurrentGesture(gesture);
      await new Promise((r) => setTimeout(r, gestureDef.durationMs + 100));
    }
    setCurrentGesture("neutral");
    isPlayingRef.current = false;
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on(EVENTS.CONNECTED, () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));
    socket.on("session_joined", (data: { transcript: TranscriptEntry[] }) => {
      setJoined(true);
      if (data.transcript) setTranscript(data.transcript);
    });
    socket.on(EVENTS.SESSION_NOT_FOUND, () => setNotFound(true));
    socket.on(EVENTS.SESSION_ENDED, () => { setSessionEnded(true); setJoined(false); });
    socket.on(EVENTS.NEW_TRANSCRIPT, (entry: TranscriptEntry) => {
      setTranscript((prev) => [...prev, { ...entry, timestamp: new Date() }]);
      setCurrentCaption(entry.text);
      const tokens = entry.tokens?.length ? entry.tokens : textToGestureTokens(entry.simplified || entry.text);
      gestureQueueRef.current.push(...tokens);
      playGestureQueue();
      setTimeout(() => setCurrentCaption(""), entry.text.length * 80 + 1000);
    });
    socket.on(EVENTS.NEW_SLIDE, (data: { imageData: string }) => { setCurrentSlide(data.imageData); });
    return () => {
      socket.off("session_joined");
      socket.off(EVENTS.SESSION_NOT_FOUND);
      socket.off(EVENTS.SESSION_ENDED);
      socket.off(EVENTS.NEW_TRANSCRIPT);
      socket.off(EVENTS.NEW_SLIDE);
    };
  }, [playGestureQueue]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const joinSession = () => {
    if (!sessionCode.trim()) return;
    setNotFound(false);
    const socket = getSocket();
    socket.emit(EVENTS.JOIN_SESSION, { code: sessionCode.toUpperCase(), role: "deaf" });
  };

  const raiseHand = () => {
    if (!sessionCode) return;
    const socket = getSocket();
    socket.emit(EVENTS.RAISE_HAND, { code: sessionCode.toUpperCase() });
    setHandRaised(true);
    setHandRaisedMsg(true);
    setTimeout(() => setHandRaisedMsg(false), 3000);
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col hero-mesh">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            {/* Glass card */}
            <div className="rounded-3xl border border-white/15 bg-white/8 backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
              {/* Role icon */}
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-xl shadow-primary/40 ring-4 ring-primary/20">
                  <Ear size={28} className="text-white" aria-hidden />
                </div>
              </div>

              <h1 className="text-2xl font-black text-white text-center mb-2">
                {t("deaf_view.title")}
              </h1>
              <p className="text-white/50 text-center text-sm mb-7">
                {t("deaf_view.join_prompt")}
              </p>

              <AnimatePresence>
                {notFound && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-300 text-center">
                      {t("errors.session_not_found")}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <input
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder={t("session.code_placeholder")}
                  maxLength={6}
                  className="flex-1 h-12 rounded-xl border border-white/20 bg-white/10 px-4 text-center text-2xl font-mono tracking-[0.3em] uppercase text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                  onKeyDown={(e) => { if (e.key === "Enter") joinSession(); }}
                  aria-label={t("session.code")}
                />
                <button
                  onClick={joinSession}
                  className="h-12 px-5 rounded-xl bg-accent font-bold text-white shadow-lg shadow-accent/30 hover:bg-accent-dark transition-colors active:scale-[0.97] shrink-0"
                >
                  {t("common.join")}
                </button>
              </div>

              {sessionEnded && (
                <div className="mt-4 rounded-xl bg-yellow-500/15 border border-yellow-500/30 p-3 text-sm text-yellow-300 text-center">
                  {t("errors.session_ended")}
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5" id="main-content">

        {/* Status bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-black">{t("deaf_view.title")}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={connected ? "success" : "error"} className="gap-1">
              {connected
                ? <><Wifi size={10} sm:size={11} aria-hidden /><span className="text-xs">{t("session.connected")}</span></>
                : <><WifiOff size={10} sm:size={11} aria-hidden /><span className="text-xs">{t("session.connecting")}</span></>
              }
            </Badge>
            <div className="rounded-lg sm:rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium">
              {t("session.code")}: <strong className="font-mono ms-1">{sessionCode}</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Avatar + captions — 2/3 */}
          <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
            {/* Avatar */}
            <div className="rounded-lg sm:rounded-2xl overflow-hidden h-[300px] sm:h-[380px] md:h-[460px]">
              <SignAvatar
                currentGesture={currentGesture}
                isActive={joined && currentGesture !== "neutral"}
                label={t("deaf_view.avatar_label")}
              />
            </div>

            {/* Captions */}
            <LiveCaptions currentText={currentCaption} isLive={joined} />

            {/* Slide preview */}
            {currentSlide && (
              <div className="card p-3 sm:p-4">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  {locale === "ar" ? "الشريحة الحالية" : "Current Slide"}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentSlide}
                  alt={locale === "ar" ? "شريحة المحاضرة" : "Lecture slide"}
                  className="max-h-40 sm:max-h-44 object-contain rounded-lg w-full"
                />
              </div>
            )}

            {/* Raise hand */}
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <Button
                variant={handRaised ? "accent" : "outline"}
                size="lg"
                onClick={raiseHand}
                aria-label={t("deaf_view.raise_hand")}
                aria-pressed={handRaised}
                className="w-full sm:w-auto sm:px-10 h-10 sm:h-auto text-sm sm:text-base"
              >
                <Hand size={16} sm:size={20} aria-hidden />
                {t("deaf_view.raise_hand")}
              </Button>

              <AnimatePresence>
                {handRaisedMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium"
                    role="status"
                    aria-live="polite"
                  >
                    {t("deaf_view.hand_raised_msg")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Transcript sidebar */}
          <div className="card flex flex-col overflow-hidden max-h-[500px] sm:max-h-none">
            <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-[var(--card-border)] shrink-0">
              <div className="h-6 sm:h-7 w-6 sm:w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare size={13} sm:size={14} className="text-primary" aria-hidden />
              </div>
              <span className="font-bold text-xs sm:text-sm">{t("deaf_view.transcript")}</span>
            </div>

            <div
              className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 sm:gap-3"
              aria-live="polite"
            >
              {transcript.length === 0 ? (
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] py-4 text-center">
                  {t("deaf_view.transcript_empty")}
                </p>
              ) : (
                transcript.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg sm:rounded-xl bg-[var(--bg)] border border-[var(--card-border)] p-2.5 sm:p-3"
                  >
                    <p className="text-xs sm:text-sm leading-relaxed">{entry.text}</p>
                    {entry.simplified && entry.simplified !== entry.text && (
                      <p className="text-xs text-primary/60 mt-1 italic">{entry.simplified}</p>
                    )}
                  </motion.div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
