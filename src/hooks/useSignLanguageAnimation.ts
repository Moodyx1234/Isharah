import { useState, useRef, useCallback, useEffect } from "react";
import { GESTURES, textToGestureTokens } from "@/lib/sign-language/gestures";

const SENTENCE_START_PREFIX = "__SENTENCE_START:";

export function useSignLanguageAnimation(
  speed = 1,
  onSentenceActive?: (id: string | null) => void,
) {
  const [currentGesture, setCurrentGesture] = useState("neutral");

  const queueRef       = useRef<string[]>([]);
  const isPlayingRef   = useRef(false);
  const historyRef     = useRef<string[]>([]);
  const speedRef       = useRef(speed);
  const sentenceRef    = useRef<string | null>(null);
  const onActiveRef    = useRef(onSentenceActive);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { onActiveRef.current = onSentenceActive; }, [onSentenceActive]);

  const setActiveSentence = useCallback((id: string | null) => {
    if (sentenceRef.current === id) return;
    sentenceRef.current = id;
    onActiveRef.current?.(id);
  }, []);

  const playQueue = useCallback(async () => {
    if (isPlayingRef.current || queueRef.current.length === 0) return;
    isPlayingRef.current = true;

    while (queueRef.current.length > 0) {
      const token = queueRef.current.shift()!;

      // Sentence marker — update active sentence, don't animate
      if (token.startsWith(SENTENCE_START_PREFIX)) {
        const id = token.slice(SENTENCE_START_PREFIX.length);
        setActiveSentence(id);
        continue;
      }

      const id  = token;
      const def = GESTURES[id] ?? GESTURES.neutral;

      if (id !== "neutral") {
        historyRef.current.push(id);
        if (historyRef.current.length > 10) historyRef.current.shift();
      }

      setCurrentGesture(id);
      await new Promise<void>((r) =>
        setTimeout(r, def.durationMs / speedRef.current + 80)
      );
    }

    setCurrentGesture("neutral");
    setActiveSentence(null);
    isPlayingRef.current = false;
  }, [setActiveSentence]);

  /** Push text with optional pre-tokenized gesture IDs and a sentence ID */
  const pushText = useCallback(
    (text: string, tokens?: string[], sentenceId?: string) => {
      const ids = tokens?.length ? tokens : textToGestureTokens(text);
      if (sentenceId) {
        queueRef.current.push(`${SENTENCE_START_PREFIX}${sentenceId}`);
      }
      queueRef.current.push(...ids);
      playQueue();
    },
    [playQueue],
  );

  /** Replay the last n gestures */
  const replayLast = useCallback(
    (n = 1) => {
      if (isPlayingRef.current) return;
      const toReplay = historyRef.current.slice(-n);
      if (toReplay.length === 0) return;
      queueRef.current.unshift(...toReplay);
      playQueue();
    },
    [playQueue],
  );

  return { currentGesture, pushText, replayLast };
}
