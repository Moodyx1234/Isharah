"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/nav/Navbar";
import { LiveCaptions } from "@/components/captions/LiveCaptions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { textToGestureTokens, GESTURES } from "@/lib/sign-language/gestures";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, Wifi, WifiOff, MessageSquare, Loader2 } from "lucide-react";

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

    socket.on(EVENTS.SESSION_ENDED, () => {
      setSessionEnded(true);
      setJoined(false);
    });

    socket.on(EVENTS.NEW_TRANSCRIPT, (entry: TranscriptEntry) => {
      setTranscript((prev) => [...prev, { ...entry, timestamp: new Date() }]);
      setCurrentCaption(entry.text);

      const tokens = entry.tokens?.length
        ? entry.tokens
        : textToGestureTokens(entry.simplified || entry.text);

      gestureQueueRef.current.push(...tokens);
      playGestureQueue();

      setTimeout(() => setCurrentCaption(""), entry.text.length * 80 + 1000);
    });

    socket.on(EVENTS.NEW_SLIDE, (data: { imageData: string }) => {
      setCurrentSlide(data.imageData);
    });

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
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">{t("deaf_view.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-[var(--color-text-muted)]">{t("deaf_view.join_prompt")}</p>
              {notFound && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                  {t("errors.session_not_found")}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder={t("session.code_placeholder")}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest uppercase"
                  onKeyDown={(e) => { if (e.key === "Enter") joinSession(); }}
                  aria-label={t("session.code")}
                />
                <Button onClick={joinSession} aria-label={t("session.join")}>
                  {t("common.join")}
                </Button>
              </div>

              {sessionEnded && (
                <div className="rounded-xl bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  {t("errors.session_ended")}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 flex flex-col gap-6">
        {/* Status bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">{t("deaf_view.title")}</h1>
          <div className="flex items-center gap-3">
            <Badge variant={connected ? "success" : "error"} className="gap-1.5">
              {connected ? (
                <><Wifi size={12} aria-hidden />{t("session.connected")}</>
              ) : (
                <><WifiOff size={12} aria-hidden />{t("session.connecting")}</>
              )}
            </Badge>
            <Badge variant="outline">
              {t("session.code")}: <strong className="ms-1 font-mono">{sessionCode}</strong>
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 flex-1">
          {/* Avatar — takes 2/3 on large screens */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* 3D Avatar */}
            <div className="h-[400px] md:h-[480px]">
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
              <div className="card p-4">
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">
                  {locale === "ar" ? "الشريحة الحالية" : "Current Slide"}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentSlide}
                  alt={locale === "ar" ? "شريحة المحاضرة" : "Lecture slide"}
                  className="max-h-48 object-contain rounded-lg w-full"
                />
              </div>
            )}

            {/* Raise hand button */}
            <div className="flex justify-center">
              <Button
                variant={handRaised ? "accent" : "outline"}
                size="lg"
                onClick={raiseHand}
                aria-label={t("deaf_view.raise_hand")}
                aria-pressed={handRaised}
              >
                <Hand size={20} aria-hidden />
                {t("deaf_view.raise_hand")}
              </Button>
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {handRaisedMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-sm text-green-600 font-medium"
                  role="status"
                  aria-live="polite"
                >
                  {t("deaf_view.hand_raised_msg")}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Transcript sidebar */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare size={18} aria-hidden />
                  {t("deaf_view.transcript")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="max-h-[600px] overflow-y-auto flex flex-col gap-3"
                  aria-live="polite"
                  aria-label={t("deaf_view.transcript")}
                >
                  {transcript.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                      {t("deaf_view.transcript_empty")}
                    </p>
                  ) : (
                    transcript.map((entry, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl bg-[var(--bg)] border border-[var(--card-border)] p-3"
                      >
                        <p className="text-sm leading-relaxed">{entry.text}</p>
                        {entry.simplified && entry.simplified !== entry.text && (
                          <p className="text-xs text-primary/70 mt-1 italic">
                            {entry.simplified}
                          </p>
                        )}
                      </motion.div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
