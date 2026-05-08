import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye, Mic, MicOff, Volume2, VolumeX,
  RotateCcw, FileText, Wifi, WifiOff,
} from "lucide-react";
import { wsClient, EVENTS } from "@/lib/socket-client";
import s from "./BlindStudentView.module.css";

export default function BlindStudentView() {
  const { locale = "ar" } = useParams<{ locale: string }>();
  const isAr = locale === "ar";

  const [connected,       setConnected]       = useState(wsClient.isConnected);
  const [sessionEnded,    setSessionEnded]     = useState(false);
  const [isListening,     setIsListening]      = useState(false);
  const [isSpeaking,      setIsSpeaking]       = useState(false);
  const [currentNarration, setCurrentNarration] = useState("");
  const [ariaAnnouncement, setAriaAnnouncement] = useState("");
  const [commandFeedback,  setCommandFeedback]  = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef    = useRef<any>(null);
  const synthRef          = useRef<SpeechSynthesis | null>(null);
  const lastNarrationRef  = useRef<string>("");
  const narrationQueueRef = useRef<string[]>([]);
  const isSpeakingRef     = useRef(false);
  const hasGreetedRef     = useRef(false);

  useEffect(() => { synthRef.current = window.speechSynthesis; }, []);

  const speak = useCallback(
    (text: string, priority = false) => {
      if (!synthRef.current) return;
      if (priority) { synthRef.current.cancel(); narrationQueueRef.current = [text]; }
      else narrationQueueRef.current.push(text);

      const processQueue = () => {
        if (narrationQueueRef.current.length === 0) { isSpeakingRef.current = false; setIsSpeaking(false); return; }
        if (isSpeakingRef.current && !priority) return;
        const next = narrationQueueRef.current.shift()!;
        const utterance = new SpeechSynthesisUtterance(next);
        utterance.lang  = locale === "ar" ? "ar-SA" : "en-US";
        utterance.rate  = 0.95;
        utterance.pitch = 1;
        const voices    = synthRef.current?.getVoices() || [];
        const langVoice = voices.find((v) => locale === "ar" ? v.lang.startsWith("ar") : v.lang.startsWith("en"));
        if (langVoice) utterance.voice = langVoice;
        utterance.onstart = () => { isSpeakingRef.current = true; setIsSpeaking(true); setCurrentNarration(next); lastNarrationRef.current = next; };
        utterance.onend   = () => { isSpeakingRef.current = false; processQueue(); };
        utterance.onerror = () => { isSpeakingRef.current = false; processQueue(); };
        synthRef.current?.speak(utterance);
      };
      if (!isSpeakingRef.current || priority) processQueue();
    },
    [locale],
  );

  const announce = useCallback((text: string) => {
    setAriaAnnouncement(text);
    setTimeout(() => setAriaAnnouncement(""), 5_000);
  }, []);

  // Welcome greeting on first mount
  useEffect(() => {
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    speak(
      locale === "ar"
        ? "مرحباً! انضممت إلى الجلسة. ستسمع نصوص المحاضرة تلقائياً. اضغط R لتكرار آخر نقطة."
        : "Welcome! You've joined the session. Lecture text will be read automatically. Press R to repeat the last point.",
      true,
    );
  }, [locale, speak]);

  // Socket events
  useEffect(() => {
    const handleOpen  = () => setConnected(true);
    const handleClose = () => setConnected(false);

    const handleEnded = () => {
      setSessionEnded(true);
      speak(locale === "ar" ? "انتهت الجلسة. شكراً لحضورك." : "Session ended. Thank you for attending.", true);
    };

    // CAPTION_UPDATE carries {text, timestamp, isFinal} — read it aloud
    const handleCaption = (data: unknown) => {
      const d = data as { text: string; isFinal: boolean };
      if (d.isFinal) speak(d.text);
    };

    wsClient.on(EVENTS.CONNECTED,    handleOpen);
    wsClient.on(EVENTS.DISCONNECTED, handleClose);
    wsClient.on(EVENTS.SESSION_ENDED, handleEnded);
    wsClient.on(EVENTS.CAPTION_UPDATE, handleCaption);

    return () => {
      wsClient.off(EVENTS.CONNECTED,    handleOpen);
      wsClient.off(EVENTS.DISCONNECTED, handleClose);
      wsClient.off(EVENTS.SESSION_ENDED, handleEnded);
      wsClient.off(EVENTS.CAPTION_UPDATE, handleCaption);
    };
  }, [locale, speak]);

  const handleVoiceCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase().trim();
    if (cmd.includes("أعد") || cmd.includes("كرر") || cmd.includes("repeat")) {
      speak((locale === "ar" ? "تكرار: " : "Repeating: ") + (lastNarrationRef.current || ""), true);
      setCommandFeedback(locale === "ar" ? "تكرار آخر نقطة..." : "Repeating last point...");
    } else if (cmd.includes("توقف") || cmd.includes("pause")) {
      synthRef.current?.cancel(); setIsSpeaking(false);
      setCommandFeedback(locale === "ar" ? "تم الإيقاف" : "Paused");
    }
    setTimeout(() => setCommandFeedback(""), 3_000);
  }, [locale, speak]);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    rec.lang           = locale === "ar" ? "ar-SA" : "en-US";
    rec.continuous     = false;
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => { handleVoiceCommand(event.results[0][0].transcript); };
    rec.onend    = () => setIsListening(false);
    rec.onerror  = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
    speak(locale === "ar" ? "جارٍ الاستماع..." : "Listening...", true);
  }, [locale, speak, handleVoiceCommand]);

  const toggleListening = useCallback(() => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    else startListening();
  }, [isListening, startListening]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":          e.preventDefault(); toggleListening(); break;
        case "r": case "R": e.preventDefault(); speak((locale === "ar" ? "تكرار: " : "Repeating: ") + (lastNarrationRef.current || ""), true); announce(locale === "ar" ? "تكرار" : "Repeating"); break;
        case "s": case "S": e.preventDefault(); speak(locale === "ar" ? "طلب الملخص..." : "Requesting summary...", true); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [locale, speak, announce, toggleListening]);

  const actions = [
    {
      icon: <RotateCcw size={20} />,
      label: isAr ? "تكرار" : "Repeat",
      shortcut: "R",
      onClick: () => speak((locale === "ar" ? "تكرار: " : "Repeating: ") + lastNarrationRef.current, true),
    },
    {
      icon: <FileText size={20} />,
      label: isAr ? "ملخص" : "Summary",
      shortcut: "S",
      onClick: () => speak(locale === "ar" ? "طلب الملخص..." : "Requesting summary...", true),
    },
    {
      icon: isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />,
      label: isSpeaking ? (isAr ? "إيقاف" : "Pause") : (isAr ? "تشغيل" : "Play"),
      shortcut: "P",
      onClick: () => { if (isSpeaking) { synthRef.current?.cancel(); setIsSpeaking(false); } },
    },
  ];

  const shortcuts = [
    { key: "Space", desc: isAr ? "تشغيل / إيقاف الاستماع" : "Toggle listening"  },
    { key: "R",     desc: isAr ? "تكرار آخر نقطة"         : "Repeat last point" },
    { key: "S",     desc: isAr ? "طلب الملخص"             : "Request summary"   },
  ];

  return (
    <div className={s.page}>
      {/* Screen-reader live region */}
      <div role="status" aria-live="assertive" aria-atomic="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
        {ariaAnnouncement}
      </div>

      {/* Ambient background */}
      <div className={s.blobBg} aria-hidden="true">
        <div className={`${s.blob} ${s.blob1}`} />
        <div className={`${s.blob} ${s.blob2}`} />
      </div>
      <div className={s.gridTex} aria-hidden="true" />

      {/* Navbar */}
      <nav className={s.nav} aria-label={isAr ? "شريط التنقل" : "Navigation"}>
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

          <div className={s.rolePill}>
            <Eye size={12} aria-hidden="true" />
            {isAr ? "طالب كفيف — جلسة نشطة" : "Blind Student — Active Session"}
          </div>

          <div className={`${s.connBadge} ${connected ? s.connBadgeOn : s.connBadgeOff}`} aria-live="polite">
            {connected ? <Wifi size={11} aria-hidden="true" /> : <WifiOff size={11} aria-hidden="true" />}
            {connected ? (isAr ? "متصل" : "Connected") : (isAr ? "جارٍ الاتصال..." : "Connecting...")}
          </div>
        </div>
      </nav>

      {/* Two-column main */}
      <main className={s.main} id="main-content">
        {/* ── Controls column ── */}
        <div className={s.colControls}>
          {/* Mic */}
          <div className={s.micPanel}>
            <p className={s.panelLabel}>{isAr ? "الاستماع الصوتي" : "Voice Input"}</p>
            <div className={s.micWrap}>
              {isListening && (
                <>
                  <span className={s.ripple} aria-hidden="true" />
                  <span className={s.ripple} aria-hidden="true" />
                  <span className={s.ripple} aria-hidden="true" />
                </>
              )}
              <button
                className={`${s.micBtn} ${isListening ? s.micBtnActive : s.micBtnIdle}`}
                onClick={toggleListening}
                aria-label={isListening ? (isAr ? "إيقاف الاستماع" : "Stop listening") : (isAr ? "بدء الاستماع" : "Start listening")}
                aria-pressed={isListening}
              >
                {isListening ? <MicOff size={36} aria-hidden="true" /> : <Mic size={36} aria-hidden="true" />}
              </button>
            </div>
            <p className={`${s.micLabel} ${isListening ? s.micLabelActive : ""}`}>
              {isListening ? (isAr ? "جارٍ الاستماع..." : "Listening...") : (isAr ? "اضغط للاستماع" : "Press to listen")}
            </p>
            <AnimatePresence>
              {commandFeedback && (
                <motion.p
                  key="feedback"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={s.cmdFeedback}
                  role="status"
                  aria-live="polite"
                >
                  {commandFeedback}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Quick actions */}
          <div className={s.panel}>
            <p className={s.panelLabel}>{isAr ? "الإجراءات السريعة" : "Quick Actions"}</p>
            <div className={s.actionsGrid}>
              {actions.map(({ icon, label, shortcut, onClick }) => (
                <button
                  key={shortcut}
                  onClick={onClick}
                  className={s.actionBtn}
                  aria-label={`${label} (${shortcut})`}
                >
                  <span className={s.actionBtnIcon} aria-hidden="true">{icon}</span>
                  <span className={s.actionBtnLabel}>{label}</span>
                  <kbd className={s.actionBtnKbd}>{shortcut}</kbd>
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className={s.shortcutsPanel}>
            <p className={s.panelLabel}>{isAr ? "اختصارات لوحة المفاتيح" : "Keyboard Shortcuts"}</p>
            <dl className={s.shortcutsGrid}>
              {shortcuts.map(({ key, desc }) => (
                <div key={key} className={s.shortcutRow}>
                  <kbd className={s.shortcutKey}>{key}</kbd>
                  <span className={s.shortcutDesc}>{desc}</span>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── Narration column ── */}
        <div className={s.colNarration}>
          {/* Current narration */}
          <div className={s.narrationPanel}>
            <div className={s.narrationHeader}>
              <p className={s.panelLabel} style={{ marginBottom: 0 }}>
                {isAr ? "التعليق الصوتي الحالي" : "Current Narration"}
              </p>
              {isSpeaking && (
                <div className={s.waveBars} aria-hidden="true">
                  <span className={s.waveBar} />
                  <span className={s.waveBar} />
                  <span className={s.waveBar} />
                  <span className={s.waveBar} />
                  <span className={s.waveBar} />
                </div>
              )}
            </div>
            <p
              className={`${s.narrationText} ${isSpeaking ? s.narrationTextActive : s.narrationTextIdle}`}
              aria-live="polite"
            >
              {currentNarration || (isAr ? "في انتظار التعليق الصوتي من المحاضر..." : "Waiting for narration from lecturer...")}
            </p>
          </div>

          {/* Session ended */}
          <AnimatePresence>
            {sessionEnded && (
              <motion.div
                key="ended"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={s.endedBanner}
                role="alert"
              >
                {isAr ? "انتهت الجلسة — شكراً لحضورك" : "Session ended — Thank you for attending"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
