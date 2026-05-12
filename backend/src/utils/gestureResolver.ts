import type { GestureSequence } from '@/types/gestures';

// ---------------------------------------------------------------------------
// JSON data types
// ---------------------------------------------------------------------------

interface GestureEntry {
  gestureId: string;
  durationMs: number;
  category: string;
}

interface FingerspellingEntry {
  handshapeId: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Load data files (resolveJsonModule + require so relative path works at
// runtime regardless of CWD, anchored to __dirname)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const gesturesData: Record<string, GestureEntry> = require('../../data/arsl-gestures.json') as Record<string, GestureEntry>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fingerspellingData: Record<string, FingerspellingEntry> = require('../../data/arabic-fingerspelling.json') as Record<string, FingerspellingEntry>;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a word in the ARSL gesture dictionary.
 * Returns a GestureSequence of type 'sign', or null if the word has no entry.
 */
export function lookupWord(word: string): GestureSequence | null {
  const entry = gesturesData[word];
  if (!entry) return null;
  return {
    type: 'sign',
    gestureId: entry.gestureId,
    word,
    durationMs: entry.durationMs,
    category: entry.category,
  };
}

/**
 * Look up a single character in the Arabic fingerspelling dictionary.
 * Returns a GestureSequence of type 'fingerspell', or null if the character
 * has no entry.
 */
export function fingerspellChar(char: string): GestureSequence | null {
  const entry = fingerspellingData[char];
  if (!entry) return null;
  return {
    type: 'fingerspell',
    gestureId: entry.handshapeId,
    character: char,
    durationMs: entry.durationMs,
  };
}

/**
 * Fingerspell an entire word, character by character.
 * Characters without a dictionary entry are silently skipped.
 */
export function fingerspellWord(word: string): GestureSequence[] {
  return Array.from(word)
    .map((char) => fingerspellChar(char))
    .filter((seq): seq is GestureSequence => seq !== null);
}
