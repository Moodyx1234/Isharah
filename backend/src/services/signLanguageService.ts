import { tokenize, normalizeAlef, removeTashkeel } from '@/utils/arabicNLP';
import { lookupWord, fingerspellWord } from '@/utils/gestureResolver';
import type { GestureSequence } from '@/types/gestures';

// Time-indicator words that should appear at the front of ArSL sentences
const TIME_WORDS = new Set([
  'اليوم',
  'الان',
  'امس',
  'غدا',
  'الاسبوع',
  // also normalised variants
  'الآن',
  'أمس',
  'غداً',
  'الأسبوع',
]);

// Standalone article words to remove (bare connectors that add no sign meaning)
const ARTICLE_WORDS = new Set(['ال']);

class SignLanguageService {
  sentenceToGestures(arabicText: string): GestureSequence[] {
    // Normalise before tokenising so comparisons work
    const normalised = normalizeAlef(removeTashkeel(arabicText));
    const words = tokenize(normalised);
    const reordered = this.applyArSLGrammar(words);
    return this.wordsToGestures(reordered);
  }

  private applyArSLGrammar(words: string[]): string[] {
    // Normalise words for comparison
    const normalise = (w: string) => normalizeAlef(removeTashkeel(w));

    const timeWords: string[] = [];
    const otherWords: string[] = [];

    for (const word of words) {
      const norm = normalise(word);

      if (ARTICLE_WORDS.has(norm)) {
        // Remove bare article words
        continue;
      }

      if (TIME_WORDS.has(norm)) {
        timeWords.push(word);
      } else {
        otherWords.push(word);
      }
    }

    // Time words go to the front
    return [...timeWords, ...otherWords];
  }

  private wordsToGestures(words: string[]): GestureSequence[] {
    const result: GestureSequence[] = [];
    let i = 0;

    while (i < words.length) {
      // Try longest n-gram first: 3-gram, then 2-gram, then 1-gram
      const tri = this.lookupNGram(words, i, 3);
      if (tri) {
        result.push(tri);
        i += 3;
        continue;
      }

      const bi = this.lookupNGram(words, i, 2);
      if (bi) {
        result.push(bi);
        i += 2;
        continue;
      }

      const uni = this.lookupNGram(words, i, 1);
      if (uni) {
        result.push(uni);
        i += 1;
        continue;
      }

      // Fallback: fingerspell the word
      const spelled = fingerspellWord(words[i]!);
      result.push(...spelled);
      i += 1;
    }

    return result;
  }

  private lookupNGram(words: string[], start: number, n: number): GestureSequence | null {
    if (start + n > words.length) return null;
    const phrase = words.slice(start, start + n).join(' ');
    return lookupWord(phrase);
  }
}

export const signLanguageService = new SignLanguageService();
