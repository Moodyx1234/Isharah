"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/nav/Navbar";
import { LiveCaptions } from "@/components/captions/LiveCaptions";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { useSessionStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, FileText, Download, HelpCircle, Loader2, CheckCircle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TranscriptEntry { id: string; text: string; timestamp?: Date; }

export default function SightedStudentPage() {
  const t = useTranslations();
  const locale = useLocale();
  const store = useSessionStore();

  const [sessionCode, setSessionCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [currentCaption, setCurrentCaption] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Array<{ q: string; a: string }>>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [slideImage, setSlideImage] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const summaryTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const socket = getSocket();
    socket.on(EVENTS.CONNECTED, () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));
    socket.on("session_joined", (data: { transcript: TranscriptEntry[] }) => { setJoined(true); if (data.transcript) setTranscript(data.transcript); });
    socket.on(EVENTS.SESSION_NOT_FOUND, () => setNotFound(true));
    socket.on(EVENTS.SESSION_ENDED, async () => { setSessionEnded(true); setJoined(false); await generateSummary(); });
    socket.on(EVENTS.NEW_TRANSCRIPT, (entry: TranscriptEntry) => { setTranscript((prev) => [...prev, { ...entry, timestamp: new Date() }]); setCurrentCaption(entry.text); setTimeout(() => setCurrentCaption(""), entry.text.length * 70 + 1000); });
    socket.on(EVENTS.NEW_SLIDE, (data: { imageData: string }) => { setSlideImage(data.imageData); });
    return () => {
      socket.off("session_joined"); socket.off(EVENTS.SESSION_NOT_FOUND); socket.off(EVENTS.SESSION_ENDED); socket.off(EVENTS.NEW_TRANSCRIPT); socket.off(EVENTS.NEW_SLIDE);
      if (summaryTimerRef.current) clearInterval(summaryTimerRef.current);
    };
  }, [locale]);

  useEffect(() => { if (joined) summaryTimerRef.current = setInterval(async () => { if (transcript.length >= 3) await generateSummary(); }, 120000); return () => { if (summaryTimerRef.current) clearInterval(summaryTimerRef.current); }; }, [joined, transcript]);

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [transcript]);

  const generateSummary = async () => {
    if (isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch("/api/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, locale }) });
      const data = await res.json();
      setSummary(data.summary || null); setKeyPoints(data.key_points || []); setQuestions(data.review_questions || []); store.setSummary(data);
    } catch { /* silent */ } finally { setIsGeneratingSummary(false); }
  };

  const downloadSummaryText = () => {
    const content = [locale === "ar" ? "ملخص المحاضرة" : "Lecture Summary", "", summary || "", "", locale === "ar" ? "النقاط الرئيسية:" : "Key Points:", ...keyPoints.map((p) => `- ${p}`), "", locale === "ar" ? "أسئلة المراجعة:" : "Review Questions:", ...questions.map((q, i) => `${i + 1}. ${q.q}\n   ${q.a}`)].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lecture-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const joinSession = () => {
    if (!sessionCode.trim()) return;
    setNotFound(false);
    const socket = getSocket();
    socket.emit(EVENTS.JOIN_SESSION, { code: sessionCode.toUpperCase(), role: "sighted" });
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="card p-6 sm:p-8">
              {/* Role icon */}
              <div className="flex justify-center mb-6">
                <div className="h-14 sm:h-16 w-14 sm:w-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-lg ring-4 ring-green-100 dark:ring-green-900/20">
                  <BookOpen size={26} sm:size={28} className="text-green-700 dark:text-green-400" aria-hidden />
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-center mb-2">{t("sighted_view.title")}</h1>
              <p className="text-[var(--color-text-muted)] text-center text-xs sm:text-sm mb-6 sm:mb-7">
                {t("sighted_view.join_prompt")}
              </p>

              <AnimatePresence>
                {notFound && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 text-xs sm:text-sm text-red-700 dark:text-red-300 text-center" role="alert">
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
                  className="flex-1 h-11 sm:h-12 rounded-lg sm:rounded-xl border border-[var(--card-border)] bg-[var(--bg)] px-3 sm:px-4 text-center text-xl sm:text-2xl font-mono tracking-[0.3em] uppercase text-[var(--fg)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                  onKeyDown={(e) => { if (e.key === "Enter") joinSession(); }}
                  aria-label={t("session.code")}
                />
                <button
                  onClick={joinSession}
                  className="h-11 sm:h-12 px-4 sm:px-5 rounded-lg sm:rounded-xl bg-primary text-white font-bold shadow-md hover:bg-primary-light transition-colors active:scale-[0.97] shrink-0 text-sm sm:text-base"
                >
                  {t("common.join")}
                </button>
              </div>

              {sessionEnded && (
                <div className="mt-4 rounded-lg sm:rounded-xl bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 p-3 text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 text-center">
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-black">{t("sighted_view.title")}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {sessionEnded && <Badge variant="warning">{t("session.ended")}</Badge>}
            <Badge variant={connected ? "success" : "error"} className="gap-1">
              {connected ? <Wifi size={10} aria-hidden /> : <WifiOff size={10} aria-hidden />}
              <span className="text-xs">{connected ? t("session.connected") : t("session.connecting")}</span>
            </Badge>
          </div>
        </div>

        {/* Captions */}
        <LiveCaptions currentText={currentCaption} isLive={joined && !sessionEnded} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Transcript column */}
          <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">
            <div className="card flex flex-col overflow-hidden max-h-[400px] sm:max-h-none">
              <div className="flex items-center gap-2 sm:gap-2.5 p-3 sm:p-4 border-b border-[var(--card-border)] shrink-0">
                <div className="h-6 sm:h-7 w-6 sm:w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText size={13} sm:size={14} className="text-primary" aria-hidden />
                </div>
                <span className="font-bold text-xs sm:text-sm">{t("sighted_view.live_captions")}</span>
              </div>

              <div
                className="max-h-72 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 text-xs sm:text-sm"
                aria-live="polite"
              >
                {transcript.length === 0 ? (
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)] py-4 text-center">
                    {t("deaf_view.transcript_empty")}
                  </p>
                ) : (
                  transcript.map((entry, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="leading-relaxed border-b border-[var(--card-border)] last:border-0 pb-1.5 sm:pb-2 last:pb-0"
                    >
                      {entry.text}
                    </motion.p>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>

            {/* Slide */}
            {slideImage && (
              <div className="card p-3 sm:p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slideImage} alt={locale === "ar" ? "شريحة المحاضرة" : "Lecture slide"} className="w-full max-h-48 sm:max-h-60 object-contain rounded-lg" />
              </div>
            )}
          </div>

          {/* Summary + Questions panel */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Summary card */}
            <div className="card p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="h-6 sm:h-7 w-6 sm:w-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <FileText size={13} sm:size={14} className="text-green-600 dark:text-green-400" aria-hidden />
                </div>
                <span className="font-bold text-xs sm:text-sm">{t("sighted_view.summary")}</span>
              </div>

              <p className="text-xs text-[var(--color-text-muted)]">{t("sighted_view.summary_auto")}</p>

              <button
                onClick={generateSummary}
                disabled={isGeneratingSummary || transcript.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary text-primary bg-transparent hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed h-9 px-3 text-xs sm:text-sm font-medium transition-colors"
              >
                {isGeneratingSummary
                  ? <><Loader2 size={12} sm:size={13} className="animate-spin" aria-hidden /><span className="hidden sm:inline">{t("summary.generating")}</span><span className="sm:hidden">Gen...</span></>
                  : <><FileText size={12} sm:size={13} aria-hidden />{t("summary.title")}</>
                }
              </button>

              {summary && <div className="rounded-lg bg-primary/5 border border-primary/15 p-3"><p className="text-xs sm:text-sm leading-relaxed">{summary}</p></div>}

              {keyPoints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                    {t("summary.key_points")}
                  </p>
                  <ul className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm" role="list">
                    {keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle size={12} sm:size={13} className="text-green-500 shrink-0 mt-0.5" aria-hidden />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(summary || questions.length > 0) && (
                <button
                  onClick={downloadSummaryText}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary text-primary bg-transparent hover:bg-primary hover:text-white h-9 px-3 text-xs sm:text-sm font-medium transition-colors"
                >
                  <Download size={12} sm:size={13} aria-hidden />
                  <span className="hidden sm:inline">{t("sighted_view.download_pdf")}</span>
                  <span className="sm:hidden">Download</span>
                </button>
              )}
            </div>

            {/* Review Questions */}
            {questions.length > 0 ? (
              <div className="card p-4 sm:p-5 flex flex-col gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 sm:h-7 w-6 sm:w-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <HelpCircle size={13} sm:size={14} className="text-amber-600 dark:text-amber-400" aria-hidden />
                  </div>
                  <span className="font-bold text-xs sm:text-sm">{t("sighted_view.questions")}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-[var(--card-border)] overflow-hidden">
                      <button
                        className="w-full text-start px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium hover:bg-primary/4 transition-colors flex items-center justify-between gap-2"
                        onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                        aria-expanded={expandedQuestion === i}
                      >
                        <span className="truncate">{q.q}</span>
                        <span className="text-[var(--color-text-muted)] shrink-0 text-base font-light">
                          {expandedQuestion === i ? "−" : "+"}
                        </span>
                      </button>
                      <AnimatePresence>
                        {expandedQuestion === i && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 sm:px-4 pb-2 sm:pb-3 pt-1.5 sm:pt-2 text-xs sm:text-sm text-[var(--color-text-muted)] border-t border-[var(--card-border)] bg-primary/3">
                              {q.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !isGeneratingSummary && (
                <div className="card p-6 sm:p-8 flex flex-col items-center gap-2 border-dashed text-center">
                  <div className="h-10 w-10 rounded-lg bg-[var(--bg)] border border-[var(--card-border)] flex items-center justify-center">
                    <HelpCircle size={18} className="text-[var(--color-text-muted)]" aria-hidden />
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">{t("sighted_view.questions_empty")}</p>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
