/**
 * Retry a promise-returning function with exponential back-off + jitter.
 *
 * @param fn           The async operation to attempt.
 * @param maxAttempts  Maximum number of attempts (default 3).
 * @param baseDelayMs  Base delay in milliseconds (default 1000).
 *
 * Delay formula: baseDelayMs * 2^(attempt - 1) + random [0, 100) ms jitter.
 *
 * If the thrown error has `isOperational === true` (an AppError), it is
 * rethrown immediately without further retries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      // Do not retry operational/expected errors (e.g. AppError)
      if (
        err !== null &&
        typeof err === 'object' &&
        (err as Record<string, unknown>)['isOperational'] === true
      ) {
        throw err;
      }

      if (attempt === maxAttempts) {
        break;
      }

      const delay =
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
