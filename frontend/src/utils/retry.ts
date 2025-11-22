import { isRetryableError, getRetryDelay } from './errorMessages';

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: (error: any, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'onRetry'>>, error?: any): number {
  // Check if error has a specific retry delay (e.g., from Retry-After header)
  if (error) {
    const errorDelay = getRetryDelay(error);
    if (errorDelay > 0) {
      return Math.min(errorDelay, options.maxDelayMs);
    }
  }
  
  // Use exponential backoff
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
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === opts.maxAttempts) {
        if (process.env.NODE_ENV === 'development') {
          console.error('All retry attempts exhausted', {
            attempts: attempt,
            error: error.message,
          });
        }
        throw error;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Non-retryable error encountered', {
            error: error.message,
            status: error.response?.status,
          });
        }
        throw error;
      }

      // Calculate delay and wait
      const delayMs = calculateDelay(attempt, opts, error);
      
      if (process.env.NODE_ENV === 'development') {
        console.info('Retrying operation', {
          attempt,
          maxAttempts: opts.maxAttempts,
          delayMs,
          error: error.message,
        });
      }

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(error, attempt);
      }

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
