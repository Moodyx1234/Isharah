import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LiveCaptions } from "@/components/captions/LiveCaptions";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { useSessionStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, FileText, Download, HelpCircle, Loader2, CheckCircle, BookOpen, ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";

interface TranscriptEntry { id: string; text: string; timestamp?: Date; }

const EMERALD = "#10b981";
const EMERALD_DARK = "#061410";

export default function SightedStudentPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const { locale: routeLocale = "ar" } = useParams<{ locale: string }>();
  const isAr = routeLocale === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;
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
  const [activeTab, setActiveTab] = useState<"summary" | "keypoints" | "questions">("summary");
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
    a.href = url; a.download = "lecture-summary.txt"; a.click();
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
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, ${EMERALD_DARK} 0%, #030a06 100%)` }}>
        <header className="flex items-center justify-between px-6 py-4">
          <Link
            to={`/${routeLocale}/login`}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
          >
            <BackArrow size={15} />
            {isAr ? "رجوع" : "Back"}
          </Link>
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: `${EMERALD}22`, color: EMERALD, border: `1px solid ${EMERALD}33` }}
          >
            <BookOpen size={13} />
            {isAr ? "طالب مبصر" : "Sighted Student"}
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
                background: "linear-gradient(135deg, #081a10 0%, rgba(8,26,16,0.96) 100%)",
                border: `1px solid ${EMERALD}33`,
                boxShadow: `0 25px 80px rgba(16,185,129,0.18)`,
              }}
            >
              <div className="flex justify-center mb-6">
                <div
                  className="relative h-16 w-16 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ background: `${EMERALD}18`, border: `1px solid ${EMERALD}44` }}
                >
                  <BookOpen size={30} style={{ color: EMERALD }} />
                  <span
                    className="absolute inset-0 rounded-2xl animate-ping opacity-15"
                    style={{ border: `2px solid ${EMERALD}` }}
                  />
                </div>
              </div>

              <h1 className="text-2xl font-black text-white text-center mb-2">
                {t("sighted_view.title")}
              </h1>
              <p className="text-center text-sm mb-7" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                    <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-300 text-center" role="alert">
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
                  className="flex-1 h-12 rounded-xl px-4 text-center text-2xl font-mono tracking-[0.3em] uppercase text-white placeholder:text-white/20 focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${EMERALD}44` }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = `${EMERALD}99`; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 2px ${EMERALD}22`; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = `${EMERALD}44`; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
                  onKeyDown={(e) => { if (e.key === "Enter") joinSession(); }}
                  aria-label={t("session.code")}
                />
                <button
                  onClick={joinSession}
                  className="h-12 px-5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.97] shrink-0"
                  style={{ background: EMERALD, boxShadow: `0 6px 24px ${EMERALD}55` }}
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

  const tabs = [
    { id: "summary" as const, label: isAr ? "ملخص" : "Summary", icon: <FileText size={14} /> },
    { id: "keypoints" as const, label: isAr ? "نقاط رئيسية" : "Key Points", icon: <CheckCircle size={14} /> },
    { id: "questions" as const, label: isAr ? "أسئلة" : "Questions", icon: <HelpCircle size={14} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#07100a" }}>
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0"
        style={{ borderColor: `${EMERALD}18` }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: `${EMERALD}18`, border: `1px solid ${EMERALD}33` }}
          >
            <BookOpen size={16} style={{ color: EMERALD }} />
          </div>
          <span className="text-white font-black text-sm hidden sm:block">{t("sighted_view.title")}</span>
        </div>

        <div className="flex items-center gap-2">
          {sessionEnded && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
              {t("session.ended")}
            </span>
          )}
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: connected ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              color: connected ? EMERALD : "#ef4444",
              border: `1px solid ${connected ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
            }}
          >
            {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>{connected ? t("session.connected") : t("session.connecting")}</span>
          </div>
          <div
            className="rounded-lg px-2.5 py-1 text-xs font-mono font-bold"
            style={{ background: `${EMERALD}18`, color: EMERALD, border: `1px solid ${EMERALD}33` }}
          >
            {sessionCode}
          </div>
        </div>
      </header>

      <div
        className="sticky top-0 z-10 border-b px-4 sm:px-6 py-2 sm:py-3"
        style={{ background: "#07100a", borderColor: `${EMERALD}18` }}
      >
        <LiveCaptions currentText={currentCaption} isLive={joined && !sessionEnded} />
      </div>

      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-4 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5" id="main-content">

        <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">
          <div
            className="rounded-2xl overflow-hidden flex flex-col max-h-[380px]"
            style={{ border: `1px solid ${EMERALD}20` }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
              style={{ background: `${EMERALD}0a`, borderColor: `${EMERALD}20` }}
            >
              <div
                className="h-6 w-6 rounded-lg flex items-center justify-center"
                style={{ background: `${EMERALD}22` }}
              >
                <FileText size={13} style={{ color: EMERALD }} />
              </div>
              <span className="font-bold text-sm text-white">{t("sighted_view.live_captions")}</span>
            </div>

            <div
              className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 text-sm"
              aria-live="polite"
              style={{ background: "rgba(16,185,129,0.03)" }}
            >
              {transcript.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {t("deaf_view.transcript_empty")}
                </p>
              ) : (
                transcript.map((entry, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="leading-relaxed pb-2 last:pb-0 text-white/70 border-b last:border-0"
                    style={{ borderColor: `${EMERALD}15` }}
                  >
                    {entry.text}
                  </motion.p>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {slideImage && (
            <div
              className="rounded-2xl p-3 sm:p-4"
              style={{ border: `1px solid ${EMERALD}20`, background: `${EMERALD}06` }}
            >
              <img src={slideImage} alt={isAr ? "شريحة المحاضرة" : "Lecture slide"} className="w-full max-h-52 object-contain rounded-xl" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ border: `1px solid ${EMERALD}20` }}
          >
            <div
              className="flex border-b shrink-0"
              style={{ borderColor: `${EMERALD}20`, background: `${EMERALD}0a` }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    color: activeTab === tab.id ? EMERALD : "rgba(255,255,255,0.4)",
                    borderBottom: activeTab === tab.id ? `2px solid ${EMERALD}` : "2px solid transparent",
                    background: activeTab === tab.id ? `${EMERALD}10` : "transparent",
                  }}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-3" style={{ background: `${EMERALD}04` }}>
              <button
                onClick={generateSummary}
                disabled={isGeneratingSummary || transcript.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl h-9 px-4 text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: `${EMERALD}22`, color: EMERALD, border: `1px solid ${EMERALD}44` }}
              >
                {isGeneratingSummary
                  ? <><Loader2 size={13} className="animate-spin" />{isAr ? "جارٍ التحليل..." : "Analyzing..."}</>
                  : <><FileText size={13} />{t("summary.title")}</>
                }
              </button>

              <AnimatePresence mode="wait">
                {activeTab === "summary" && (
                  <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {summary ? (
                      <div
                        className="rounded-xl p-3"
                        style={{ background: `${EMERALD}0f`, border: `1px solid ${EMERALD}22` }}
                      >
                        <p className="text-sm leading-relaxed text-white/80">{summary}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {t("sighted_view.summary_auto")}
                      </p>
                    )}
                  </motion.div>
                )}

                {activeTab === "keypoints" && (
                  <motion.div key="keypoints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {keyPoints.length > 0 ? (
                      <ul className="flex flex-col gap-2" role="list">
                        {keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/75">
                            <CheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: EMERALD }} />
                            {point}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {isAr ? "لا توجد نقاط بعد. أنشئ ملخصاً أولاً." : "No key points yet. Generate a summary first."}
                      </p>
                    )}
                  </motion.div>
                )}

                {activeTab === "questions" && (
                  <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                    {questions.length > 0 ? (
                      questions.map((q, i) => (
                        <div
                          key={i}
                          className="rounded-xl overflow-hidden"
                          style={{ border: `1px solid ${EMERALD}22` }}
                        >
                          <button
                            className="w-full text-start px-3 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition-colors"
                            style={{
                              color: "rgba(255,255,255,0.8)",
                              background: expandedQuestion === i ? `${EMERALD}12` : "transparent",
                            }}
                            onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                            aria-expanded={expandedQuestion === i}
                          >
                            <span className="truncate">{q.q}</span>
                            <span className="shrink-0 text-base font-light" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                                <div
                                  className="px-3 pb-3 pt-2 text-xs sm:text-sm leading-relaxed border-t"
                                  style={{ borderColor: `${EMERALD}22`, color: "rgba(255,255,255,0.55)", background: `${EMERALD}08` }}
                                >
                                  {q.a}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {t("sighted_view.questions_empty")}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {(summary || questions.length > 0) && (
                <button
                  onClick={downloadSummaryText}
                  className="inline-flex items-center justify-center gap-2 rounded-xl h-9 px-4 text-sm font-medium transition-all active:scale-[0.97]"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Download size={13} />
                  {t("sighted_view.download_pdf")}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
