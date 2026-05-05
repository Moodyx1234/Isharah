import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/nav/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { useSessionStore } from "@/lib/store";
import { generateSessionCode } from "@/lib/utils";
import { sampleTranscriptAr } from "@/lib/sample-transcript";
import {
  Mic, MicOff, Upload, Play, Square, Users, Hand,
  AlertCircle, Copy, Check, Loader2, ImageIcon, Zap,
  Radio, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type StudentInfo = { id: string; role: string; handRaised: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = any;

export default function LecturerPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
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
  const [micDenied, setMicDenied] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const demoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on(EVENTS.CONNECTED, () => {});
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
    if (transcript.length > 0) await generateSummary();
    setIsSessionActive(false);
    setSessionCode(null);
    setStudents([]);
  };

  const startRecording = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec: SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) { setMicDenied(true); return; }
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
        if (result.isFinal) finalText += result[0].transcript + " ";
        else interimText += result[0].transcript;
      }
      setCurrentText(interimText);
      if (finalText.trim()) handleFinalTranscript(finalText.trim());
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
      socket.emit(EVENTS.TRANSCRIPT_UPDATE, { code: sessionCode, text, simplified: data.simplified, tokens: data.tokens });
    } catch {
      const socket = getSocket();
      socket.emit(EVENTS.TRANSCRIPT_UPDATE, { code: sessionCode, text, simplified: text, tokens: [] });
    } finally {
      setIsRephrasing(false);
    }
  };

  const startDemo = () => {
    if (!sessionCode) return;
    setIsDemoRunning(true);
    const chunks = sampleTranscriptAr;
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
    const endTimer = setTimeout(() => { setIsDemoRunning(false); setCurrentText(""); }, lastChunk.delayMs + 3000);
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
      if (sessionCode) socket.emit(EVENTS.SLIDE_UPDATE, { code: sessionCode, imageData });
      await describeSlide(imageData);
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
          socket.emit(EVENTS.SLIDE_DESCRIPTION, { code: sessionCode, description: data.description });
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
        body: JSON.stringify({ transcript: transcript.map((t, i) => ({ id: i.toString(), text: t })), locale }),
      });
      const data = await res.json();
      store.setSummary(data);
    } catch { /* silent */ }
  };

  const copyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

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
    <div className="min-h-screen flex flex-col" style={{ background: "#060e0e" }}>
      <Navbar />

      {isSessionActive && sessionCode && (
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-2 sm:py-2.5 border-b text-xs sm:text-sm font-mono"
          style={{ background: "rgba(6,14,14,0.95)", borderColor: "rgba(20,184,166,0.2)", backdropFilter: "blur(8px)" }}
        >
          <span style={{ color: "rgba(255,255,255,0.4)" }}>
            {locale === "ar" ? "كود الجلسة" : "Session Code"}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-lg sm:text-2xl font-black tracking-[0.25em]"
              style={{ color: "#14b8a6" }}
            >
              {sessionCode}
            </span>
            <button
              onClick={copyCode}
              aria-label={codeCopied ? "Copied!" : "Copy session code"}
              className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)" }}
            >
              {codeCopied ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} style={{ color: "#14b8a6" }} />}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span style={{ color: "#14b8a6" }}>
              {students.length} {locale === "ar" ? "طالب" : "students"}
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6 md:py-8 flex flex-col gap-4 sm:gap-5 md:gap-6" id="main-content">

        <div className="relative overflow-hidden rounded-lg sm:rounded-2xl p-4 sm:p-6 md:p-8" style={{ background: "linear-gradient(135deg, #041a1a 0%, #063030 50%, #082e2e 100%)", border: "1px solid rgba(20,184,166,0.2)" }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 end-0 w-40 h-40 sm:w-56 md:w-72 sm:h-56 md:h-72 rounded-full bg-accent/15 blur-2xl sm:blur-3xl" />
            <div className="absolute bottom-0 start-0 w-32 h-32 sm:w-48 md:w-56 sm:h-48 md:h-56 rounded-full bg-teal-400/10 blur-xl sm:blur-2xl" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Radio size={14} className="text-white/50 shrink-0" aria-hidden />
                <span className="text-white/50 text-xs font-medium uppercase tracking-wider truncate">
                  {locale === "ar" ? "لوحة التحكم" : "Dashboard"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white truncate">{t("lecturer.title")}</h1>
              {isSessionActive && sessionCode && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" aria-hidden />
                  <span className="text-white/70 text-xs sm:text-sm truncate">{t("session.active")}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
              {!isDemoRunning ? (
                <button
                  onClick={() => { if (!isSessionActive) { startSession(); setTimeout(startDemo, 400); } else startDemo(); }}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-white/20 bg-white/10 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-white/20 transition-colors backdrop-blur-sm whitespace-nowrap"
                  aria-label={t("lecturer.demo_start")}
                >
                  <Zap size={15} aria-hidden />
                  <span className="hidden sm:inline">{t("lecturer.demo_start")}</span>
                  <span className="sm:hidden">Demo</span>
                </button>
              ) : (
                <button
                  onClick={stopDemo}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-white/20 bg-white/10 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-white/20 transition-colors whitespace-nowrap"
                >
                  <Square size={15} aria-hidden />
                  <span className="hidden sm:inline">{t("lecturer.demo_stop")}</span>
                  <span className="sm:hidden">Stop</span>
                </button>
              )}

              {!isSessionActive ? (
                <button
                  onClick={startSession}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-white px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-primary shadow-lg hover:bg-white/90 transition-colors active:scale-[0.97] whitespace-nowrap"
                >
                  <Play size={16} aria-hidden />
                  {t("session.start")}
                </button>
              ) : (
                <button
                  onClick={endSession}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-red-500 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-red-600 transition-colors active:scale-[0.97] whitespace-nowrap"
                >
                  <Square size={16} aria-hidden />
                  {t("session.end")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-5 md:gap-6">

            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5" style={{ background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="flex items-center gap-2 sm:gap-2.5 text-sm sm:text-base font-bold text-white">
                  <div className="h-7 sm:h-8 w-7 sm:w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(20,184,166,0.15)" }}>
                    <Mic size={16} style={{ color: "#14b8a6" }} aria-hidden />
                  </div>
                  {t("lecturer.microphone")}
                </h2>
                {isRephrasing && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <Loader2 size={12} className="animate-spin" aria-hidden />
                    {t("lecturer.rephrasing")}
                  </span>
                )}
              </div>

              {micDenied && (
                <div className="rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-2.5 sm:p-3 flex items-start gap-2 text-xs sm:text-sm text-red-700 dark:text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span>{t("lecturer.mic_fallback")}</span>
                </div>
              )}

              {isSessionActive && (
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      disabled={isDemoRunning}
                      aria-label={t("lecturer.mic_start")}
                      size="md"
                      className="text-xs sm:text-base h-9 sm:h-11 px-3 sm:px-6"
                    >
                      <Mic size={17} aria-hidden />
                      <span className="hidden sm:inline">{t("lecturer.mic_start")}</span>
                      <span className="sm:hidden">Start</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      variant="destructive"
                      aria-label={t("lecturer.mic_stop")}
                      size="md"
                      className="text-xs sm:text-base h-9 sm:h-11 px-3 sm:px-6"
                    >
                      <MicOff size={17} aria-hidden />
                      <span className="hidden sm:inline">{t("lecturer.mic_stop")}</span>
                      <span className="sm:hidden">Stop</span>
                      <span className="flex items-end gap-0.5 h-3.5 ms-1" aria-hidden>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className="waveform-bar w-0.5 bg-white/80 rounded-full" style={{ height: `${6 + (i % 3) * 3}px` }} />
                        ))}
                      </span>
                    </Button>
                  )}
                </div>
              )}

              <AnimatePresence>
                {currentText && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="rounded-lg sm:rounded-xl border border-primary/20 bg-primary/5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm italic text-primary"
                      aria-live="polite"
                    >
                      {currentText}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {t("lecturer.transcript")}
                </p>
                <div
                  className="rounded-lg sm:rounded-xl min-h-[80px] sm:min-h-[100px] max-h-48 sm:max-h-56 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 text-xs sm:text-sm"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(20,184,166,0.12)" }}
                  aria-live="polite"
                >
                  {transcript.length === 0 ? (
                    <p className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>{t("lecturer.transcript_empty")}</p>
                  ) : (
                    transcript.map((entry, i) => (
                      <p key={i} className="leading-relaxed pb-1.5 sm:pb-2 last:pb-0 text-white/70 border-b last:border-0" style={{ borderColor: "rgba(20,184,166,0.1)" }}>
                        {entry}
                      </p>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5" style={{ background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <h2 className="flex items-center gap-2 sm:gap-2.5 text-sm sm:text-base font-bold text-white">
                <div className="h-7 sm:h-8 w-7 sm:w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(20,184,166,0.15)" }}>
                  <ImageIcon size={16} style={{ color: "#14b8a6" }} aria-hidden />
                </div>
                {t("lecturer.upload_slide")}
              </h2>

              <div
                className="rounded-lg sm:rounded-xl border-2 border-dashed cursor-pointer min-h-[100px] sm:min-h-[140px] flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 relative transition-colors"
                style={{ borderColor: "rgba(20,184,166,0.2)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(20,184,166,0.5)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(20,184,166,0.2)"; }}
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
                  <img src={slideImage} alt="Uploaded slide" className="max-h-32 sm:max-h-44 object-contain rounded-lg" />
                ) : (
                  <>
                    <div className="h-10 sm:h-12 w-10 sm:w-12 rounded-lg flex items-center justify-center" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
                      <Upload size={20} style={{ color: "rgba(20,184,166,0.6)" }} aria-hidden />
                    </div>
                    <p className="text-xs sm:text-sm text-center" style={{ color: "rgba(255,255,255,0.35)" }}>{t("lecturer.upload_hint")}</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-hidden="true"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }}
                />
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {locale === "ar" ? "نماذج:" : "Samples:"}
                </span>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className="rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                    style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.15)", color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#14b8a6"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(20,184,166,0.4)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(20,184,166,0.15)"; }}
                    onClick={async () => {
                      const res = await fetch(`/sample-slides/slide-${n}.svg`);
                      const text = await res.text();
                      const blob = new Blob([text], { type: "image/svg+xml" });
                      const file = new File([blob], `slide-${n}.svg`, { type: "image/svg+xml" });
                      handleImageUpload(file);
                    }}
                  >
                    {locale === "ar" ? `ش${n}` : `S${n}`}
                  </button>
                ))}
              </div>

              {isDescribing && (
                <div className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: "#14b8a6" }}>
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  {t("lecturer.processing")}
                </div>
              )}
              {slideDescription && (
                <div className="rounded-lg sm:rounded-xl p-3 sm:p-4" style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.2)" }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#14b8a6" }}>{t("lecturer.slide_described")}</p>
                  <p className="text-xs sm:text-sm leading-relaxed text-white/75">{slideDescription}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:gap-5 md:gap-6">
            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5 flex-1" style={{ background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <div className="flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4 flex-wrap">
                <div className="h-7 sm:h-8 w-7 sm:w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(20,184,166,0.15)" }}>
                  <Users size={16} style={{ color: "#14b8a6" }} aria-hidden />
                </div>
                <span className="font-bold text-sm sm:text-base text-white">{t("lecturer.students")}</span>
                {students.length > 0 && (
                  <span className="ms-auto rounded-full text-xs font-bold px-2 sm:px-2.5 py-0.5 shrink-0" style={{ background: "rgba(20,184,166,0.2)", color: "#14b8a6" }}>
                    {students.length}
                  </span>
                )}
              </div>

              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 sm:py-8 gap-2">
                  <div className="h-10 sm:h-12 w-10 sm:w-12 rounded-full flex items-center justify-center" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.15)" }}>
                    <Users size={20} style={{ color: "rgba(20,184,166,0.5)" }} aria-hidden />
                  </div>
                  <p className="text-xs sm:text-sm text-center" style={{ color: "rgba(255,255,255,0.35)" }}>{t("session.no_students")}</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2 sm:gap-2.5" role="list" aria-label={t("lecturer.students")}>
                  <AnimatePresence>
                    {students.map((s) => (
                      <motion.li
                        key={s.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl p-2.5 sm:p-3"
                        style={{ background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.12)" }}
                      >
                        <div className="h-8 sm:h-9 w-8 sm:w-9 rounded-lg gradient-primary flex items-center justify-center text-white text-xs sm:text-sm font-black shrink-0">
                          {s.role[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant={roleColor(s.role)} className="text-xs">
                            {roleLabel(s.role)}
                          </Badge>
                        </div>
                        {s.handRaised && (
                          <span className="flex items-center gap-1 text-xs text-accent font-medium shrink-0" aria-label={t("lecturer.hand_raised")}>
                            <Hand size={14} aria-hidden />
                          </span>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-5" style={{ background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.2)" }}>
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="h-8 sm:h-9 w-8 sm:w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(20,184,166,0.15)" }}>
                  <Zap size={18} style={{ color: "#14b8a6" }} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs sm:text-sm mb-0.5 text-white">{t("lecturer.demo_mode")}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{t("lecturer.demo_mode_desc")}</p>
                  <button
                    onClick={() => { if (!isSessionActive) { startSession(); setTimeout(startDemo, 400); } else { if (isDemoRunning) stopDemo(); else startDemo(); } }}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    style={{ color: "#14b8a6" }}
                  >
                    {isDemoRunning ? t("lecturer.demo_stop") : t("lecturer.demo_start")}
                    <ChevronRight size={12} aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
