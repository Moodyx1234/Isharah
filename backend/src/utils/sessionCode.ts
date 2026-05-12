import { randomInt } from 'crypto';
import { SESSION_CODE_CHARS, SESSION_CODE_LENGTH } from '@/config/constants';

/**
 * Generate a cryptographically unbiased session code of SESSION_CODE_LENGTH characters
 * drawn from SESSION_CODE_CHARS.
 */
export function generateSessionCode(): string {
  let code = '';
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    code += SESSION_CODE_CHARS[randomInt(0, SESSION_CODE_CHARS.length)];
  }
  return code;
}

/**
 * Validate that a code has the correct length and only contains allowed characters.
 */
export function isValidSessionCode(code: string): boolean {
  if (code.length !== SESSION_CODE_LENGTH) return false;
  const allowed = new Set(SESSION_CODE_CHARS);
  for (const char of code) {
    if (!allowed.has(char)) return false;
  }
  return true;
}
