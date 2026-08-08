import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateBackoffDelay, createReconnectionManager } from './reconnection';

describe('calculateBackoffDelay', () => {
  it('returns 1000ms for attempt 0', () => {
    expect(calculateBackoffDelay(0)).toBe(1000);
  });

  it('returns 2000ms for attempt 1', () => {
    expect(calculateBackoffDelay(1)).toBe(2000);
  });

  it('returns 4000ms for attempt 2', () => {
    expect(calculateBackoffDelay(2)).toBe(4000);
  });

  it('returns 8000ms for attempt 3', () => {
    expect(calculateBackoffDelay(3)).toBe(8000);
  });

  it('returns 16000ms for attempt 4', () => {
    expect(calculateBackoffDelay(4)).toBe(16000);
  });
});

describe('createReconnectionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onReconnecting with attempt number on start', async () => {
    const reconnectFn = vi.fn().mockResolvedValue(true);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    manager.start();

    expect(callbacks.onReconnecting).toHaveBeenCalledWith(0);
  });

  it('waits the correct delay before calling reconnectFn on first attempt', async () => {
    const reconnectFn = vi.fn().mockResolvedValue(true);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    manager.start();

    // Should not call immediately
    expect(reconnectFn).not.toHaveBeenCalled();

    // After 1000ms (first attempt delay)
    await vi.advanceTimersByTimeAsync(1000);

    expect(reconnectFn).toHaveBeenCalledTimes(1);
  });

  it('calls onReconnected when reconnectFn succeeds', async () => {
    const reconnectFn = vi.fn().mockResolvedValue(true);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    manager.start();

    await vi.advanceTimersByTimeAsync(1000);

    expect(callbacks.onReconnected).toHaveBeenCalledTimes(1);
    expect(callbacks.onFailed).not.toHaveBeenCalled();
  });

  it('retries with increasing delays on failure', async () => {
    const reconnectFn = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    manager.start();

    // First attempt: 1000ms delay
    expect(callbacks.onReconnecting).toHaveBeenCalledWith(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(reconnectFn).toHaveBeenCalledTimes(1);

    // Second attempt: 2000ms delay
    expect(callbacks.onReconnecting).toHaveBeenCalledWith(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(reconnectFn).toHaveBeenCalledTimes(2);

    // Third attempt: 4000ms delay
    expect(callbacks.onReconnecting).toHaveBeenCalledWith(2);
    await vi.advanceTimersByTimeAsync(4000);
    expect(reconnectFn).toHaveBeenCalledTimes(3);

    expect(callbacks.onReconnected).toHaveBeenCalledTimes(1);
  });

  it('calls onFailed after 5 failed attempts', async () => {
    const reconnectFn = vi.fn().mockResolvedValue(false);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    manager.start();

    // Attempt 0: 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Attempt 1: 2000ms
    await vi.advanceTimersByTimeAsync(2000);
    // Attempt 2: 4000ms
    await vi.advanceTimersByTimeAsync(4000);
    // Attempt 3: 8000ms
    await vi.advanceTimersByTimeAsync(8000);
    // Attempt 4: 16000ms
    await vi.advanceTimersByTimeAsync(16000);

    expect(reconnectFn).toHaveBeenCalledTimes(5);
    expect(callbacks.onFailed).toHaveBeenCalledTimes(1);
    expect(callbacks.onReconnected).not.toHaveBeenCalled();
  });

  it('stops pending attempts when stop() is called', async () => {
    const reconnectFn = vi.fn().mockResolvedValue(false);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    manager.start();

    // Stop before the timeout fires
    manager.stop();
    await vi.advanceTimersByTimeAsync(1000);

    expect(reconnectFn).not.toHaveBeenCalled();
  });

  it('retry() resets attempt count and starts fresh', async () => {
    const reconnectFn = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    manager.start();

    // Let first attempt fail (triggers next attempt scheduling)
    await vi.advanceTimersByTimeAsync(1000);
    expect(reconnectFn).toHaveBeenCalledTimes(1);

    // Retry resets the counter
    manager.retry();
    expect(manager.getAttemptCount()).toBe(1); // start() calls attemptReconnection which increments

    // Now advance to the new first attempt delay (1000ms)
    await vi.advanceTimersByTimeAsync(1000);
    expect(callbacks.onReconnected).toHaveBeenCalled();
  });

  it('handles exceptions from reconnectFn by retrying', async () => {
    const reconnectFn = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(true);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    manager.start();

    // First attempt fails with exception
    await vi.advanceTimersByTimeAsync(1000);
    expect(reconnectFn).toHaveBeenCalledTimes(1);

    // Second attempt succeeds
    await vi.advanceTimersByTimeAsync(2000);
    expect(reconnectFn).toHaveBeenCalledTimes(2);
    expect(callbacks.onReconnected).toHaveBeenCalledTimes(1);
  });

  it('getAttemptCount returns the current attempt count', () => {
    const reconnectFn = vi.fn().mockResolvedValue(true);
    const callbacks = {
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onFailed: vi.fn(),
    };

    const manager = createReconnectionManager(reconnectFn, callbacks);
    expect(manager.getAttemptCount()).toBe(0);

    manager.start();
    // After start, attempt count is incremented to 1 (first attempt scheduled)
    expect(manager.getAttemptCount()).toBe(1);
  });
});
