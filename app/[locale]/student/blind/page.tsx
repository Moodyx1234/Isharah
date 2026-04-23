"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/nav/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Monitor, FileText, Wifi, WifiOff } from "lucide-react";

export default function BlindStudentPage() {
  const t = useTranslations();
  const locale = useLocale();

  const [sessionCode, setSessionCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentNarration, setCurrentNarration] = useState("");
  const [narrationHistory, setNarrationHistory] = useState<string[]>([]);
  const [slideDescription, setSlideDescription] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState<string | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState("");
  const [commandFeedback, setCommandFeedback] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastNarrationRef = useRef<string>("");
  const slideRef = useRef<string | null>(null);
  const narrationQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const hasGreetedRef = useRef(false);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  const speak = useCallback(
    (text: string, priority = false) => {
      if (!synthRef.current) return;

      if (priority) {
        synthRef.current.cancel();
        narrationQueueRef.current = [text];
      } else {
        narrationQueueRef.current.push(text);
      }

      const processQueue = () => {
        if (narrationQueueRef.current.length === 0) {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          return;
        }
        if (isSpeakingRef.current && !priority) return;

        const next = narrationQueueRef.current.shift()!;
        const utterance = new SpeechSynthesisUtterance(next);
        utterance.lang = locale === "ar" ? "ar-SA" : "en-US";
        utterance.rate = 0.95;
        utterance.pitch = 1;

        const voices = synthRef.current?.getVoices() || [];
        const langVoice = voices.find((v) =>
          locale === "ar" ? v.lang.startsWith("ar") : v.lang.startsWith("en")
        );
        if (langVoice) utterance.voice = langVoice;

        utterance.onstart = () => {
          isSpeakingRef.current = true;
          setIsSpeaking(true);
          setCurrentNarration(next);
          lastNarrationRef.current = next;
          setNarrationHistory((h) => [next, ...h].slice(0, 20));
        };
        utterance.onend = () => {
          isSpeakingRef.current = false;
          processQueue();
        };
        utterance.onerror = () => {
          isSpeakingRef.current = false;
          processQueue();
        };

        synthRef.current?.speak(utterance);
      };

      if (!isSpeakingRef.current || priority) {
        processQueue();
      }
    },
    [locale]
  );

  const announce = useCallback((text: string) => {
    setAriaAnnouncement(text);
    setTimeout(() => setAriaAnnouncement(""), 5000);
  }, []);

  useEffect(() => {
    if (!joined || hasGreetedRef.current) return;
    hasGreetedRef.current = true;

    const greeting =
      locale === "ar"
        ? "مرحباً! انضممت إلى الجلسة. اضغط مسافة للاستماع. اضغط D لوصف الشريحة. اضغط R لتكرار آخر نقطة. اضغط S للملخص."
        : "Welcome! You've joined the session. Press Space to toggle listening. Press D to describe the slide. Press R to repeat last point. Press S for summary.";
    speak(greeting, true);
  }, [joined, locale, speak]);

  useEffect(() => {
    const socket = getSocket();
    socket.on(EVENTS.CONNECTED, () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));

    socket.on("session_joined", () => setJoined(true));
    socket.on(EVENTS.SESSION_NOT_FOUND, () => setNotFound(true));
    socket.on(EVENTS.SESSION_ENDED, () => {
      setSessionEnded(true);
      setJoined(false);
      speak(locale === "ar" ? "انتهت الجلسة. شكراً لحضورك." : "Session ended. Thank you for attending.", true);
    });

    socket.on(EVENTS.NEW_TRANSCRIPT, (entry: { text: string }) => {
      speak(entry.text);
    });

    socket.on(EVENTS.NEW_SLIDE, (data: { imageData: string }) => {
      setCurrentSlide(data.imageData);
      slideRef.current = data.imageData;
      speak(locale === "ar" ? "المحاضر عرض شريحة جديدة." : "The lecturer showed a new slide.", true);
    });

    socket.on(EVENTS.NEW_SLIDE_DESCRIPTION, (data: { description: string }) => {
      setSlideDescription(data.description);
      speak(data.description, true);
      announce(data.description);
    });

    return () => {
      socket.off("session_joined");
      socket.off(EVENTS.SESSION_NOT_FOUND);
      socket.off(EVENTS.SESSION_ENDED);
      socket.off(EVENTS.NEW_TRANSCRIPT);
      socket.off(EVENTS.NEW_SLIDE);
      socket.off(EVENTS.NEW_SLIDE_DESCRIPTION);
    };
  }, [locale, speak, announce]);

  const handleVoiceCommand = useCallback(
    (command: string) => {
      const cmd = command.toLowerCase().trim();
      const isRepeat = cmd.includes("أعد") || cmd.includes("كرر") || cmd.includes("repeat") || cmd.includes("again");
      const isDescribe = cmd.includes("ماذا") || cmd.includes("وصف") || cmd.includes("what") || cmd.includes("describe");
      const isSummary = cmd.includes("ملخص") || cmd.includes("summary");
      const isPause = cmd.includes("توقف") || cmd.includes("pause") || cmd.includes("stop");

      if (isRepeat) {
        const text = locale === "ar" ? "تكرار: " : "Repeating: ";
        speak(text + (lastNarrationRef.current || (locale === "ar" ? "لا يوجد شيء للتكرار" : "Nothing to repeat")), true);
        setCommandFeedback(locale === "ar" ? "تكرار آخر نقطة..." : "Repeating last point...");
      } else if (isDescribe) {
        if (slideRef.current) {
          const msg = locale === "ar" ? "جارٍ وصف الشريحة..." : "Describing slide...";
          speak(msg, true);
          setCommandFeedback(msg);
          describeCurrentSlide();
        } else {
          const msg = locale === "ar" ? "لا توجد شريحة حالية" : "No current slide";
          speak(msg, true);
          setCommandFeedback(msg);
        }
      } else if (isSummary) {
        const msg = locale === "ar" ? "طلب الملخص..." : "Requesting summary...";
        speak(msg, true);
        setCommandFeedback(msg);
      } else if (isPause) {
        synthRef.current?.cancel();
        setIsSpeaking(false);
        setCommandFeedback(locale === "ar" ? "تم الإيقاف" : "Paused");
      }

      setTimeout(() => setCommandFeedback(""), 3000);
    },
    [locale, speak]
  );

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.lang = locale === "ar" ? "ar-SA" : "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      handleVoiceCommand(command);
    };

    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
    speak(locale === "ar" ? "استمع..." : "Listening...", true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const describeCurrentSlide = async () => {
    if (!slideRef.current) return;
    try {
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: slideRef.current, locale }),
      });
      const data = await res.json();
      if (data.description) {
        setSlideDescription(data.description);
        speak(data.description, true);
        announce(data.description);
      }
    } catch {
      speak(locale === "ar" ? "تعذر وصف الشريحة" : "Could not describe slide", true);
    }
  };

  useEffect(() => {
    if (!joined) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          toggleListening();
          break;
        case "r":
        case "R":
          e.preventDefault();
          speak((locale === "ar" ? "تكرار: " : "Repeating: ") + (lastNarrationRef.current || ""), true);
          announce(locale === "ar" ? "تكرار آخر نقطة" : "Repeating last point");
          break;
        case "d":
        case "D":
          e.preventDefault();
          describeCurrentSlide();
          announce(locale === "ar" ? "جارٍ وصف الشريحة" : "Describing slide");
          break;
        case "s":
        case "S":
          e.preventDefault();
          speak(locale === "ar" ? "طلب الملخص..." : "Requesting summary...", true);
          announce(locale === "ar" ? "طلب الملخص" : "Requesting summary");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [joined, locale, speak, announce]);

  const joinSession = () => {
    if (!sessionCode.trim()) return;
    setNotFound(false);
    const socket = getSocket();
    socket.emit(EVENTS.JOIN_SESSION, { code: sessionCode.toUpperCase(), role: "blind" });
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h1 className="text-2xl font-bold">{t("blind_view.title")}</h1>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-[var(--color-text-muted)]">{t("blind_view.join_prompt")}</p>
              {notFound && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
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
                  autoFocus
                />
                <Button onClick={joinSession} aria-label={t("session.join")}>
                  {t("common.join")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a14] text-white">
      {/* Aria live region */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaAnnouncement}
      </div>

      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 flex flex-col gap-8" id="main-content">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("blind_view.title")}</h1>
            <p className="text-white/60 mt-1 text-sm">{t("blind_view.welcome")}</p>
          </div>
          <Badge variant={connected ? "success" : "error"} className="gap-1.5">
            {connected ? <Wifi size={12} aria-hidden /> : <WifiOff size={12} aria-hidden />}
            {connected ? t("session.connected") : t("session.connecting")}
          </Badge>
        </div>

        {/* Main Controls */}
        <div className="flex flex-col items-center gap-6">
          {/* Big mic button */}
          <button
            onClick={toggleListening}
            aria-label={isListening ? t("blind_view.listening") : t("blind_view.not_listening")}
            aria-pressed={isListening}
            className={`relative h-36 w-36 rounded-full flex items-center justify-center text-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/70 ${
              isListening
                ? "bg-accent shadow-[0_0_0_8px_rgba(232,152,94,0.2),0_0_0_16px_rgba(232,152,94,0.1)]"
                : "bg-primary/80 border-2 border-primary hover:bg-primary"
            }`}
          >
            {isListening ? (
              <MicOff size={48} aria-hidden />
            ) : (
              <Mic size={48} aria-hidden />
            )}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-20" />
              </>
            )}
          </button>
          <p className="text-white/70 text-base font-medium">
            {isListening ? t("blind_view.listening") : t("blind_view.not_listening")}
          </p>

          {/* Command feedback */}
          <AnimatePresence>
            {commandFeedback && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-accent font-medium text-sm"
                role="status"
                aria-live="polite"
              >
                {commandFeedback}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ActionButton
            icon={<RotateCcw size={20} aria-hidden />}
            label={t("blind_view.repeat_btn")}
            shortcut="R"
            onClick={() => speak((locale === "ar" ? "تكرار: " : "Repeating: ") + lastNarrationRef.current, true)}
          />
          <ActionButton
            icon={<Monitor size={20} aria-hidden />}
            label={t("blind_view.describe_btn")}
            shortcut="D"
            onClick={describeCurrentSlide}
          />
          <ActionButton
            icon={<FileText size={20} aria-hidden />}
            label={locale === "ar" ? "ملخص" : "Summary"}
            shortcut="S"
            onClick={() => speak(locale === "ar" ? "طلب الملخص..." : "Requesting summary...", true)}
          />
          <ActionButton
            icon={isSpeaking ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}
            label={isSpeaking ? (locale === "ar" ? "إيقاف" : "Pause") : (locale === "ar" ? "تشغيل" : "Play")}
            shortcut="P"
            onClick={() => {
              if (isSpeaking) {
                synthRef.current?.cancel();
                setIsSpeaking(false);
              }
            }}
          />
        </div>

        {/* Current narration */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-medium text-white/50 mb-3 uppercase tracking-wider">
            {t("blind_view.current_narration")}
          </p>
          <p
            className={`text-xl leading-relaxed transition-colors ${
              isSpeaking ? "text-white" : "text-white/40"
            }`}
            aria-live="polite"
          >
            {currentNarration || t("blind_view.narration_empty")}
          </p>
          {isSpeaking && (
            <div className="flex items-end gap-1 mt-4 h-6" aria-hidden>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span
                  key={i}
                  className="waveform-bar w-1 bg-accent/70 rounded-full"
                  style={{ animationDelay: `${i * 0.08}s`, height: `${12 + (i % 3) * 6}px` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Keyboard shortcuts */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-medium text-white/50 mb-4 uppercase tracking-wider">
            {t("blind_view.keyboard_shortcuts")}
          </p>
          <dl className="grid grid-cols-2 gap-3">
            {[
              { key: "Space", desc: t("blind_view.shortcuts.space") },
              { key: "R", desc: t("blind_view.shortcuts.r") },
              { key: "D", desc: t("blind_view.shortcuts.d") },
              { key: "S", desc: t("blind_view.shortcuts.s") },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center gap-3">
                <kbd className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-mono font-bold text-white/80 border border-white/20">
                  {key}
                </kbd>
                <span className="text-sm text-white/60">{desc}</span>
              </div>
            ))}
          </dl>
        </div>

        {/* Slide description */}
        {slideDescription && (
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-6">
            <p className="text-xs font-medium text-accent/70 mb-2 uppercase tracking-wider">
              {locale === "ar" ? "وصف الشريحة الحالية" : "Current Slide Description"}
            </p>
            <p className="text-base leading-relaxed text-white/90">{slideDescription}</p>
          </div>
        )}

        {sessionEnded && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-center" role="alert">
            <p className="text-yellow-300">{t("errors.session_ended")}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label} (${shortcut})`}
      className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 hover:bg-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="text-white/80">{icon}</div>
      <span className="text-xs text-white/60 text-center leading-tight">{label}</span>
      <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-white/40 border border-white/10">
        {shortcut}
      </kbd>
    </button>
  );
}
