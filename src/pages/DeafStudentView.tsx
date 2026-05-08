import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, Wifi, WifiOff, MessageSquare, Ear, Download } from "lucide-react";
import { wsClient, EVENTS } from "@/lib/socket-client";
import { TranscriptEntry } from "./DeafStudentJoin";
import { AvatarController } from "@/components/avatar/AvatarController";
import { useSignLanguageAnimation } from "@/hooks/useSignLanguageAnimation";
import s from "./DeafStudentView.module.css";

interface Props {
  sessionCode: string;
  initialTranscript: TranscriptEntry[];
}

export default function DeafStudentView({ sessionCode, initialTranscript }: Props) {
  const { locale = "ar" } = useParams<{ locale: string }>();
  const isAr = locale === "ar";

  const [connected,        setConnected]        = useState(wsClient.isConnected);
  const [sessionEnded,     setSessionEnded]      = useState(false);
  const [currentCaption,   setCurrentCaption]    = useState("");
  const [transcript,       setTranscript]        = useState<TranscriptEntry[]>(initialTranscript);
  const [handRaised,       setHandRaised]        = useState(false);
  const [handRaisedMsg,    setHandRaisedMsg]     = useState(false);
  const [speed,            setSpeed]             = useState(1);
  const [activeSentenceId, setActiveSentenceId]  = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const handleSentenceActive = useCallback((id: string | null) => {
    setActiveSentenceId(id);
  }, []);

  const { currentGesture, pushText, replayLast } = useSignLanguageAnimation(speed, handleSentenceActive);

  useEffect(() => {
    const handleOpen  = () => setConnected(true);
    const handleClose = () => setConnected(false);
    const handleEnded = () => setSessionEnded(true);

    const handleTranscript = (data: unknown) => {
      const d = data as { id: string; text: string; simplified?: string; tokens?: string[]; timestamp: string; sequenceNum: number; isFinal: boolean };
      if (!d.isFinal) return;
      const entry: TranscriptEntry = {
        id:        d.id,
        text:      d.text,
        simplified: d.simplified,
        tokens:    d.tokens,
        timestamp: new Date(d.timestamp),
      };
      setTranscript((prev) => {
        // avoid duplicates on reconnect
        if (prev.some((e) => e.id === d.id)) return prev;
        return [...prev, entry];
      });
      setCurrentCaption(d.text);
      pushText(d.simplified ?? d.text, d.tokens, d.id);
      setTimeout(() => setCurrentCaption(""), d.text.length * 80 + 1_000);
    };

    wsClient.on(EVENTS.CONNECTED,         handleOpen);
    wsClient.on(EVENTS.DISCONNECTED,      handleClose);
    wsClient.on(EVENTS.SESSION_ENDED,     handleEnded);
    wsClient.on(EVENTS.TRANSCRIPT_UPDATE, handleTranscript);

    return () => {
      wsClient.off(EVENTS.CONNECTED,         handleOpen);
      wsClient.off(EVENTS.DISCONNECTED,      handleClose);
      wsClient.off(EVENTS.SESSION_ENDED,     handleEnded);
      wsClient.off(EVENTS.TRANSCRIPT_UPDATE, handleTranscript);
    };
  }, [pushText]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const raiseHand = () => {
    if (!wsClient.sessionId) return;
    wsClient.send('RAISE_HAND', { sessionId: wsClient.sessionId, raised: !handRaised });
    setHandRaised((prev) => !prev);
    setHandRaisedMsg(true);
    setTimeout(() => setHandRaisedMsg(false), 3_000);
  };

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });

  const exportTranscript = () => {
    const text = transcript.map((e) => `[${formatTime(e.timestamp)}] ${e.text}`).join("\n");
    const blob  = new Blob([text], { type: "text/plain" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href = url; a.download = `transcript-${sessionCode}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={s.page}>
      {/* Ambient blobs */}
      <div className={s.blobBg} aria-hidden="true">
        <div className={`${s.blob} ${s.blob1}`} />
        <div className={`${s.blob} ${s.blob2}`} />
      </div>
      <div className={s.gridTex} aria-hidden="true" />

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
            <Ear size={13} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 5 }} aria-hidden="true" />
            {isAr ? "واجهة الطالب الأصم" : "Deaf Student View"}
          </span>

          <div className={s.navRight}>
            <div
              className={`${s.connBadge} ${connected ? s.connBadgeOn : s.connBadgeOff}`}
              aria-live="polite"
            >
              {connected
                ? <Wifi size={11} aria-hidden="true" />
                : <WifiOff size={11} aria-hidden="true" />}
              {connected
                ? (isAr ? "متصل" : "Connected")
                : (isAr ? "جارٍ الاتصال..." : "Connecting...")}
            </div>
            {sessionCode && (
              <span className={s.sessionCodeChip} aria-label={`${isAr ? "رمز الجلسة" : "Session"}: ${sessionCode}`}>
                {sessionCode}
              </span>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ── Body grid ── */}
      <div className={s.bodyGrid} id="main-content">

        {/* ── LEFT: Avatar panel ── */}
        <motion.div
          className={s.leftPanel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Top overlay bar */}
          <div className={s.panelTopBar}>
            <span className={s.topBarLabel}>
              <Ear size={13} aria-hidden="true" />
              {isAr ? "لغة الإشارة الحية" : "Live Sign Language"}
            </span>
            <span className={s.topBarGesture}>
              {isAr ? "الإشارة: " : "Sign: "}
              <span className={s.topBarGestureHighlight}>
                {currentGesture === "neutral" ? "—" : currentGesture}
              </span>
            </span>
          </div>

          {/* Avatar mount */}
          <div
            className={s.avatarWrap}
            id="avatar-mount"
            aria-label={isAr ? "عرض لغة الإشارة ثلاثي الأبعاد" : "3D sign language avatar"}
          >
            <div className={s.avatarInner}>
              <AvatarController
                currentGesture={currentGesture}
                currentCaption={currentCaption}
                isActive={connected && currentGesture !== "neutral"}
                speed={speed}
                onSpeedChange={setSpeed}
                onReplay={() => replayLast(1)}
                onReplay3={() => replayLast(3)}
                locale={locale}
                label={isAr ? "عرض لغة الإشارة" : "Sign language display"}
              />
            </div>
            <div className={s.avatarGradient} aria-hidden="true" />
          </div>

          {/* Session ended notice */}
          <AnimatePresence>
            {sessionEnded && (
              <motion.div
                key="ended"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={s.endedBanner}
                role="alert"
              >
                {isAr ? "انتهت الجلسة" : "Session has ended"}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Caption + raise-hand bar */}
          <div className={s.bottomBar}>
            <p
              className={`${s.captionText} ${!currentCaption ? s.captionEmpty : ""}`}
              aria-live="polite"
            >
              {currentCaption || (isAr ? "في انتظار بدء الجلسة..." : "Waiting for session...")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <button
                className={`${s.raiseHandBtn} ${handRaised ? s.raiseHandBtnActive : ""}`}
                onClick={raiseHand}
                aria-label={isAr ? "رفع اليد" : "Raise hand"}
                aria-pressed={handRaised}
              >
                <Hand size={16} aria-hidden="true" />
                {isAr ? (handRaised ? "✋ تم رفع يدك" : "رفع اليد ✋") : (handRaised ? "✋ Hand raised" : "Raise Hand ✋")}
              </button>
              <AnimatePresence>
                {handRaisedMsg && (
                  <motion.span
                    key="msg"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={s.handRaisedMsg}
                    role="status"
                    aria-live="polite"
                  >
                    {isAr ? "✓ تم إرسال الإشارة للمحاضر" : "✓ Lecturer notified"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT: Transcript panel ── */}
        <motion.div
          className={s.rightPanel}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          <div className={s.panelHeader}>
            <span className={s.panelHeaderTitle}>{isAr ? "سجل الترجمة" : "Transcript"}</span>
            <MessageSquare size={18} className={s.panelHeaderIcon} aria-hidden="true" />
          </div>

          <div
            className={s.transcriptList}
            aria-live="polite"
            aria-label={isAr ? "سجل الترجمة" : "Transcript history"}
          >
            {transcript.length === 0 ? (
              <div className={s.transcriptEmpty}>
                <MessageSquare size={32} className={s.transcriptEmptyIcon} aria-hidden="true" />
                <p className={s.transcriptEmptyText}>
                  {isAr ? "ستظهر الترجمة هنا عند بدء الجلسة" : "Transcript will appear when the session starts"}
                </p>
              </div>
            ) : (
              transcript.map((entry, i) => {
                const isActive = activeSentenceId != null && entry.id === activeSentenceId;
                return (
                  <div
                    key={entry.id ?? i}
                    className={`${s.transcriptEntry} ${isActive ? s.transcriptEntryActive : ""}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <div className={s.entryHeader}>
                      <p className={s.entryTime}>{formatTime(entry.timestamp)}</p>
                      {isActive && (
                        <span className={s.signingIndicator} aria-label={isAr ? "جاري الترجمة" : "Signing now"}>
                          {isAr ? "✋ جاري الترجمة" : "✋ Signing"}
                        </span>
                      )}
                    </div>
                    <p className={s.entryText}>{entry.text}</p>
                    {entry.simplified && entry.simplified !== entry.text && (
                      <p className={s.entrySimplified}>{entry.simplified}</p>
                    )}
                  </div>
                );
              })
            )}
            <div ref={transcriptEndRef} />
          </div>

          <div className={s.panelFooter}>
            <button
              className={s.exportBtn}
              onClick={exportTranscript}
              disabled={transcript.length === 0}
              aria-label={isAr ? "تصدير سجل الترجمة" : "Export transcript"}
            >
              <Download size={13} aria-hidden="true" />
              {isAr ? "تصدير السجل" : "Export Log"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
