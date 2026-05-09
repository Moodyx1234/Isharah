import { useRef } from "react";

export interface SpeechResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  alternatives?: Array<{ text: string; confidence: number }>;
}

interface Options {
  onResult: (result: SpeechResult) => void;
  onError?: (message: string) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  'no-speech':              'لم يتم اكتشاف كلام — يرجى التحدث',
  'audio-capture':          'لا يمكن الوصول إلى الميكروفون',
  'not-allowed':            'تم رفض إذن الميكروفون',
  'network':                'خطأ في الشبكة أثناء التعرف على الكلام',
  'aborted':                'توقف التعرف على الكلام',
  'language-not-supported': 'اللغة غير مدعومة في هذا المتصفح',
  'service-not-allowed':    'خدمة التعرف على الكلام غير متاحة',
};

// Non-recoverable: stop the auto-restart loop on these errors
const NON_RECOVERABLE = new Set(['not-allowed', 'audio-capture', 'language-not-supported', 'service-not-allowed']);

export function useSpeechRecognition({ onResult, onError }: Options) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const accumulatedRef = useRef('');
  const lastInterimRef = useRef('');   // fallback if recognition ends before final results
  const currentLangRef = useRef('ar-SA');
  const onResultRef    = useRef(onResult);
  const onErrorRef     = useRef(onError);
  onResultRef.current  = onResult;
  onErrorRef.current   = onError;

  const isSupported = (): boolean =>
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Creates a fresh SpeechRecognition instance and starts it.
  // All restarts go through this so we never reuse a stale/error-state instance.
  function _startInstance(lang: string): SpeechRecognition | null {
    if (!isSupported()) return null;
    const Ctor = (window.SpeechRecognition ?? window.webkitSpeechRecognition)!;
    const rec  = new Ctor();

    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 3;
    rec.lang            = lang;

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text   = result[0].transcript;
        const conf   = result[0].confidence ?? 0;

        if (result.isFinal) {
          const trimmed = text.trim();
          if (trimmed) {
            accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + trimmed;
            lastInterimRef.current = ''; // clear once we have a confirmed final
            const alternatives: Array<{ text: string; confidence: number }> = [];
            for (let j = 0; j < result.length; j++) {
              alternatives.push({ text: result[j].transcript, confidence: result[j].confidence });
            }
            onResultRef.current({ text: trimmed, isFinal: true, confidence: conf, alternatives });
          }
        } else {
          lastInterimRef.current = text; // keep last interim as fallback
          onResultRef.current({ text, isFinal: false, confidence: 0 });
        }
      }
    };

    // onerror: report the error and gate auto-restart for fatal errors.
    // Do NOT schedule a restart here — onend always fires after onerror,
    // and onend is the single place where restart happens. Having two
    // restart paths (onerror + onend) causes a race: onend fires at 300ms,
    // then onerror fires at 1000ms on an already-running instance →
    // InvalidStateError → Chrome leaves recognition in a broken state.
    rec.onerror = (event) => {
      const msg = ERROR_MESSAGES[event.error] ?? event.error;
      onErrorRef.current?.(msg);
      if (NON_RECOVERABLE.has(event.error)) {
        // Prevent onend from restarting for fatal errors
        isListeningRef.current = false;
      }
    };

    // onend is the single restart gate. Creates a NEW instance each time so
    // we never carry over error state from the previous session.
    rec.onend = () => {
      // Guard: only restart if this instance is still the active one
      if (isListeningRef.current && recognitionRef.current === rec) {
        recognitionRef.current = null;
        setTimeout(() => {
          if (isListeningRef.current) {
            const newRec = _startInstance(currentLangRef.current);
            if (newRec) recognitionRef.current = newRec;
          }
        }, 300);
      }
    };

    try {
      rec.start();
      return rec;
    } catch {
      return null;
    }
  }

  const start = (lang = 'ar-SA'): boolean => {
    if (!isSupported()) return false;
    currentLangRef.current = lang;

    // Nullify recognitionRef BEFORE stopping so the old onend handler
    // sees recognitionRef.current !== rec and does not trigger a restart
    if (recognitionRef.current) {
      const old = recognitionRef.current;
      recognitionRef.current = null;
      try { old.stop(); } catch { /* ignore */ }
    }

    isListeningRef.current = true;
    accumulatedRef.current = '';

    const rec = _startInstance(lang);
    if (rec) {
      recognitionRef.current = rec;
      return true;
    }
    isListeningRef.current = false;
    return false;
  };

  const stop = (): string => {
    isListeningRef.current = false;
    const full    = accumulatedRef.current;
    const interim = lastInterimRef.current;
    accumulatedRef.current = '';
    lastInterimRef.current = '';
    // Nullify first so onend guard blocks any pending restart
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try { rec?.stop(); } catch { /* ignore */ }
    // Return confirmed finals; fall back to last interim if recognition ended mid-utterance
    return full.trim() || interim.trim();
  };

  const changeLanguage = (lang: string): void => {
    const wasListening = isListeningRef.current;
    stop();
    if (wasListening) start(lang);
  };

  return { start, stop, changeLanguage, isSupported };
}
