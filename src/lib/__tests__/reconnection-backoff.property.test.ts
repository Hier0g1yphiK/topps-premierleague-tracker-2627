import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateBackoffDelay } from '../reconnection';

/**
 * Feature: premier-league-tracker, Property 8: Reconnection backoff timing
 * Validates: Requirements 5.3
 */

// --- Arbitraries ---

const attemptArbitrary = fc.integer({ min: 0, max: 4 });

// --- Property Tests ---

describe('Feature: premier-league-tracker, Property 8: Reconnection backoff timing', () => {
  it('delay equals 1000 * 2^n milliseconds for each attempt', () => {
    fc.assert(
      fc.property(attemptArbitrary, (attempt) => {
        const delay = calculateBackoffDelay(attempt);
        const expected = 1000 * Math.pow(2, attempt);
        expect(delay).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('exhaustively verifies all 5 backoff values', () => {
    const expectedDelays: Record<number, number> = {
      0: 1000,
      1: 2000,
      2: 4000,
      3: 8000,
      4: 16000,
    };

    for (const [attempt, expectedDelay] of Object.entries(expectedDelays)) {
      const delay = calculateBackoffDelay(Number(attempt));
      expect(delay).toBe(expectedDelay);
    }
  });
});
