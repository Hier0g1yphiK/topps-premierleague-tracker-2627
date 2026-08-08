/**
 * Exponential backoff reconnection logic for Supabase Realtime subscriptions.
 *
 * Implements retry with delays: 1s, 2s, 4s, 8s, 16s (1000 * 2^n ms, n = 0..4)
 * Max 5 retry attempts before giving up.
 */

export interface ReconnectionCallbacks {
  onReconnecting: (attempt: number) => void;
  onReconnected: () => void;
  onFailed: () => void;
}

export interface ReconnectionManager {
  /** Start the reconnection process. Resets attempt counter and begins retrying. */
  start: () => void;
  /** Manual retry - resets attempt counter and starts reconnection from scratch. */
  retry: () => void;
  /** Stop any pending reconnection attempts. */
  stop: () => void;
  /** Get the current retry attempt count (0-indexed). */
  getAttemptCount: () => number;
}

const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000;
const BACKOFF_MULTIPLIER = 2;

/**
 * Calculates the backoff delay for a given attempt number (0-indexed).
 * Returns 1000 * 2^attempt milliseconds.
 */
export function calculateBackoffDelay(attempt: number): number {
  return INITIAL_BACKOFF * Math.pow(BACKOFF_MULTIPLIER, attempt);
}

/**
 * Creates a ReconnectionManager that handles exponential backoff reconnection.
 *
 * @param reconnectFn - Async function that performs the actual reconnection.
 *                      Should resolve to true on success, false on failure.
 * @param callbacks - Callbacks for reconnection lifecycle events.
 */
export function createReconnectionManager(
  reconnectFn: () => Promise<boolean>,
  callbacks: ReconnectionCallbacks
): ReconnectionManager {
  let attemptCount = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function stop() {
    stopped = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  async function attemptReconnection() {
    if (stopped) return;

    if (attemptCount >= MAX_RETRIES) {
      callbacks.onFailed();
      return;
    }

    callbacks.onReconnecting(attemptCount);

    const delay = calculateBackoffDelay(attemptCount);
    attemptCount++;

    timeoutId = setTimeout(async () => {
      if (stopped) return;

      try {
        const success = await reconnectFn();
        if (stopped) return;

        if (success) {
          callbacks.onReconnected();
        } else {
          attemptReconnection();
        }
      } catch {
        if (!stopped) {
          attemptReconnection();
        }
      }
    }, delay);
  }

  function start() {
    stopped = false;
    attemptCount = 0;
    attemptReconnection();
  }

  function retry() {
    stop();
    start();
  }

  function getAttemptCount() {
    return attemptCount;
  }

  return { start, retry, stop, getAttemptCount };
}
