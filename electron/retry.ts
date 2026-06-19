import { getLogger } from './logger';

const MAX_RETRIES = 5;
const INITIAL_DELAY = 100;
const MAX_DELAY = 10000;

export class RetryableError extends Error {
  constructor(message: string, public recoverable = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number): number {
  const delay = INITIAL_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, MAX_DELAY);
}

export async function withRetry<T>(
  fn: () => T | Promise<T>,
  context: string,
  options?: { maxRetries?: number; retryIf?: (error: any) => boolean }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const retryIf = options?.retryIf ?? ((err: any) => {
    if (err instanceof RetryableError) return err.recoverable;
    if (err?.code === 'SQLITE_BUSY' || err?.code === 'SQLITE_LOCKED') return true;
    if (err?.message?.includes('database') || err?.message?.includes('locked')) return true;
    return false;
  });

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!retryIf(err) || attempt >= maxRetries) {
        getLogger().error('Retry', `[${context}] Failed after ${attempt}/${maxRetries} attempts`, {
          error: err?.message || String(err),
          code: err?.code,
        });
        throw err;
      }

      const delay = calculateDelay(attempt);
      getLogger().warn('Retry', `[${context}] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms`, {
        error: err?.message,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

export async function withDbRetry<T>(
  fn: () => T,
  context: string
): Promise<T> {
  return withRetry(fn, context, {
    maxRetries: 3,
    retryIf: (err) => {
      if (err?.code === 'SQLITE_BUSY' || err?.code === 'SQLITE_LOCKED') return true;
      if (err?.message?.includes('database is locked')) return true;
      return false;
    },
  });
}
