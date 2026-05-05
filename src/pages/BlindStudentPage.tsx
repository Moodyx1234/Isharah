import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getSocket, EVENTS } from "@/lib/socket-client";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Monitor, FileText, Wifi, WifiOff, Eye, ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const AMBER = "#f59e0b";
const AMBER_DARK = "#110900";

export default function BlindStudentPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const { locale: routeLocale = "ar" } = useParams<{ locale: string }>();
  const isAr = routeLocale === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  const [sessionCode, setSessionCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentNarration, setCurrentNarration] = useState("");
  const [slideDescription, setSlideDescription] = useState<string | null>(null);
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
        utterance.lang = locale === "ar" ? "ar-SA" : "en-US";
        utterance.rate = 0.95;
        utterance.pitch = 1;
        const voices = synthRef.current?.getVoices() || [];
        const langVoice = voices.find((v) => locale === "ar" ? v.lang.startsWith("ar") : v.lang.startsWith("en"));
        if (langVoice) utterance.voice = langVoice;
        utterance.onstart = () => { isSpeakingRef.current = true; setIsSpeaking(true); setCurrentNarration(next); lastNarrationRef.current = next; };
        utterance.onend = () => { isSpeakingRef.current = false; processQueue(); };
        utterance.onerror = () => { isSpeakingRef.current = false; processQueue(); };
        synthRef.current?.speak(utterance);
      };
      if (!isSpeakingRef.current || priority) processQueue();
    },
    [locale]
  );

  const announce = useCallback((text: string) => { setAriaAnnouncement(text); setTimeout(() => setAriaAnnouncement(""), 5000); }, []);

  useEffect(() => {
    if (!joined || hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    const greeting = locale === "ar"
      ? "مرحباً! انضممت إلى الجلسة. اضغط مسافة للاستماع. اضغط D لوصف الشريحة. اضغط R لتكرار آخر نقطة."
      : "Welcome! You've joined the session. Press Space to toggle listening. Press D to describe slide. Press R to repeat.";
    speak(greeting, true);
  }, [joined, locale, speak]);

  useEffect(() => {
    const socket = getSocket();
    socket.on(EVENTS.CONNECTED, () => setConnected(true));
    socket.on(EVENTS.DISCONNECTED, () => setConnected(false));
    socket.on("session_joined", () => setJoined(true));
    socket.on(EVENTS.SESSION_NOT_FOUND, () => setNotFound(true));
    socket.on(EVENTS.SESSION_ENDED, () => { setSessionEnded(true); setJoined(false); speak(locale === "ar" ? "انتهت الجلسة. شكراً لحضورك." : "Session ended. Thank you.", true); });
    socket.on(EVENTS.NEW_TRANSCRIPT, (entry: { text: string }) => { speak(entry.text); });
    socket.on(EVENTS.NEW_SLIDE, (data: { imageData: string }) => { slideRef.current = data.imageData; speak(locale === "ar" ? "المحاضر عرض شريحة جديدة." : "Lecturer showed a new slide.", true); });
    socket.on(EVENTS.NEW_SLIDE_DESCRIPTION, (data: { description: string }) => { setSlideDescription(data.description); speak(data.description, true); announce(data.description); });
    return () => {
      socket.off("session_joined");
      socket.off(EVENTS.SESSION_NOT_FOUND);
      socket.off(EVENTS.SESSION_ENDED);
      socket.off(EVENTS.NEW_TRANSCRIPT);
      socket.off(EVENTS.NEW_SLIDE);
      socket.off(EVENTS.NEW_SLIDE_DESCRIPTION);
    };
  }, [locale, speak, announce]);

  const describeCurrentSlide = async () => {
    if (!slideRef.current) return;
    try {
      const res = await fetch("/api/describe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageData: slideRef.current, locale }) });
      const data = await res.json();
      if (data.description) { setSlideDescription(data.description); speak(data.description, true); announce(data.description); }
    } catch { speak(locale === "ar" ? "تعذر وصف الشريحة" : "Could not describe slide", true); }
  };

  const handleVoiceCommand = useCallback((command: string) => {
    const cmd = command.toLowerCase().trim();
    if (cmd.includes("أعد") || cmd.includes("كرر") || cmd.includes("repeat")) { speak((locale === "ar" ? "تكرار: " : "Repeating: ") + (lastNarrationRef.current || ""), true); setCommandFeedback(locale === "ar" ? "تكرار آخر نقطة..." : "Repeating last point..."); }
    else if (cmd.includes("ماذا") || cmd.includes("وصف") || cmd.includes("describe")) { if (slideRef.current) { speak(locale === "ar" ? "جارٍ وصف الشريحة..." : "Describing slide...", true); setCommandFeedback(locale === "ar" ? "جارٍ الوصف..." : "Describing..."); describeCurrentSlide(); } else { speak(locale === "ar" ? "لا توجد شريحة" : "No slide", true); } }
    else if (cmd.includes("ملخص") || cmd.includes("summary")) { speak(locale === "ar" ? "طلب الملخص..." : "Requesting summary...", true); setCommandFeedback(locale === "ar" ? "طلب الملخص..." : "Requesting summary..."); }
    else if (cmd.includes("توقف") || cmd.includes("pause")) { synthRef.current?.cancel(); setIsSpeaking(false); setCommandFeedback(locale === "ar" ? "تم الإيقاف" : "Paused"); }
    setTimeout(() => setCommandFeedback(""), 3000);
  }, [locale, speak]);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    rec.lang = locale === "ar" ? "ar-SA" : "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => { handleVoiceCommand(event.results[0][0].transcript); };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
    speak(locale === "ar" ? "استمع..." : "Listening...", true);
  };

  const toggleListening = () => { if (isListening) { recognitionRef.current?.stop(); setIsListening(false); } else startListening(); };

  useEffect(() => {
    if (!joined) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case " ": e.preventDefault(); toggleListening(); break;
        case "r": case "R": e.preventDefault(); speak((locale === "ar" ? "تكرار: " : "Repeating: ") + (lastNarrationRef.current || ""), true); announce(locale === "ar" ? "تكرار" : "Repeating"); break;
        case "d": case "D": e.preventDefault(); describeCurrentSlide(); announce(locale === "ar" ? "جارٍ الوصف" : "Describing"); break;
        case "s": case "S": e.preventDefault(); speak(locale === "ar" ? "طلب الملخص..." : "Requesting summary...", true); break;
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
      <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, ${AMBER_DARK} 0%, #0a0600 100%)` }}>
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
            style={{ background: `${AMBER}22`, color: AMBER, border: `1px solid ${AMBER}33` }}
          >
            <Eye size={13} />
            {isAr ? "طالب كفيف" : "Blind Student"}
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
                background: "linear-gradient(135deg, #1a0d00 0%, rgba(26,14,0,0.95) 100%)",
                border: `1px solid ${AMBER}33`,
                boxShadow: `0 25px 80px rgba(245,158,11,0.2)`,
              }}
            >
              <div className="flex justify-center mb-6">
                <div
                  className="relative h-16 w-16 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ background: `${AMBER}18`, border: `1px solid ${AMBER}44` }}
                >
                  <Eye size={30} style={{ color: AMBER }} />
                  <span
                    className="absolute inset-0 rounded-2xl animate-ping opacity-15"
                    style={{ border: `2px solid ${AMBER}` }}
                  />
                </div>
              </div>

              <h1 className="text-2xl font-black text-white text-center mb-2">
                {t("blind_view.title")}
              </h1>
              <p className="text-center text-sm mb-7" style={{ color: "rgba(255,255,255,0.4)" }}>
                {t("blind_view.join_prompt")}
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
                  style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${AMBER}44` }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = `${AMBER}99`; (e.target as HTMLInputElement).style.boxShadow = `0 0 0 2px ${AMBER}22`; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = `${AMBER}44`; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
                  onKeyDown={(e) => { if (e.key === "Enter") joinSession(); }}
                  aria-label={t("session.code")}
                  autoFocus
                />
                <button
                  onClick={joinSession}
                  className="h-12 px-5 rounded-xl font-bold text-black shadow-lg transition-all active:scale-[0.97] shrink-0"
                  style={{ background: AMBER, boxShadow: `0 6px 24px ${AMBER}55` }}
                >
                  {t("common.join")}
                </button>
              </div>

              <p className="mt-5 text-center text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                {isAr ? "متوافق مع قارئات الشاشة • تنقل كامل بلوحة المفاتيح" : "Screen reader compatible • Full keyboard navigation"}
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#09070f", color: "#f0ebe3" }}>
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {ariaAnnouncement}
      </div>

      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0"
        style={{ borderColor: `${AMBER}18` }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: `${AMBER}18`, border: `1px solid ${AMBER}33` }}
          >
            <Eye size={16} style={{ color: AMBER }} />
          </div>
          <div>
            <p className="text-white font-black text-sm leading-none">{t("blind_view.title")}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t("blind_view.welcome")}</p>
          </div>
        </div>

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
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8" id="main-content">

        <div className="flex flex-col items-center gap-4 sm:gap-5">
          <button
            onClick={toggleListening}
            aria-label={isListening ? t("blind_view.listening") : t("blind_view.not_listening")}
            aria-pressed={isListening}
            className="relative flex items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none"
            style={{
              height: "10rem",
              width: "10rem",
              background: isListening ? AMBER : "rgba(245,158,11,0.08)",
              border: isListening ? `3px solid ${AMBER}` : `2px solid ${AMBER}33`,
              boxShadow: isListening
                ? `0 0 0 12px ${AMBER}18, 0 0 0 28px ${AMBER}09, 0 20px 60px ${AMBER}33`
                : "none",
            }}
          >
            {isListening
              ? <MicOff size={52} style={{ color: "#0a0700" }} aria-hidden />
              : <Mic size={52} style={{ color: AMBER }} aria-hidden />
            }
            {isListening && (
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: AMBER }}
              />
            )}
          </button>

          <p className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
            {isListening ? t("blind_view.listening") : t("blind_view.not_listening")}
          </p>

          <AnimatePresence>
            {commandFeedback && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-bold"
                style={{ color: AMBER }}
                role="status"
                aria-live="polite"
              >
                {commandFeedback}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { icon: <RotateCcw size={22} />, label: t("blind_view.repeat_btn"), shortcut: "R", onClick: () => speak((locale === "ar" ? "تكرار: " : "Repeating: ") + lastNarrationRef.current, true) },
            { icon: <Monitor size={22} />, label: t("blind_view.describe_btn"), shortcut: "D", onClick: describeCurrentSlide },
            { icon: <FileText size={22} />, label: locale === "ar" ? "ملخص" : "Summary", shortcut: "S", onClick: () => speak(locale === "ar" ? "طلب الملخص..." : "Requesting summary...", true) },
            { icon: isSpeaking ? <VolumeX size={22} /> : <Volume2 size={22} />, label: isSpeaking ? (locale === "ar" ? "إيقاف" : "Pause") : (locale === "ar" ? "تشغيل" : "Play"), shortcut: "P", onClick: () => { if (isSpeaking) { synthRef.current?.cancel(); setIsSpeaking(false); } } },
          ].map(({ icon, label, shortcut, onClick }) => (
            <button
              key={shortcut}
              onClick={onClick}
              aria-label={`${label} (${shortcut})`}
              className="flex flex-col items-center gap-2 rounded-2xl px-2 py-4 transition-all active:scale-[0.97] focus-visible:outline-none"
              style={{
                background: `${AMBER}0a`,
                border: `1px solid ${AMBER}22`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${AMBER}16`; (e.currentTarget as HTMLElement).style.borderColor = `${AMBER}44`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${AMBER}0a`; (e.currentTarget as HTMLElement).style.borderColor = `${AMBER}22`; }}
            >
              <div style={{ color: AMBER }}>{icon}</div>
              <span className="text-xs text-center leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
              <kbd
                className="rounded-lg px-2 py-0.5 text-xs font-mono font-bold"
                style={{ background: `${AMBER}18`, color: `${AMBER}cc`, border: `1px solid ${AMBER}33` }}
              >
                {shortcut}
              </kbd>
            </button>
          ))}
        </div>

        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{ background: `${AMBER}07`, border: `1px solid ${AMBER}18` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider flex-1" style={{ color: `${AMBER}80` }}>
              {t("blind_view.current_narration")}
            </p>
            {isSpeaking && (
              <div className="flex items-end gap-0.5 h-5" aria-hidden>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span
                    key={i}
                    className="waveform-bar w-1 rounded-full"
                    style={{ animationDelay: `${i * 0.08}s`, height: `${8 + (i % 3) * 4}px`, background: AMBER }}
                  />
                ))}
              </div>
            )}
          </div>
          <p
            className="text-lg sm:text-xl leading-relaxed font-medium transition-colors"
            style={{ color: isSpeaking ? "#fff" : "rgba(255,255,255,0.3)" }}
            aria-live="polite"
          >
            {currentNarration || t("blind_view.narration_empty")}
          </p>
        </div>

        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.28)" }}>
            {t("blind_view.keyboard_shortcuts")}
          </p>
          <dl className="grid grid-cols-2 gap-3">
            {[
              { key: "Space", desc: t("blind_view.shortcuts.space") },
              { key: "R", desc: t("blind_view.shortcuts.r") },
              { key: "D", desc: t("blind_view.shortcuts.d") },
              { key: "S", desc: t("blind_view.shortcuts.s") },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center gap-2.5">
                <kbd
                  className="rounded-xl px-2.5 py-1.5 text-xs font-mono font-black shrink-0"
                  style={{ background: `${AMBER}18`, color: AMBER, border: `1px solid ${AMBER}33` }}
                >
                  {key}
                </kbd>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</span>
              </div>
            ))}
          </dl>
        </div>

        {slideDescription && (
          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{ background: `${AMBER}0a`, border: `1px solid ${AMBER}30` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: `${AMBER}80` }}>
              {locale === "ar" ? "وصف الشريحة" : "Slide Description"}
            </p>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>{slideDescription}</p>
          </div>
        )}

        {sessionEnded && (
          <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/8 p-4 text-center" role="alert">
            <p className="text-sm text-yellow-300/80">{t("errors.session_ended")}</p>
          </div>
        )}
      </main>
    </div>
  );
}
