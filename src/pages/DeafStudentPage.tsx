import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LiveCaptions } from "@/components/captions/LiveCaptions";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { textToGestureTokens, GESTURES } from "@/lib/sign-language/gestures";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, Wifi, WifiOff, MessageSquare, Loader2, Ear, ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const SignAvatar = lazy(() =>
  import("@/components/avatar/SignAvatar").then((m) => ({ default: m.SignAvatar }))
);

function AvatarPlaceholder() {
  return (
    <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.06)" }}>
      <Loader2 className="animate-spin" size={40} style={{ color: "rgba(99,102,241,0.4)" }} />
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

const INDIGO = "#6366f1";
const INDIGO_DARK = "#0d0f2a";
const INDIGO_MID = "#13174d";

export default function DeafStudentPage() {
  const { t, i18n } = useTranslation();
  const { locale = "ar" } = useParams<{ locale: string }>();
  const isAr = locale === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

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
      <div
        className="min-h-screen flex flex-col"
        style={{ background: `linear-gradient(160deg, ${INDIGO_DARK} 0%, #080b22 100%)` }}
      >
        <header className="flex items-center justify-between px-6 py-4">
          <Link
            to={`/${locale}/login`}
            className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm"
          >
            <BackArrow size={15} />
            {isAr ? "رجوع" : "Back"}
          </Link>
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: `${INDIGO}22`, color: INDIGO, border: `1px solid ${INDIGO}33` }}
          >
            <Ear size={13} />
            {isAr ? "طالب أصم" : "Deaf Student"}
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-sm"
          >
            <div
              className="rounded-3xl p-8 shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${INDIGO_MID} 0%, rgba(20,24,68,0.95) 100%)`,
                border: `1px solid ${INDIGO}33`,
                boxShadow: `0 25px 80px rgba(99,102,241,0.25)`,
              }}
            >
              <div className="flex justify-center mb-6">
                <div
                  className="relative h-16 w-16 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ background: `${INDIGO}22`, border: `1px solid ${INDIGO}55` }}
                >
                  <Ear size={30} style={{ color: INDIGO }} />
                  <span
                    className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                    style={{ border: `2px solid ${INDIGO}` }}
                  />
                </div>
              </div>

              <h1 className="text-2xl font-black text-white text-center mb-2">
                {t("deaf_view.title")}
              </h1>
              <p className="text-center text-sm mb-7" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                  className="flex-1 h-12 rounded-xl px-4 text-center text-2xl font-mono tracking-[0.3em] uppercase text-white placeholder:text-white/20 focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${INDIGO}44`,
                  }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = `${INDIGO}99`; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 2px ${INDIGO}33`; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = `${INDIGO}44`; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
                  onKeyDown={(e) => { if (e.key === "Enter") joinSession(); }}
                  aria-label={t("session.code")}
                />
                <button
                  onClick={joinSession}
                  className="h-12 px-5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.97] shrink-0"
                  style={{ background: INDIGO, boxShadow: `0 6px 24px ${INDIGO}55` }}
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
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, ${INDIGO_DARK} 0%, #080b22 100%)` }}
    >
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0" style={{ borderColor: `${INDIGO}22` }}>
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: `${INDIGO}22`, border: `1px solid ${INDIGO}44` }}
          >
            <Ear size={16} style={{ color: INDIGO }} />
          </div>
          <span className="text-white font-bold text-sm hidden sm:block">{t("deaf_view.title")}</span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: connected ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              color: connected ? "#10b981" : "#ef4444",
              border: `1px solid ${connected ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
            }}
          >
            {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>{connected ? t("session.connected") : t("session.connecting")}</span>
          </div>
          <div
            className="rounded-lg px-2.5 py-1 text-xs font-mono font-bold"
            style={{ background: `${INDIGO}18`, color: INDIGO, border: `1px solid ${INDIGO}33` }}
          >
            {sessionCode}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden" id="main-content">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative min-h-[300px] sm:min-h-[400px] lg:min-h-0">
            <Suspense fallback={<AvatarPlaceholder />}>
              <SignAvatar
                currentGesture={currentGesture}
                isActive={joined && currentGesture !== "neutral"}
                label={t("deaf_view.avatar_label")}
              />
            </Suspense>

            {currentCaption && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-xl rounded-2xl px-5 py-3 text-center text-sm sm:text-base font-medium text-white backdrop-blur-md"
                style={{ background: "rgba(13,15,42,0.88)", border: `1px solid ${INDIGO}44` }}
              >
                {currentCaption}
              </div>
            )}
          </div>

          {currentSlide && (
            <div className="p-3 border-t shrink-0" style={{ borderColor: `${INDIGO}22` }}>
              <img
                src={currentSlide}
                alt={isAr ? "شريحة المحاضرة" : "Lecture slide"}
                className="max-h-28 object-contain rounded-xl mx-auto"
              />
            </div>
          )}

          <div
            className="p-3 sm:p-4 border-t shrink-0 flex flex-col items-center gap-2"
            style={{ borderColor: `${INDIGO}22` }}
          >
            <button
              onClick={raiseHand}
              className="flex items-center gap-2 rounded-2xl px-6 sm:px-8 py-2.5 sm:py-3 text-sm font-bold transition-all active:scale-[0.97] shadow-lg"
              style={
                handRaised
                  ? { background: INDIGO, color: "#fff", boxShadow: `0 6px 24px ${INDIGO}55` }
                  : { background: `${INDIGO}18`, color: INDIGO, border: `1px solid ${INDIGO}44` }
              }
              aria-label={t("deaf_view.raise_hand")}
              aria-pressed={handRaised}
            >
              <Hand size={18} />
              {t("deaf_view.raise_hand")}
            </button>

            <AnimatePresence>
              {handRaisedMsg && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium"
                  style={{ color: "#10b981" }}
                  role="status"
                  aria-live="polite"
                >
                  {t("deaf_view.hand_raised_msg")}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div
          className="w-full lg:w-[340px] xl:w-[380px] flex flex-col border-t lg:border-t-0 lg:border-s shrink-0 max-h-[300px] lg:max-h-none"
          style={{ borderColor: `${INDIGO}22` }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
            style={{ borderColor: `${INDIGO}22` }}
          >
            <div
              className="h-6 w-6 rounded-lg flex items-center justify-center"
              style={{ background: `${INDIGO}22` }}
            >
              <MessageSquare size={13} style={{ color: INDIGO }} />
            </div>
            <span className="font-bold text-sm text-white">{t("deaf_view.transcript")}</span>
          </div>

          <div
            className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2"
            aria-live="polite"
          >
            {transcript.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "rgba(255,255,255,0.3)" }}>
                {t("deaf_view.transcript_empty")}
              </p>
            ) : (
              transcript.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-2.5 sm:p-3"
                  style={{ background: `${INDIGO}10`, border: `1px solid ${INDIGO}22` }}
                >
                  <p className="text-xs sm:text-sm leading-relaxed text-white/80">{entry.text}</p>
                  {entry.simplified && entry.simplified !== entry.text && (
                    <p className="text-xs mt-1 italic" style={{ color: `${INDIGO}99` }}>{entry.simplified}</p>
                  )}
                </motion.div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
}
