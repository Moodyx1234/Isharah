import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Play, Square, Users, Hand,
  AlertCircle, Copy, Check, Loader2, Zap,
  ChevronLeft, Sun, Moon, Globe, Archive, Clipboard, X,
} from "lucide-react";
import { wsClient, EVENTS } from "@/lib/socket-client";
import { sampleTranscriptAr } from "@/lib/sample-transcript";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { sessionArchive } from "@/utils/sessionArchive";
import s from "./LecturerDashboard.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptLine { id: string; text: string; sequenceNum: number }
interface HandRaised     { enrollmentId: string; studentName: string }
type MicStatus = 'idle' | 'requesting' | 'active' | 'error';

const API_URL: string = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

const BAR_MULTIPLIERS = [0.55, 0.85, 0.70, 1.00, 0.75, 0.60, 0.95, 0.80, 0.65, 0.90, 0.70, 0.55];

const STT_SOURCE_LABEL: Record<string, string> = {
  'web-speech': '🎯 Web Speech',
  'whisper-hf': '🤖 Whisper AI',
  'none':       '—',
};

function checkMicSupport(): string | null {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'المتصفح لا يدعم الوصول إلى الميكروفون. استخدم Chrome أو Firefox.';
  }
  if (typeof AudioContext === 'undefined' && typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext === 'undefined') {
    return 'المتصفح لا يدعم معالجة الصوت.';
  }
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return 'يلزم اتصال آمن (HTTPS) لاستخدام الميكروفون.';
  }
  return null;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Framer-motion variants ───────────────────────────────────────────────────

const panelContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const panelItem = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LecturerDashboard() {
  const { t, i18n } = useTranslation();
  const { locale = "ar" } = useParams<{ locale: string }>();

  // ── Setup state ────────────────────────────────────────────────────────────
  const [lecturerName,  setLecturerName]  = useState("");
  const [sessionTitle,  setSessionTitle]  = useState("");
  const [startLoading,  setStartLoading]  = useState(false);

  // ── Session state ──────────────────────────────────────────────────────────
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionCode,     setSessionCode]     = useState<string | null>(null);
  const [sessionId,       setSessionId]       = useState<string | null>(null);
  const [isDemoRunning,   setIsDemoRunning]   = useState(false);
  const [transcript,      setTranscript]      = useState<TranscriptLine[]>([]);
  const [currentText,     setCurrentText]     = useState("");
  const [codeCopied,      setCodeCopied]      = useState(false);
  const [startError,      setStartError]      = useState("");

  // ── Mic state ──────────────────────────────────────────────────────────────
  const [micStatus,     setMicStatus]     = useState<MicStatus>('idle');
  const [micError,      setMicError]      = useState('');
  const [audioLevel,    setAudioLevel]    = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sttSource,     setSttSource]     = useState<string | null>(null);
  const [avgConfidence, setAvgConfidence] = useState(0);
  const [saveToast,     setSaveToast]     = useState(false);

  // ── Student state ──────────────────────────────────────────────────────────
  const [studentCount, setStudentCount] = useState({ deaf: 0, sighted: 0, total: 0 });
  const [raisedHands,  setRaisedHands]  = useState<HandRaised[]>([]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") !== "light");

  // ── Refs ───────────────────────────────────────────────────────────────────
  const audioContextRef  = useRef<AudioContext | null>(null);
  const processorRef     = useRef<ScriptProcessorNode | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const sequenceRef      = useRef(0);
  const animFrameRef     = useRef<number | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceChangeRef  = useRef<(() => Promise<void>) | null>(null);
  const demoTimersRef    = useRef<ReturnType<typeof setTimeout>[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const confidenceHistRef = useRef<number[]>([]);
  const recStartTimeRef   = useRef<Date | null>(null);
  const transcriptRef     = useRef<TranscriptLine[]>([]);

  // Keep transcriptRef in sync with state (for use inside stopRecording closure)
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const ar = (a: string, b: string) => (locale === "ar" ? a : b);
  const sttLang = locale === "ar" ? "ar-SA" : "en-US";

  // ── Web Speech API ─────────────────────────────────────────────────────────
  const speechRec = useSpeechRecognition({
    onResult: (result) => {
      if (result.isFinal) {
        const id = `stt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setTranscript((prev) => [...prev, { id, text: result.text, sequenceNum: prev.length }]);
        setCurrentText('');
        if (result.confidence > 0) {
          confidenceHistRef.current.push(result.confidence);
          const avg = confidenceHistRef.current.reduce((a, b) => a + b, 0) / confidenceHistRef.current.length;
          setAvgConfidence(avg);
        }
      } else {
        setCurrentText(result.text);
      }
    },
    onError: (msg) => {
      // STT errors don't stop recording — just log them
      console.warn('[STT]', msg);
    },
  });

  const archiveCount = sessionArchive.getAll().length;

  const toggleDark = () => {
    setIsDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("light", !next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const toggleLang = () => {
    const next = locale === "ar" ? "en" : "ar";
    i18n.changeLanguage(next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  };

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleTranscript = (data: unknown) => {
      const d = data as { id: string; text: string; sequenceNum: number; isFinal: boolean };
      if (!d.isFinal) return;
      setTranscript((prev) => {
        if (prev.some((e) => e.id === d.id)) return prev;
        return [...prev, { id: d.id, text: d.text, sequenceNum: d.sequenceNum }];
      });
    };

    const handleCount = (data: unknown) => {
      setStudentCount(data as { deaf: number; sighted: number; total: number });
    };

    const handleHand = (data: unknown) => {
      const d = data as { enrollmentId: string; studentName: string; raised: boolean };
      setRaisedHands((prev) =>
        d.raised
          ? prev.some((h) => h.enrollmentId === d.enrollmentId) ? prev : [...prev, { enrollmentId: d.enrollmentId, studentName: d.studentName }]
          : prev.filter((h) => h.enrollmentId !== d.enrollmentId),
      );
    };

    const handleError = (data: unknown) => {
      const d = data as { message: string };
      setStartError(d.message ?? "");
    };

    wsClient.on(EVENTS.TRANSCRIPT_UPDATE, handleTranscript);
    wsClient.on(EVENTS.STUDENT_COUNT,     handleCount);
    wsClient.on(EVENTS.HAND_RAISED,       handleHand);
    wsClient.on(EVENTS.ERROR,             handleError);

    return () => {
      wsClient.off(EVENTS.TRANSCRIPT_UPDATE, handleTranscript);
      wsClient.off(EVENTS.STUDENT_COUNT,     handleCount);
      wsClient.off(EVENTS.HAND_RAISED,       handleHand);
      wsClient.off(EVENTS.ERROR,             handleError);
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // ── Session handlers ───────────────────────────────────────────────────────
  const startSession = async () => {
    setStartError("");
    setStartLoading(true);
    try {
      const res  = await fetch(`${API_URL}/sessions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:        sessionTitle.trim() || "محاضرة جديدة",
          lecturerName: lecturerName.trim() || "المحاضر",
        }),
      });
      const data = await res.json() as { id?: string; code?: string; message?: string };
      if (!res.ok || !data.id || !data.code) throw new Error(data.message ?? "فشل إنشاء الجلسة");

      setSessionId(data.id);
      setSessionCode(data.code);
      setIsSessionActive(true);
      setTranscript([]);
      setStudentCount({ deaf: 0, sighted: 0, total: 0 });
      setRaisedHands([]);

      wsClient.connect();
      if (wsClient.isConnected) {
        wsClient.send("JOIN_AS_LECTURER", { sessionId: data.id });
        wsClient.send("START_SESSION",    { sessionId: data.id });
      } else {
        wsClient.once(EVENTS.CONNECTED, () => {
          wsClient.send("JOIN_AS_LECTURER", { sessionId: data.id });
          wsClient.send("START_SESSION",    { sessionId: data.id });
        });
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "فشل إنشاء الجلسة");
    } finally {
      setStartLoading(false);
    }
  };

  const endSession = () => {
    if (!sessionId) return;
    stopRecording();
    stopDemo();
    wsClient.send("END_SESSION", { sessionId });
    wsClient.disconnect();
    setIsSessionActive(false);
    setSessionCode(null);
    setSessionId(null);
  };

  // ── Audio recording ────────────────────────────────────────────────────────
  const stopRecording = () => {
    const wasActive = micStatus === 'active';

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (deviceChangeRef.current) {
      navigator.mediaDevices.removeEventListener('devicechange', deviceChangeRef.current as EventListener);
      deviceChangeRef.current = null;
    }

    speechRec.stop();

    processorRef.current?.disconnect();
    processorRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Auto-save to archive when recording was active
    if (wasActive && sessionId && sessionCode) {
      const lines = transcriptRef.current;
      const fullTranscript = lines.map((t) => t.text).join(' ');
      if (fullTranscript.trim()) {
        sessionArchive.save({
          id:               sessionId,
          code:             sessionCode,
          title:            sessionTitle.trim() || 'محاضرة جديدة',
          lecturerName:     lecturerName.trim() || 'المحاضر',
          language:         sttLang,
          startedAt:        recStartTimeRef.current?.toISOString() ?? new Date().toISOString(),
          duration:         recordingTime,
          fullTranscript,
          studentCounts:    { total: studentCount.total, deaf: studentCount.deaf, sighted: studentCount.sighted },
          sttSource:        sttSource ?? 'web-speech',
          averageConfidence: avgConfidence,
        });
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 3_500);
      }
    }

    setMicStatus('idle');
    setAudioLevel(0);
    setRecordingTime(0);
    setCurrentText("");
    setSttSource(null);
  };

  const startRecording = async () => {
    if (!sessionId) return;

    const compatError = checkMicSupport();
    if (compatError) {
      setMicStatus('error');
      setMicError(compatError);
      return;
    }

    setMicStatus('requesting');
    setMicError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16_000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const ctx = new AudioContext({ sampleRate: 16_000 });
      if (ctx.state === 'suspended') await ctx.resume();

      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const processor = ctx.createScriptProcessor(4_096, 1, 1);

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(freqData);
        const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
        setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);

      processor.onaudioprocess = (e) => {
        if (audioContextRef.current?.state === 'suspended') {
          void audioContextRef.current.resume();
          return;
        }
        const float32 = e.inputBuffer.getChannelData(0);
        const int16   = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32_768, Math.min(32_767, Math.round(float32[i] * 32_767)));
        }
        const seq = sequenceRef.current++;
        const buf = new ArrayBuffer(4 + int16.byteLength);
        new DataView(buf).setUint32(0, seq, false);
        new Uint8Array(buf).set(new Uint8Array(int16.buffer), 4);
        wsClient.sendBinary(buf);
      };

      src.connect(analyser);
      src.connect(processor);
      processor.connect(ctx.destination);

      audioContextRef.current = ctx;
      processorRef.current    = processor;
      analyserRef.current     = analyser;
      streamRef.current       = stream;

      deviceChangeRef.current = async () => {
        if (!streamRef.current) return;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasMic  = devices.some((d) => d.kind === 'audioinput');
          if (!hasMic) {
            stopRecording();
            setMicStatus('error');
            setMicError(ar('تم فصل الميكروفون. يرجى إعادة توصيله والمحاولة مرة أخرى.', 'Microphone disconnected. Reconnect and try again.'));
          }
        } catch { /* ignore */ }
      };
      navigator.mediaDevices.addEventListener('devicechange', deviceChangeRef.current as EventListener);

      // Start Web Speech API
      confidenceHistRef.current = [];
      recStartTimeRef.current   = new Date();
      const sttStarted = speechRec.start(sttLang);
      setSttSource(sttStarted ? 'web-speech' : null);
      if (!sttStarted) {
        console.warn('[STT] Web Speech API not supported in this browser');
      }

      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((s) => s + 1), 1_000);

      setMicStatus('active');
    } catch (err) {
      setMicStatus('error');
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicError(ar('تم رفض الوصول إلى الميكروفون. يرجى السماح بالوصول في إعدادات المتصفح.', 'Microphone access denied. Allow access in browser settings.'));
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setMicError(ar('لم يتم العثور على ميكروفون. يرجى توصيل جهاز والمحاولة مرة أخرى.', 'No microphone found. Connect a device and try again.'));
        } else {
          setMicError(ar(`خطأ في الميكروفون: ${err.message}`, `Microphone error: ${err.message}`));
        }
      } else {
        setMicError(ar('فشل تشغيل الميكروفون. يرجى المحاولة مرة أخرى.', 'Failed to start microphone. Please try again.'));
      }
    }
  };

  // ── Demo mode ─────────────────────────────────────────────────────────────
  const startDemo = () => {
    if (!isSessionActive) return;
    setIsDemoRunning(true);
    sampleTranscriptAr.forEach((chunk, i) => {
      const timer = setTimeout(() => {
        const text = locale === "ar" ? chunk.text : chunk.textEn;
        setTranscript((prev) => [...prev, { id: `demo-${i}`, text, sequenceNum: i }]);
        setCurrentText(text);
        setTimeout(() => setCurrentText(""), 2_000);
      }, chunk.delayMs);
      demoTimersRef.current.push(timer);
    });
    const last = sampleTranscriptAr[sampleTranscriptAr.length - 1];
    demoTimersRef.current.push(
      setTimeout(() => { setIsDemoRunning(false); setCurrentText(""); }, last.delayMs + 3_000),
    );
  };

  const stopDemo = () => {
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [];
    setIsDemoRunning(false);
    setCurrentText("");
  };

  const copyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2_000);
  };

  const copyTranscript = () => {
    const text = transcript.map((t) => t.text).join(' ');
    navigator.clipboard.writeText(text);
  };

  const clearTranscript = () => {
    setTranscript([]);
    setCurrentText('');
  };

  // ── Pre-session setup screen ───────────────────────────────────────────────
  if (!isSessionActive) {
    return (
      <div className={s.page} dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className={s.blobBg} aria-hidden>
          <div className={`${s.blob} ${s.blob1}`} />
          <div className={`${s.blob} ${s.blob2}`} />
        </div>
        <div className={s.gridTex} aria-hidden />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={s.panel}
            style={{ width: 380, padding: 32 }}
          >
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div className={s.logoIcon} style={{ margin: "0 auto 12px" }}>
                <span className={s.logoGlyph}>إش</span>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700 }}>{ar("إنشاء جلسة جديدة", "New Session")}</h1>
              <p style={{ opacity: 0.55, fontSize: 13, marginTop: 4 }}>
                {ar("المحاضر — لا يلزم حساب", "Lecturer — no account needed")}
              </p>
            </div>

            {startError && (
              <div className={s.micError} style={{ marginBottom: 16 }}>
                <AlertCircle size={14} aria-hidden />
                <span>{startError}</span>
              </div>
            )}

            <input
              type="text"
              placeholder={ar("اسم المحاضر (اختياري)", "Lecturer name (optional)")}
              value={lecturerName}
              onChange={(e) => setLecturerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") startSession(); }}
              style={{ width: "100%", padding: "10px 14px", marginBottom: 10, borderRadius: 8, border: "1px solid var(--border-subtle, #333)", background: "var(--bg-secondary, #1a1a2e)", color: "inherit", fontSize: 14, boxSizing: "border-box" }}
            />
            <input
              type="text"
              placeholder={ar("عنوان المحاضرة (اختياري)", "Session title (optional)")}
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") startSession(); }}
              style={{ width: "100%", padding: "10px 14px", marginBottom: 20, borderRadius: 8, border: "1px solid var(--border-subtle, #333)", background: "var(--bg-secondary, #1a1a2e)", color: "inherit", fontSize: 14, boxSizing: "border-box" }}
            />

            <button
              onClick={startSession}
              disabled={startLoading}
              className={s.btnSession}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {startLoading
                ? <Loader2 size={14} className={s.spinIcon} aria-hidden />
                : <Play size={14} aria-hidden />}
              {ar("ابدأ الجلسة ▶", "Start Session ▶")}
            </button>

            <button
              onClick={async () => { await startSession(); setTimeout(startDemo, 600); }}
              disabled={startLoading}
              className={s.btnDemo}
              style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            >
              <Zap size={13} aria-hidden />
              {ar("بدء العرض التجريبي ✦", "Demo ✦")}
            </button>

            {archiveCount > 0 && (
              <Link
                to={`/${locale}/archive`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, fontSize: 13, color: "rgba(240,244,248,0.4)", textDecoration: "none", transition: "color 0.2s" }}
              >
                <Archive size={13} aria-hidden />
                {ar(`${archiveCount} جلسة محفوظة`, `${archiveCount} saved session${archiveCount !== 1 ? 's' : ''}`)}
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div className={s.page} dir={locale === "ar" ? "rtl" : "ltr"}>

      <div className={s.blobBg} aria-hidden>
        <div className={`${s.blob} ${s.blob1}`} />
        <div className={`${s.blob} ${s.blob2}`} />
      </div>
      <div className={s.gridTex} aria-hidden />

      {/* ── Save toast ── */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            style={{
              position: 'fixed', bottom: 28, insetInlineEnd: 28, zIndex: 999,
              background: 'rgba(0,201,160,0.15)', border: '1px solid rgba(0,201,160,0.3)',
              borderRadius: 12, padding: '12px 18px', fontSize: 14, fontWeight: 600,
              color: '#00c9a7', display: 'flex', alignItems: 'center', gap: 8,
              backdropFilter: 'blur(12px)',
            }}
          >
            <Check size={14} aria-hidden />
            {ar("✓ تم حفظ الجلسة في الأرشيف", "✓ Session saved to archive")}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <motion.nav
        className={s.nav}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className={s.navInner}>

          <Link to={`/${locale}`} className={s.logo}>
            <div className={s.logoIcon}><span className={s.logoGlyph}>إ</span></div>
            <div>
              <div className={s.logoName}>إشارة</div>
              <div className={s.logoSub}>Isharah</div>
            </div>
          </Link>

          <nav className={s.navLinks} aria-label="Role navigation">
            <Link to={`/${locale}/lecturer`}       className={`${s.navRole} ${s.navRoleActive}`}>{ar("المحاضر", "Lecturer")}</Link>
            <Link to={`/${locale}/student/deaf`}   className={s.navRole}>{ar("الطالب الأصم", "Deaf Student")}</Link>
            <Link to={`/${locale}/student/blind`}  className={s.navRole}>{ar("الطالب الكفيف", "Blind Student")}</Link>
          </nav>

          <div className={s.navActions}>
            <button onClick={toggleLang} className={s.navIconBtn} aria-label="Toggle language">
              <Globe size={14} aria-hidden />
              <span>{locale === "ar" ? "EN" : "عر"}</span>
            </button>
            <button onClick={toggleDark} className={s.navIconBtn} aria-label={isDark ? "Light mode" : "Dark mode"}>
              {isDark ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
            </button>

            <Link to={`/${locale}/archive`} className={s.navIconBtn} aria-label={ar("الأرشيف", "Archive")} style={{ textDecoration: 'none', position: 'relative' }}>
              <Archive size={14} aria-hidden />
              {archiveCount > 0 && (
                <span style={{ position: 'absolute', top: 2, insetInlineEnd: 2, width: 7, height: 7, borderRadius: '50%', background: '#00c9a7' }} aria-hidden />
              )}
            </Link>

            <button
              onClick={() => { if (isDemoRunning) stopDemo(); else startDemo(); }}
              className={s.btnDemo}
            >
              <Zap size={13} aria-hidden />
              {isDemoRunning ? ar("إيقاف العرض", "Stop Demo") : ar("بدء العرض التجريبي ✦", "Demo ✦")}
            </button>

            <button onClick={endSession} className={s.btnSessionEnd}>
              <Square size={13} aria-hidden />
              {ar("إنهاء الجلسة", "End Session")}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ══ SESSION CODE BANNER ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {sessionCode && (
          <motion.div
            className={s.sessionBanner}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className={s.sessionLabel}>{ar("كود الجلسة", "Session Code")}</span>
            <div className={s.sessionCodeWrap}>
              <span className={s.sessionCode}>{sessionCode}</span>
              <button onClick={copyCode} className={s.copyBtn} aria-label={codeCopied ? "Copied!" : "Copy code"}>
                {codeCopied
                  ? <Check size={13} style={{ color: "#4ade80" }} />
                  : <Copy size={13} style={{ color: "#00c9a7" }} />}
              </button>
            </div>
            <div className={s.sessionCount}>
              <span className={s.sessionDot} aria-hidden />
              {studentCount.total} {ar("طالب", "students")}
              {studentCount.deaf > 0    && ` (${studentCount.deaf} ${ar("أصم", "deaf")})`}
              {studentCount.sighted > 0 && ` (${studentCount.sighted} ${ar("مبصر", "sighted")})`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MAIN ════════════════════════════════════════════════════════════ */}
      <main className={s.main} id="main-content">

        {startError && (
          <div className={s.micError} style={{ marginBottom: 16, maxWidth: 600, margin: "0 auto 16px" }}>
            <AlertCircle size={15} aria-hidden />
            <span>{startError}</span>
          </div>
        )}

        <motion.div
          className={s.pageHeader}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <div className={s.titleBlock}>
            <div className={s.breadcrumb}>
              <Link to={`/${locale}`} className={s.breadcrumbLink}>{ar("لوحة التحكم", "Dashboard")}</Link>
              <ChevronLeft size={11} className={s.breadcrumbSep} aria-hidden />
              <span>{ar("لوحة تحكم المحاضر", "Lecturer Dashboard")}</span>
            </div>
            <h1 className={s.pageTitle}>{t("lecturer.title")}</h1>
            <div className={s.sessionActivePill}>
              <span className={s.sessionDot} aria-hidden />
              {ar("الجلسة نشطة", "Session Active")}
            </div>
          </div>
        </motion.div>

        <motion.div
          className={s.grid}
          variants={panelContainer}
          initial="hidden"
          animate="show"
        >
          {/* ── RIGHT COLUMN ── */}
          <div className={s.colRight}>

            {/* Panel A — Microphone / Transcript */}
            <motion.div variants={panelItem} className={s.panel}>
              <div className={s.panelHeader}>
                <h2 className={s.panelTitle}>
                  <span className={s.panelIcon}><Mic size={16} aria-hidden /></span>
                  {t("lecturer.microphone")}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {sttSource && (
                    <span style={{ fontSize: 11, color: '#00c9a7', opacity: 0.8, background: 'rgba(0,201,160,0.1)', border: '1px solid rgba(0,201,160,0.2)', borderRadius: 100, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                      {STT_SOURCE_LABEL[sttSource] ?? sttSource}
                      {avgConfidence > 0 && ` · ${Math.round(avgConfidence * 100)}%`}
                    </span>
                  )}
                  {micStatus === 'active' && (
                    <span className={s.recordingTimer} aria-live="off">
                      {formatTime(recordingTime)}
                    </span>
                  )}
                </div>
              </div>

              {/* Mic error banner */}
              {micStatus === 'error' && micError && (
                <div className={s.micError} style={{ marginBottom: 14 }}>
                  <AlertCircle size={15} aria-hidden />
                  <span>{micError}</span>
                </div>
              )}

              {/* Mic action row */}
              <div className={s.micActions} style={{ marginBottom: 16 }}>
                {(micStatus === 'idle' || micStatus === 'error') && (
                  <button
                    onClick={startRecording}
                    disabled={isDemoRunning}
                    className={s.btnMicStart}
                    aria-label={ar("ابدأ التسجيل", "Start Recording")}
                  >
                    <Mic size={15} aria-hidden />
                    {micStatus === 'error'
                      ? ar("إعادة المحاولة", "Retry")
                      : ar("ابدأ التسجيل", "Start Recording")}
                  </button>
                )}

                {micStatus === 'requesting' && (
                  <button disabled className={s.btnMicRequesting} aria-live="polite">
                    <Loader2 size={15} className={s.spinIcon} aria-hidden />
                    {ar("جارٍ طلب الإذن...", "Requesting permission...")}
                  </button>
                )}

                {micStatus === 'active' && (
                  <>
                    <button
                      onClick={stopRecording}
                      className={s.btnMicStop}
                      aria-label={ar("إيقاف التسجيل", "Stop Recording")}
                    >
                      <MicOff size={15} aria-hidden />
                      {ar("إيقاف التسجيل", "Stop Recording")}
                      <span className={s.waveWrap} aria-hidden>
                        {[1,2,3,4,5].map((i) => <span key={i} className={s.waveBar} />)}
                      </span>
                    </button>

                    <div className={s.levelViz} aria-hidden role="presentation">
                      {BAR_MULTIPLIERS.map((mul, i) => (
                        <div
                          key={i}
                          className={s.levelBar}
                          style={{ height: `${Math.max(8, Math.round(audioLevel * mul))}%` }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <AnimatePresence>
                {currentText && (
                  <motion.div
                    className={s.interimBubble}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginBottom: 14, overflow: "hidden" }}
                    aria-live="polite"
                  >
                    {currentText}
                    {micStatus === 'active' && (
                      <span style={{ display: 'inline-block', animation: 'blink 1s step-end infinite', color: '#00c9a7', fontWeight: 'bold', marginInlineStart: 2 }}>|</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transcript header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p className={s.transcriptLabel} style={{ margin: 0 }}>{t("lecturer.transcript")}</p>
                {transcript.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={copyTranscript}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 9px', color: 'rgba(240,244,248,0.45)', fontSize: 11, cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', transition: 'color 0.2s, border-color 0.2s' }}
                      aria-label={ar("نسخ النص", "Copy transcript")}
                    >
                      <Clipboard size={11} aria-hidden />
                      {ar("نسخ", "Copy")}
                    </button>
                    <button
                      onClick={clearTranscript}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 9px', color: 'rgba(240,244,248,0.35)', fontSize: 11, cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', transition: 'color 0.2s' }}
                      aria-label={ar("مسح النص", "Clear transcript")}
                    >
                      <X size={11} aria-hidden />
                      {ar("مسح", "Clear")}
                    </button>
                  </div>
                )}
              </div>

              <div className={s.transcriptBox} aria-live="polite">
                {transcript.length === 0
                  ? <span className={s.transcriptEmpty}>
                      {micStatus === 'active'
                        ? ar("جارٍ الاستماع...", "Listening...")
                        : t("lecturer.transcript_empty")}
                    </span>
                  : transcript.map((entry) => (
                      <p key={entry.id} className={s.transcriptEntry}>{entry.text}</p>
                    ))}
                <div ref={transcriptEndRef} />
              </div>
            </motion.div>

            {/* Panel D — Demo Mode */}
            <motion.div variants={panelItem} className={s.panelDemo}>
              <div className={s.demoInner}>
                <div className={s.demoIconWrap}><Zap size={20} aria-hidden /></div>
                <div style={{ flex: 1 }}>
                  <p className={s.demoTitle}>{t("lecturer.demo_mode")}</p>
                  <p className={s.demoDesc}>{t("lecturer.demo_mode_desc")}</p>
                  <button
                    className={`${s.demoCta} ${isDemoRunning ? s.demoRunningCta : ""}`}
                    onClick={() => { if (isDemoRunning) stopDemo(); else startDemo(); }}
                  >
                    {isDemoRunning ? t("lecturer.demo_stop") : t("lecturer.demo_start")}
                    <ChevronLeft size={13} aria-hidden />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── LEFT COLUMN ── */}
          <div className={s.colLeft}>

            {/* Panel B — Connected Students */}
            <motion.div variants={panelItem} className={s.panel} style={{ flex: 1 }}>
              <div className={s.panelHeader}>
                <h2 className={s.panelTitle}>
                  <span className={s.panelIcon}><Users size={16} aria-hidden /></span>
                  {t("lecturer.students")}
                </h2>
                {studentCount.total > 0 && (
                  <span className={s.studentCount}>{studentCount.total}</span>
                )}
              </div>

              {studentCount.total === 0 ? (
                <div className={s.studentsEmpty}>
                  <div className={s.studentsEmptyIcon} aria-hidden><Users size={22} /></div>
                  <p className={s.studentsEmptyText}>{t("session.no_students")}</p>
                </div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 13 }}>
                    {studentCount.deaf > 0 && (
                      <span className={s.studentBadge}>🤟 {studentCount.deaf} {ar("أصم", "Deaf")}</span>
                    )}
                    {studentCount.sighted > 0 && (
                      <span className={s.studentBadgeSighted}>👁 {studentCount.sighted} {ar("مبصر", "Sighted")}</span>
                    )}
                  </div>
                </div>
              )}

              {raisedHands.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 8 }}>
                    {ar("الأيدي المرفوعة:", "Raised hands:")}
                  </p>
                  <ul className={s.studentsList} role="list">
                    <AnimatePresence>
                      {raisedHands.map((h) => (
                        <motion.li
                          key={h.enrollmentId}
                          className={s.studentItem}
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -14 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className={s.studentAvatar} aria-hidden>
                            {h.studentName[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span className={s.studentBadge}>{h.studentName}</span>
                          <Hand size={15} className={s.studentHandIcon} aria-label={ar("رفع اليد", "hand raised")} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
