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

const RECOVERABLE = new Set(['no-speech', 'network', 'aborted']);

export function useSpeechRecognition({ onResult, onError }: Options) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const accumulatedRef = useRef('');
  const onResultRef    = useRef(onResult);
  const onErrorRef     = useRef(onError);
  onResultRef.current  = onResult;
  onErrorRef.current   = onError;

  const isSupported = (): boolean =>
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = (lang = 'ar-SA'): boolean => {
    if (!isSupported()) return false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

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
            const alternatives: Array<{ text: string; confidence: number }> = [];
            for (let j = 0; j < result.length; j++) {
              alternatives.push({ text: result[j].transcript, confidence: result[j].confidence });
            }
            onResultRef.current({ text: trimmed, isFinal: true, confidence: conf, alternatives });
          }
        } else {
          onResultRef.current({ text, isFinal: false, confidence: 0 });
        }
      }
    };

    rec.onerror = (event) => {
      const msg = ERROR_MESSAGES[event.error] ?? event.error;
      onErrorRef.current?.(msg);
      if (isListeningRef.current && RECOVERABLE.has(event.error)) {
        setTimeout(() => {
          if (isListeningRef.current) {
            try { rec.start(); } catch { /* already running */ }
          }
        }, 1_000);
      }
    };

    rec.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current) {
            try { rec.start(); } catch { /* ignore */ }
          }
        }, 300);
      }
    };

    recognitionRef.current = rec;
    isListeningRef.current = true;
    accumulatedRef.current = '';

    try {
      rec.start();
      return true;
    } catch {
      isListeningRef.current = false;
      return false;
    }
  };

  const stop = (): string => {
    isListeningRef.current = false;
    const full = accumulatedRef.current;
    accumulatedRef.current = '';
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    return full;
  };

  const changeLanguage = (lang: string): void => {
    const wasListening = isListeningRef.current;
    stop();
    if (wasListening) start(lang);
  };

  return { start, stop, changeLanguage, isSupported };
}
