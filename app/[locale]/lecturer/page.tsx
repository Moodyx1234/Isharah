"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/nav/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { useSessionStore } from "@/lib/store";
import { generateSessionCode } from "@/lib/utils";
import { sampleTranscriptAr } from "@/lib/sample-transcript";
import {
  Mic, MicOff, Upload, Play, Square, Users, Hand,
  AlertCircle, Copy, Check, Loader2, ImageIcon, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type StudentInfo = { id: string; role: string; handRaised: boolean };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = any;

export default function LecturerPage() {
  const t = useTranslations();
  const locale = useLocale();
  const store = useSessionStore();

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [slideImage, setSlideImage] = useState<string | null>(null);
  const [slideDescription, setSlideDescription] = useState<string | null>(null);
  const [isDescribing, setIsDescribing] = useState(false);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [socketReady, setSocketReady] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const demoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on(EVENTS.CONNECTED, () => setSocketReady(true));
    socket.on(EVENTS.STUDENT_JOINED, (data: { id: string; role: string; count: number }) => {
      setStudents((prev) => [...prev, { id: data.id, role: data.role, handRaised: false }]);
    });
    socket.on(EVENTS.STUDENT_LEFT, (data: { id: string }) => {
      setStudents((prev) => prev.filter((s) => s.id !== data.id));
    });
    socket.on(EVENTS.HAND_RAISED, (data: { studentId: string }) => {
      setStudents((prev) =>
        prev.map((s) => (s.id === data.studentId ? { ...s, handRaised: true } : s))
      );
    });

    fetch("/api/describe", { method: "POST", body: JSON.stringify({ imageData: null, locale }) })
      .then((r) => r.json())
      .then((d) => { if (d.error?.includes("ANTHROPIC_API_KEY")) setApiMissing(true); })
      .catch(() => {});

    return () => {
      socket.off(EVENTS.STUDENT_JOINED);
      socket.off(EVENTS.STUDENT_LEFT);
      socket.off(EVENTS.HAND_RAISED);
    };
  }, [locale]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const startSession = () => {
    const code = generateSessionCode();
    const sessionId = `session_${Date.now()}`;
    setSessionCode(code);
    setIsSessionActive(true);
    setStudents([]);
    setTranscript([]);
    const socket = getSocket();
    socket.emit(EVENTS.START_SESSION, { code, sessionId });
  };

  const endSession = async () => {
    if (!sessionCode) return;
    stopRecording();
    stopDemo();

    const socket = getSocket();
    socket.emit(EVENTS.END_SESSION, { code: sessionCode });

    if (transcript.length > 0) {
      await generateSummary();
    }

    setIsSessionActive(false);
    setSessionCode(null);
    setStudents([]);
  };

  const startRecording = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec: SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicDenied(true);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicDenied(true);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = locale === "ar" ? "ar-SA" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }
      setCurrentText(interimText);
      if (finalText.trim()) {
        handleFinalTranscript(finalText.trim());
      }
    };

    rec.onerror = () => setMicDenied(true);

    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    setCurrentText("");
  };

  const handleFinalTranscript = async (text: string) => {
    setTranscript((prev) => [...prev, text]);

    if (!sessionCode) return;
    setIsRephrasing(true);

    try {
      const res = await fetch("/api/rephrase-for-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale }),
      });
      const data = await res.json();

      const socket = getSocket();
      socket.emit(EVENTS.TRANSCRIPT_UPDATE, {
        code: sessionCode,
        text,
        simplified: data.simplified,
        tokens: data.tokens,
      });
    } catch {
      const socket = getSocket();
      socket.emit(EVENTS.TRANSCRIPT_UPDATE, {
        code: sessionCode,
        text,
        simplified: text,
        tokens: [],
      });
    } finally {
      setIsRephrasing(false);
    }
  };

  const startDemo = () => {
    if (!sessionCode) return;
    setIsDemoRunning(true);
    const chunks = locale === "ar" ? sampleTranscriptAr : sampleTranscriptAr;
    chunks.forEach((chunk) => {
      const timer = setTimeout(async () => {
        const textToUse = locale === "ar" ? chunk.text : chunk.textEn;
        setTranscript((prev) => [...prev, textToUse]);
        setCurrentText(textToUse);
        await handleFinalTranscript(textToUse);
        setTimeout(() => setCurrentText(""), 2000);
      }, chunk.delayMs);
      demoTimersRef.current.push(timer);
    });

    const lastChunk = chunks[chunks.length - 1];
    const endTimer = setTimeout(() => {
      setIsDemoRunning(false);
      setCurrentText("");
    }, lastChunk.delayMs + 3000);
    demoTimersRef.current.push(endTimer);
  };

  const stopDemo = () => {
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [];
    setIsDemoRunning(false);
    setCurrentText("");
  };

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setSlideImage(imageData);

      const socket = getSocket();
      if (sessionCode) {
        socket.emit(EVENTS.SLIDE_UPDATE, { code: sessionCode, imageData });
      }

      if (isApiKeyConfigured()) {
        await describeSlide(imageData);
      }
    };
    reader.readAsDataURL(file);
  };

  const describeSlide = async (imageData: string) => {
    setIsDescribing(true);
    setSlideDescription(null);
    try {
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, locale }),
      });
      const data = await res.json();
      if (data.description) {
        setSlideDescription(data.description);
        if (sessionCode) {
          const socket = getSocket();
          socket.emit(EVENTS.SLIDE_DESCRIPTION, {
            code: sessionCode,
            description: data.description,
          });
        }
      }
    } catch {
      setSlideDescription(null);
    } finally {
      setIsDescribing(false);
    }
  };

  const generateSummary = async () => {
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.map((t, i) => ({ id: i.toString(), text: t })),
          locale,
        }),
      });
      const data = await res.json();
      store.setSummary(data);
    } catch {
      // silent
    }
  };

  const copyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const isApiKeyConfigured = () => !apiMissing;

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      deaf: locale === "ar" ? "أصم" : "Deaf",
      blind: locale === "ar" ? "كفيف" : "Blind",
      sighted: locale === "ar" ? "مبصر" : "Sighted",
    };
    return map[role] || role;
  };

  const roleColor = (role: string): "default" | "accent" | "success" => {
    if (role === "deaf") return "default";
    if (role === "blind") return "accent";
    return "success";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 flex flex-col gap-6" id="main-content">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("lecturer.title")}</h1>
            {isSessionActive && sessionCode && (
              <div className="flex items-center gap-2 mt-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" aria-hidden />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {t("session.active")}
                </span>
              </div>
            )}
          </div>

          {!isSessionActive ? (
            <Button onClick={startSession} size="lg">
              <Play size={18} aria-hidden />
              {t("session.start")}
            </Button>
          ) : (
            <Button onClick={endSession} variant="destructive" size="lg">
              <Square size={18} aria-hidden />
              {t("session.end")}
            </Button>
          )}
        </div>

        {/* API missing banner */}
        {apiMissing && (
          <div className="card border-warning bg-yellow-50 dark:bg-yellow-950 p-4 flex items-start gap-3">
            <AlertCircle className="text-warning shrink-0 mt-0.5" size={20} aria-hidden />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                {t("lecturer.api_missing")}
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                {t("lecturer.api_missing_desc")}
              </p>
            </div>
          </div>
        )}

        {/* Session Code */}
        {isSessionActive && sessionCode && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 flex flex-col sm:flex-row items-center gap-6"
          >
            <div className="flex-1 text-center sm:text-start">
              <p className="text-sm text-[var(--color-text-muted)] mb-1">{t("session.share_code")}</p>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-black tracking-widest text-primary">
                  {sessionCode}
                </span>
                <button
                  onClick={copyCode}
                  aria-label={codeCopied ? "Copied!" : "Copy session code"}
                  className="h-10 w-10 rounded-xl border border-[var(--card-border)] flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                >
                  {codeCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Users size={16} aria-hidden />
              <span>
                {students.length} {t("session.students_connected")}
              </span>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Mic + Demo controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic size={20} aria-hidden />
                  {t("lecturer.microphone")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {micDenied && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                    <AlertCircle size={16} aria-hidden />
                    {t("lecturer.mic_fallback")}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {isSessionActive && (
                    <>
                      {!isRecording ? (
                        <Button
                          onClick={startRecording}
                          disabled={isDemoRunning}
                          aria-label={t("lecturer.mic_start")}
                        >
                          <Mic size={18} aria-hidden />
                          {t("lecturer.mic_start")}
                        </Button>
                      ) : (
                        <Button
                          onClick={stopRecording}
                          variant="destructive"
                          aria-label={t("lecturer.mic_stop")}
                        >
                          <MicOff size={18} aria-hidden />
                          {t("lecturer.mic_stop")}
                          {/* Waveform indicator */}
                          <span className="flex items-end gap-0.5 h-4 ms-1" aria-hidden>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <span
                                key={i}
                                className="waveform-bar w-0.5 bg-white/80 rounded-full"
                                style={{ height: `${8 + Math.random() * 8}px` }}
                              />
                            ))}
                          </span>
                        </Button>
                      )}
                    </>
                  )}

                  {/* Demo Mode */}
                  <div className="flex items-center gap-2 ms-auto">
                    {isRephrasing && (
                      <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                        <Loader2 size={14} className="animate-spin" aria-hidden />
                        {t("lecturer.rephrasing")}
                      </span>
                    )}
                    {!isDemoRunning ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!isSessionActive) startSession();
                          setTimeout(startDemo, 300);
                        }}
                        aria-label={t("lecturer.demo_start")}
                      >
                        <Zap size={16} aria-hidden />
                        {t("lecturer.demo_start")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={stopDemo}
                        aria-label={t("lecturer.demo_stop")}
                      >
                        <Square size={16} aria-hidden />
                        {t("lecturer.demo_stop")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Current text preview */}
                {currentText && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm italic text-primary"
                    aria-live="polite"
                    aria-label="Live transcription preview"
                  >
                    {currentText}
                  </motion.div>
                )}

                {/* Transcript */}
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">
                    {t("lecturer.transcript")}
                  </p>
                  <div
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--bg)] min-h-[120px] max-h-64 overflow-y-auto p-4 flex flex-col gap-2"
                    aria-live="polite"
                    aria-label={t("lecturer.transcript")}
                  >
                    {transcript.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-muted)]">{t("lecturer.transcript_empty")}</p>
                    ) : (
                      transcript.map((entry, i) => (
                        <p key={i} className="text-sm leading-relaxed">
                          {entry}
                        </p>
                      ))
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slide Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon size={20} aria-hidden />
                  {t("lecturer.upload_slide")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div
                  className="rounded-xl border-2 border-dashed border-[var(--card-border)] hover:border-primary transition-colors cursor-pointer min-h-[160px] flex flex-col items-center justify-center gap-3 p-6 relative"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file?.type.startsWith("image/")) handleImageUpload(file);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  aria-label={t("lecturer.upload_hint")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                >
                  {slideImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slideImage}
                      alt="Uploaded slide"
                      className="max-h-48 object-contain rounded-lg"
                    />
                  ) : (
                    <>
                      <Upload size={32} className="text-[var(--color-text-muted)]" aria-hidden />
                      <p className="text-sm text-[var(--color-text-muted)] text-center">
                        {t("lecturer.upload_hint")}
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-hidden="true"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </div>

                {/* Slide samples */}
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--bg)] px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition-colors"
                      onClick={async () => {
                        const res = await fetch(`/sample-slides/slide-${n}.svg`);
                        const text = await res.text();
                        const blob = new Blob([text], { type: "image/svg+xml" });
                        const file = new File([blob], `slide-${n}.svg`, { type: "image/svg+xml" });
                        handleImageUpload(file);
                      }}
                    >
                      {locale === "ar" ? `شريحة ${n}` : `Sample ${n}`}
                    </button>
                  ))}
                </div>

                {/* Description */}
                {isDescribing && (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <Loader2 size={14} className="animate-spin" aria-hidden />
                    {t("lecturer.processing")}
                  </div>
                )}
                {slideDescription && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                    <p className="text-xs font-medium text-primary mb-1">{t("lecturer.slide_described")}</p>
                    <p className="text-sm leading-relaxed">{slideDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Students */}
          <div className="flex flex-col gap-6">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} aria-hidden />
                  {t("lecturer.students")}
                  {students.length > 0 && (
                    <Badge variant="default" className="ms-auto">
                      {students.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
                    {t("session.no_students")}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3" role="list" aria-label={t("lecturer.students")}>
                    <AnimatePresence>
                      {students.map((s) => (
                        <motion.li
                          key={s.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg)] p-3"
                        >
                          <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {s.role[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge variant={roleColor(s.role)} className="text-xs">
                              {roleLabel(s.role)}
                            </Badge>
                          </div>
                          {s.handRaised && (
                            <span
                              className="flex items-center gap-1 text-xs text-accent font-medium"
                              aria-label={t("lecturer.hand_raised")}
                            >
                              <Hand size={14} aria-hidden />
                            </span>
                          )}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Demo Mode Info */}
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Zap size={20} className="text-accent shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="font-semibold text-sm mb-1">{t("lecturer.demo_mode")}</p>
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                      {t("lecturer.demo_mode_desc")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
