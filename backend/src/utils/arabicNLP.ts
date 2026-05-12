/**
 * Arabic NLP utilities
 */

/**
 * Strip Arabic diacritics (tashkeel: U+0617–U+061A and U+064B–U+0652).
 */
export function removeTashkeel(text: string): string {
  // U+0617–U+061A: extended Arabic signs; U+064B–U+0652: standard harakat/shadda/sukun
  return text.replace(/[ؗ-ًؚ-ْ]/g, '');
}

/**
 * Normalise alef variants (أ إ آ ٱ) to bare alef (ا).
 */
export function normalizeAlef(text: string): string {
  return text.replace(/[أإآٱ]/g, 'ا');
}

/**
 * Replace tā' marbūṭa (ة) with hā' (ه).
 */
export function normalizeTaMarbuta(text: string): string {
  return text.replace(/ة/g, 'ه');
}

/**
 * Tokenise Arabic text into words.
 * Steps: remove tashkeel → normalise alef → replace Arabic punctuation with space → split → filter empty.
 */
export function tokenize(text: string): string[] {
  let t = removeTashkeel(text);
  t = normalizeAlef(t);
  // Replace Arabic punctuation (،؟!) and standard punctuation with whitespace
  t = t.replace(/[،؟!]/g, ' ');
  return t.split(/\s+/).filter((tok) => tok.length > 0);
}

/**
 * Sanitise arbitrary input to safe Arabic text.
 * - Strips HTML tags
 * - Keeps Arabic Unicode block (U+0600–U+06FF), whitespace, ASCII digits, and . , ! ?
 * - Trims and truncates to maxLength (default 5000)
 */
export function sanitizeArabic(text: string, maxLength = 5000): string {
  // Strip HTML
  let t = text.replace(/<[^>]*>/g, '');
  // Keep only Arabic chars, whitespace, digits, basic punctuation
  t = t.replace(/[^؀-ۿ\s\d.,!?]/g, '');
  t = t.trim();
  return t.slice(0, maxLength);
}

/**
 * Common Arabic stop words.
 */
export const ARABIC_STOP_WORDS: Set<string> = new Set([
  'و',
  'في',
  'من',
  'على',
  'إلى',
  'عن',
  'مع',
  'هذا',
  'هذه',
  'ذلك',
  'التي',
  'الذي',
  'هو',
  'هي',
  'هم',
  'قد',
  'كان',
  'يكون',
  'أن',
  'إن',
]);

/**
 * Filter stop words out of a token array.
 */
export function removeStopWords(words: string[]): string[] {
  return words.filter((w) => !ARABIC_STOP_WORDS.has(w));
}

/**
 * Returns true if the text appears to end a sentence (ends with . ? ! ؟ or is longer than 150 chars).
 */
export function detectSentenceEnd(text: string): boolean {
  const trimmed = text.trimEnd();
  if (trimmed.length > 150) return true;
  return /[.?!؟]$/.test(trimmed);
}
