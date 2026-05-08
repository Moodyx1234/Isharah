import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi, WifiOff, FileText, Download, HelpCircle,
  Loader2, CheckCircle, BookOpen, Send,
} from "lucide-react";
import { wsClient, EVENTS } from "@/lib/socket-client";
import { LiveCaptions } from "@/components/captions/LiveCaptions";
import { GlowBackground } from "@/components/shared/GlowBackground";
import { SightedTranscriptEntry } from "./SightedStudentJoin";
import s from "./SightedStudentView.module.css";

interface Props {
  sessionCode: string;
  initialTranscript: SightedTranscriptEntry[];
}

interface QAPair { q: string; a: string }

export default function SightedStudentView({ sessionCode, initialTranscript }: Props) {
  const { locale = "ar" } = useParams<{ locale: string }>();
  const isAr = locale === "ar";

  const [connected,       setConnected]       = useState(wsClient.isConnected);
  const [sessionEnded,    setSessionEnded]     = useState(false);
  const [currentCaption,  setCurrentCaption]   = useState("");
  const [transcript,      setTranscript]       = useState<SightedTranscriptEntry[]>(initialTranscript);
  const [summary,         setSummary]          = useState<string | null>(null);
  const [keyPoints,       setKeyPoints]        = useState<string[]>([]);
  const [questions,       setQuestions]        = useState<QAPair[]>([]);
  const [questionInput,   setQuestionInput]    = useState("");
  const [isAskingQ,       setIsAskingQ]        = useState(false);
  const [expandedQ,       setExpandedQ]        = useState<number | null>(null);
  const [slideImage] = useState<string | null>(null);
  const [activeTab,       setActiveTab]        = useState<"summary" | "keypoints" | "questions">("summary");

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen  = () => setConnected(true);
    const handleClose = () => setConnected(false);
    const handleEnded = () => setSessionEnded(true);

    // CAPTION_UPDATE → live caption strip
    const handleCaption = (data: unknown) => {
      const d = data as { text: string; isFinal: boolean };
      setCurrentCaption(d.text);
      setTimeout(() => setCurrentCaption(""), d.text.length * 70 + 1_000);
    };

    // TRANSCRIPT_UPDATE → full transcript panel
    const handleTranscript = (data: unknown) => {
      const d = data as { id: string; text: string; timestamp: string; isFinal: boolean };
      if (!d.isFinal) return;
      setTranscript((prev) => {
        if (prev.some((e) => e.id === d.id)) return prev;
        return [...prev, { id: d.id, text: d.text, timestamp: new Date(d.timestamp) }];
      });
    };

    // SUMMARY_UPDATE → AI auto-pushed summary
    const handleSummary = (data: unknown) => {
      const d = data as { content: string };
      setSummary(d.content);
    };

    // KEYPOINTS_UPDATE → AI auto-pushed key points
    const handleKeyPoints = (data: unknown) => {
      const d = data as { points: string[] };
      setKeyPoints(d.points);
    };

    // QUESTION_ANSWER → response to ASK_QUESTION
    const handleQA = (data: unknown) => {
      const d = data as { question: string; answer: string };
      setIsAskingQ(false);
      setQuestions((prev) => {
        const next = [...prev, { q: d.question, a: d.answer }];
        setExpandedQ(next.length - 1);
        return next;
      });
    };

    wsClient.on(EVENTS.CONNECTED,         handleOpen);
    wsClient.on(EVENTS.DISCONNECTED,      handleClose);
    wsClient.on(EVENTS.SESSION_ENDED,     handleEnded);
    wsClient.on(EVENTS.CAPTION_UPDATE,    handleCaption);
    wsClient.on(EVENTS.TRANSCRIPT_UPDATE, handleTranscript);
    wsClient.on(EVENTS.SUMMARY_UPDATE,    handleSummary);
    wsClient.on(EVENTS.KEYPOINTS_UPDATE,  handleKeyPoints);
    wsClient.on(EVENTS.QUESTION_ANSWER,   handleQA);

    return () => {
      wsClient.off(EVENTS.CONNECTED,         handleOpen);
      wsClient.off(EVENTS.DISCONNECTED,      handleClose);
      wsClient.off(EVENTS.SESSION_ENDED,     handleEnded);
      wsClient.off(EVENTS.CAPTION_UPDATE,    handleCaption);
      wsClient.off(EVENTS.TRANSCRIPT_UPDATE, handleTranscript);
      wsClient.off(EVENTS.SUMMARY_UPDATE,    handleSummary);
      wsClient.off(EVENTS.KEYPOINTS_UPDATE,  handleKeyPoints);
      wsClient.off(EVENTS.QUESTION_ANSWER,   handleQA);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const askQuestion = () => {
    const q = questionInput.trim();
    if (!q || isAskingQ || !wsClient.sessionId) return;
    setIsAskingQ(true);
    wsClient.send('ASK_QUESTION', { sessionId: wsClient.sessionId, question: q });
    setQuestionInput("");
  };

  const downloadContent = () => {
    const lines = [
      locale === "ar" ? "ملخص المحاضرة" : "Lecture Summary", "",
      summary || "",
      "", locale === "ar" ? "النقاط الرئيسية:" : "Key Points:",
      ...keyPoints.map((p) => `- ${p}`),
      "", locale === "ar" ? "الأسئلة والأجوبة:" : "Q&A:",
      ...questions.map((q, i) => `${i + 1}. ${q.q}\n   ${q.a}`),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `lecture-summary-${sessionCode}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: "summary"   as const, label: isAr ? "ملخص"        : "Summary",    icon: <FileText    size={13} /> },
    { id: "keypoints" as const, label: isAr ? "نقاط رئيسية" : "Key Points", icon: <CheckCircle size={13} /> },
    { id: "questions" as const, label: isAr ? "أسئلة"       : "Q&A",        icon: <HelpCircle  size={13} /> },
  ];

  const isLive = !sessionEnded && connected;

  return (
    <div className={s.page}>
      <GlowBackground color="teal" position="fixed" />

      {/* ── Navbar ── */}
      <motion.nav
        className={s.nav}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        aria-label={isAr ? "شريط التنقل" : "Navigation"}
      >
        <div className={s.navInner}>
          <Link to={`/${locale}`} className={s.logo} aria-label="إشارة — الرئيسية">
            <div className={s.logoIcon} aria-hidden="true">
              <span className={s.logoGlyph}>إش</span>
            </div>
            <div className={s.logoText}>
              <span className={s.logoName}>إشارة</span>
              <span className={s.logoSub}>Isharah</span>
            </div>
          </Link>

          <span className={s.navSep} aria-hidden="true">|</span>
          <span className={s.navPageLabel}>
            <BookOpen size={14} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 5 }} aria-hidden="true" />
            {isAr ? "واجهة الطالب المبصر" : "Sighted Student View"}
          </span>

          <span className={s.navSpacer} />

          {isLive && (
            <span className={s.liveBadge} aria-label={isAr ? "البث المباشر نشط" : "Live session active"}>
              <span className={s.liveDot} aria-hidden="true" />
              LIVE
            </span>
          )}

          {sessionEnded && (
            <span className={s.endedTag}>{isAr ? "انتهت الجلسة" : "Ended"}</span>
          )}

          <div
            className={`${s.connBadge} ${connected ? s.connBadgeOn : s.connBadgeOff}`}
            aria-live="polite"
          >
            {connected
              ? <Wifi size={11} aria-hidden="true" />
              : <WifiOff size={11} aria-hidden="true" />}
            {connected ? (isAr ? "متصل" : "Connected") : (isAr ? "جارٍ الاتصال..." : "Connecting...")}
          </div>

          {sessionCode && (
            <span className={s.sessionChip} aria-label={`${isAr ? "رمز الجلسة" : "Session code"}: ${sessionCode}`}>
              {sessionCode}
            </span>
          )}
        </div>
      </motion.nav>

      {/* ── Connecting banner ── */}
      <AnimatePresence>
        {!connected && !sessionEnded && (
          <motion.div
            key="banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={s.connectingBanner}
            role="status"
            aria-live="polite"
          >
            <Loader2 size={14} className={s.spinnerIcon} aria-hidden="true" />
            {isAr ? "في انتظار المحاضر..." : "Waiting for lecturer..."}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live caption strip ── */}
      <div className={s.captionStrip} aria-label={isAr ? "الترجمة الحية" : "Live captions"}>
        <LiveCaptions currentText={currentCaption} isLive={isLive} />
      </div>

      {/* ── Main grid ── */}
      <main className={s.mainGrid} id="main-content">

        {/* Left column — transcript + slide */}
        <motion.div
          className={s.leftCol}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className={s.transcriptPanel}>
            <div className={s.panelHeader}>
              <div className={s.panelHeaderIcon} aria-hidden="true"><FileText size={13} /></div>
              <span className={s.panelHeaderTitle}>{isAr ? "الترجمة الحية" : "Live Captions"}</span>
            </div>
            <div className={s.transcriptScroll} aria-live="polite">
              {transcript.length === 0 ? (
                <p className={s.transcriptEmpty}>
                  {isAr ? "ستظهر الترجمة النصية هنا..." : "Transcript will appear here..."}
                </p>
              ) : (
                transcript.map((entry, i) => (
                  <motion.p
                    key={entry.id ?? i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={s.transcriptLine}
                  >
                    {entry.text}
                  </motion.p>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {slideImage && (
            <motion.div
              key="slide"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={s.slidePanel}
            >
              <img
                src={slideImage}
                alt={isAr ? "شريحة المحاضرة الحالية" : "Current lecture slide"}
                className={s.slideImg}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Right column — analysis tabs */}
        <motion.div
          className={s.rightCol}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          <div className={s.analysisPanel}>
            {/* Tab bar */}
            <div className={s.tabBar} role="tablist" aria-label={isAr ? "أدوات التحليل" : "Analysis tools"}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${s.tab} ${activeTab === tab.id ? s.tabActive : ""}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className={s.analysisBody}>
              <div
                className={s.tabContent}
                role="tabpanel"
                aria-label={tabs.find((t) => t.id === activeTab)?.label}
              >
                <AnimatePresence mode="wait">
                  {activeTab === "summary" && (
                    <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {summary
                        ? <p className={s.summaryText}>{summary}</p>
                        : <p className={s.contentEmpty}>{isAr ? "يتم إنشاء الملخص تلقائياً خلال المحاضرة" : "Summary is auto-generated during the lecture"}</p>}
                    </motion.div>
                  )}

                  {activeTab === "keypoints" && (
                    <motion.div key="keypoints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {keyPoints.length > 0 ? (
                        <ul className={s.keyPointsList} role="list">
                          {keyPoints.map((point, i) => (
                            <li key={i} className={s.keyPoint}>
                              <CheckCircle size={13} className={s.keyPointIcon} aria-hidden="true" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={s.contentEmpty}>
                          {isAr ? "النقاط الرئيسية ستظهر خلال المحاضرة" : "Key points will appear during the lecture"}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "questions" && (
                    <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Q&A input */}
                      <div className={s.qaInputRow} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        <input
                          className={s.qaInput ?? s.transcriptEmpty}
                          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle, #333)", background: "var(--bg-secondary, #1a1a2e)", color: "inherit", fontSize: 13 }}
                          placeholder={isAr ? "اكتب سؤالك..." : "Ask a question..."}
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") askQuestion(); }}
                          disabled={isAskingQ || !wsClient.sessionId}
                          dir={isAr ? "rtl" : "ltr"}
                        />
                        <button
                          onClick={askQuestion}
                          disabled={isAskingQ || !questionInput.trim() || !wsClient.sessionId}
                          style={{ padding: "8px 14px", borderRadius: 8, background: "var(--accent-teal, #00c9a7)", color: "#000", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}
                          aria-label={isAr ? "إرسال السؤال" : "Send question"}
                        >
                          {isAskingQ
                            ? <Loader2 size={13} className={s.spinnerIcon} aria-hidden="true" />
                            : <Send size={13} aria-hidden="true" />}
                          {isAr ? "سؤال" : "Ask"}
                        </button>
                      </div>

                      {questions.length > 0 ? (
                        <div className={s.questionsList}>
                          {questions.map((q, i) => (
                            <div key={i} className={s.questionItem}>
                              <button
                                className={`${s.questionBtn} ${expandedQ === i ? s.questionBtnActive : ""}`}
                                onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                                aria-expanded={expandedQ === i}
                              >
                                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.q}</span>
                                <span className={s.questionExpand} aria-hidden="true">{expandedQ === i ? "−" : "+"}</span>
                              </button>
                              <AnimatePresence>
                                {expandedQ === i && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: "auto" }}
                                    exit={{ height: 0 }}
                                    style={{ overflow: "hidden" }}
                                  >
                                    <div className={s.questionAnswer}>{q.a}</div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={s.contentEmpty}>
                          {isAr ? "اطرح سؤالاً ليُجيب عنه الذكاء الاصطناعي" : "Ask a question and AI will answer from the lecture context"}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {(summary || questions.length > 0) && (
                <button className={s.downloadBtn} onClick={downloadContent}>
                  <Download size={13} aria-hidden="true" />
                  {isAr ? "تصدير الملخص" : "Export Summary"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
