import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createParallelToggleState } from '../parallel-toggle';
import type { CardParallel } from '../../types';

/**
 * Feature: parallel-tracking, Property 2: Parallel toggle state transition
 * Validates: Requirements 3.2, 3.3
 */

// --- Arbitraries ---

const isoDateArbitrary = fc.integer({ min: 1704067200000, max: 1830297600000 }).map(
  ts => new Date(ts).toISOString().split('T')[0]
);

const isoTimestampArbitrary = fc.integer({ min: 1704067200000, max: 1830297600000 }).map(
  ts => new Date(ts).toISOString()
);

const parallelNameArbitrary = fc.oneof(
  fc.constant('Base'),
  fc.constant('Blue Voltage'),
  fc.constant('Gold /50'),
  fc.constant('FoilFractor 1/1'),
  fc.constant('Aqua Sparkle /499'),
  fc.constant('Black & White /75'),
  fc.string({ minLength: 1, maxLength: 30 })
);

const cardParallelArbitrary: fc.Arbitrary<CardParallel> = fc.record({
  id: fc.uuid(),
  card_id: fc.uuid(),
  parallel_name: parallelNameArbitrary,
  collected: fc.boolean(),
  date_collected: fc.option(isoDateArbitrary, { nil: null }),
  created_at: isoTimestampArbitrary,
});

// --- Helpers ---

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// --- Property Tests ---

describe('Feature: parallel-tracking, Property 2: Parallel toggle state transition', () => {
  it('toggling always flips collected to its boolean inverse', () => {
    fc.assert(
      fc.property(cardParallelArbitrary, (parallel) => {
        const result = createParallelToggleState(parallel);
        expect(result.collected).toBe(!parallel.collected);
      }),
      { numRuns: 100 }
    );
  });

  it('toggling uncollected parallel sets date_collected to today (YYYY-MM-DD)', () => {
    fc.assert(
      fc.property(
        cardParallelArbitrary.filter(p => !p.collected),
        (parallel) => {
          const result = createParallelToggleState(parallel);
          const today = getTodayISO();
          expect(result.date_collected).toBe(today);
          // Verify YYYY-MM-DD format
          expect(result.date_collected).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('toggling collected parallel sets date_collected to null', () => {
    fc.assert(
      fc.property(
        cardParallelArbitrary.filter(p => p.collected),
        (parallel) => {
          const result = createParallelToggleState(parallel);
          expect(result.date_collected).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('double-toggle returns to collected=false and date_collected=null', () => {
    fc.assert(
      fc.property(cardParallelArbitrary, (parallel) => {
        // Start with an uncollected parallel
        const uncollectedParallel: CardParallel = {
          ...parallel,
          collected: false,
          date_collected: null,
        };

        // First toggle: should become collected with today's date
        const firstToggle = createParallelToggleState(uncollectedParallel);
        const today = getTodayISO();
        expect(firstToggle.collected).toBe(true);
        expect(firstToggle.date_collected).toBe(today);

        // Apply first toggle state to create a new parallel
        const collectedParallel: CardParallel = {
          ...uncollectedParallel,
          collected: firstToggle.collected,
          date_collected: firstToggle.date_collected,
        };

        // Second toggle: should return to uncollected with null date
        const secondToggle = createParallelToggleState(collectedParallel);
        expect(secondToggle.collected).toBe(false);
        expect(secondToggle.date_collected).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
