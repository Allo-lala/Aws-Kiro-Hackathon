import logger from '../config/logger';

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
  onRetry: () => {},
};

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  // Check error code
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  // Check HTTP status codes (5xx server errors)
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  // Check for specific error types
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.delayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, options.maxDelayMs);
}

/**
 * Retries an async operation with exponential backoff
 * 
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to the operation result
 * @throws The last error if all retry attempts fail
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === opts.maxAttempts) {
        logger.error('All retry attempts exhausted', {
          attempts: attempt,
          error: error.message,
        });
        throw error;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        logger.warn('Non-retryable error encountered', {
          error: error.message,
          code: error.code,
        });
        throw error;
      }

      // Calculate delay and wait
      const delayMs = calculateDelay(attempt, opts);
      
      logger.info('Retrying operation', {
        attempt,
        maxAttempts: opts.maxAttempts,
        delayMs,
        error: error.message,
      });

      // Call onRetry callback if provided
      opts.onRetry(error, attempt);

      await delay(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Wraps a function to automatically retry on failure
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}
