"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/nav/Navbar";
import { LiveCaptions } from "@/components/captions/LiveCaptions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { useSessionStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi, WifiOff, FileText, Download, HelpCircle, Loader2, CheckCircle,
} from "lucide-react";

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

    socket.on("session_joined", (data: { transcript: TranscriptEntry[] }) => {
      setJoined(true);
      if (data.transcript) setTranscript(data.transcript);
    });

    socket.on(EVENTS.SESSION_NOT_FOUND, () => setNotFound(true));

    socket.on(EVENTS.SESSION_ENDED, async () => {
      setSessionEnded(true);
      setJoined(false);
      await generateSummary();
    });

    socket.on(EVENTS.NEW_TRANSCRIPT, (entry: TranscriptEntry) => {
      setTranscript((prev) => [...prev, { ...entry, timestamp: new Date() }]);
      setCurrentCaption(entry.text);
      setTimeout(() => setCurrentCaption(""), entry.text.length * 70 + 1000);
    });

    socket.on(EVENTS.NEW_SLIDE, (data: { imageData: string }) => {
      setSlideImage(data.imageData);
    });

    return () => {
      socket.off("session_joined");
      socket.off(EVENTS.SESSION_NOT_FOUND);
      socket.off(EVENTS.SESSION_ENDED);
      socket.off(EVENTS.NEW_TRANSCRIPT);
      socket.off(EVENTS.NEW_SLIDE);
      if (summaryTimerRef.current) clearInterval(summaryTimerRef.current);
    };
  }, [locale]);

  useEffect(() => {
    if (joined) {
      summaryTimerRef.current = setInterval(async () => {
        if (transcript.length >= 3) {
          await generateSummary();
        }
      }, 120000);
    }
    return () => { if (summaryTimerRef.current) clearInterval(summaryTimerRef.current); };
  }, [joined, transcript]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const generateSummary = async () => {
    if (isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, locale }),
      });
      const data = await res.json();
      setSummary(data.summary || null);
      setKeyPoints(data.key_points || []);
      setQuestions(data.review_questions || []);
      store.setSummary(data);
    } catch {
      // silent
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const downloadSummaryText = () => {
    const content = [
      locale === "ar" ? "ملخص المحاضرة" : "Lecture Summary",
      "",
      summary || "",
      "",
      locale === "ar" ? "النقاط الرئيسية:" : "Key Points:",
      ...keyPoints.map((p) => `- ${p}`),
      "",
      locale === "ar" ? "أسئلة المراجعة:" : "Review Questions:",
      ...questions.map((q, i) => `${i + 1}. ${q.q}\n   ${q.a}`),
    ].join("\n");

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
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h1 className="text-2xl font-bold">{t("sighted_view.title")}</h1>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-[var(--color-text-muted)]">{t("sighted_view.join_prompt")}</p>
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
                />
                <Button onClick={joinSession}>{t("common.join")}</Button>
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
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">{t("sighted_view.title")}</h1>
          <div className="flex items-center gap-3">
            {sessionEnded && (
              <Badge variant="warning">{t("session.ended")}</Badge>
            )}
            <Badge variant={connected ? "success" : "error"} className="gap-1.5">
              {connected ? <Wifi size={12} aria-hidden /> : <WifiOff size={12} aria-hidden />}
              {connected ? t("session.connected") : t("session.connecting")}
            </Badge>
          </div>
        </div>

        {/* Captions */}
        <LiveCaptions currentText={currentCaption} isLive={joined && !sessionEnded} />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Transcript */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={18} aria-hidden />
                  {t("sighted_view.live_captions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="max-h-80 overflow-y-auto flex flex-col gap-2 rounded-xl bg-[var(--bg)] border border-[var(--card-border)] p-4"
                  aria-live="polite"
                >
                  {transcript.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                      {t("deaf_view.transcript_empty")}
                    </p>
                  ) : (
                    transcript.map((entry, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm leading-relaxed"
                      >
                        {entry.text}
                      </motion.p>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </CardContent>
            </Card>

            {/* Slide */}
            {slideImage && (
              <Card>
                <CardContent className="pt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slideImage}
                    alt={locale === "ar" ? "شريحة المحاضرة" : "Lecture slide"}
                    className="w-full max-h-64 object-contain rounded-lg"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary panel */}
          <div className="flex flex-col gap-6">
            {/* Auto summary controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText size={18} aria-hidden />
                  {t("sighted_view.summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t("sighted_view.summary_auto")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSummary}
                  disabled={isGeneratingSummary || transcript.length === 0}
                >
                  {isGeneratingSummary ? (
                    <><Loader2 size={14} className="animate-spin" aria-hidden />{t("summary.generating")}</>
                  ) : (
                    <><FileText size={14} aria-hidden />{t("summary.title")}</>
                  )}
                </Button>

                {summary && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm leading-relaxed">{summary}</p>
                  </div>
                )}

                {keyPoints.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-[var(--color-text-muted)]">
                      {t("summary.key_points")}
                    </p>
                    <ul className="flex flex-col gap-1.5" role="list">
                      {keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" aria-hidden />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(summary || questions.length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSummaryText}
                    aria-label={t("summary.download")}
                  >
                    <Download size={14} aria-hidden />
                    {t("sighted_view.download_pdf")}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Review Questions */}
            {questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HelpCircle size={18} aria-hidden />
                    {t("sighted_view.questions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {questions.map((q, i) => (
                      <div key={i} className="rounded-xl border border-[var(--card-border)] overflow-hidden">
                        <button
                          className="w-full text-start px-4 py-3 text-sm font-medium hover:bg-primary/5 transition-colors flex items-center justify-between gap-2"
                          onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                          aria-expanded={expandedQuestion === i}
                        >
                          <span>{q.q}</span>
                          <span className="text-[var(--color-text-muted)] shrink-0">
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
                              <div className="px-4 pb-3 pt-1 text-sm text-[var(--color-text-muted)] border-t border-[var(--card-border)] bg-primary/5">
                                {q.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {questions.length === 0 && !isGeneratingSummary && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                  {t("sighted_view.questions_empty")}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
