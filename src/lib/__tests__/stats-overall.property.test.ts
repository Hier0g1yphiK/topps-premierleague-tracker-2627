import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeOverallStats } from '../stats';
import type { Card } from '../../types';

/**
 * Feature: premier-league-tracker, Property 9: Overall stats computation
 * Validates: Requirements 6.1, 6.2, 6.5
 */

// --- Arbitraries ---

const isoDateArbitrary = fc.integer({ min: 1704067200000, max: 1830297600000 }).map(
  ts => new Date(ts).toISOString().split('T')[0]
);

const isoTimestampArbitrary = fc.integer({ min: 1704067200000, max: 1830297600000 }).map(
  ts => new Date(ts).toISOString()
);

const cardArbitrary: fc.Arbitrary<Card> = fc.record({
  id: fc.uuid(),
  user_id: fc.option(fc.uuid(), { nil: null }),
  card_number: fc.integer({ min: 1, max: 2000 }),
  set_name: fc.string({ minLength: 1, maxLength: 30 }),
  set_card_number: fc.string({ minLength: 1, maxLength: 10 }),
  player: fc.string({ minLength: 1, maxLength: 40 }),
  team: fc.string({ minLength: 1, maxLength: 30 }),
  notes: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  collected: fc.boolean(),
  date_collected: fc.option(isoDateArbitrary, { nil: null }),
  created_at: isoTimestampArbitrary,
});

// --- Property Tests ---

describe('Feature: premier-league-tracker, Property 9: Overall stats computation', () => {
  it('collected count equals the number of cards where collected===true', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 1, maxLength: 50 }),
        (cards) => {
          const result = computeOverallStats(cards);
          const expectedCollected = cards.filter(c => c.collected === true).length;
          expect(result.collected).toBe(expectedCollected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total count equals the input array length', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 1, maxLength: 50 }),
        (cards) => {
          const result = computeOverallStats(cards);
          expect(result.total).toBe(cards.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('percentage equals (collected/total*100) rounded to 1 decimal place', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 1, maxLength: 50 }),
        (cards) => {
          const result = computeOverallStats(cards);
          const collected = cards.filter(c => c.collected === true).length;
          const total = cards.length;
          const expectedPercentage = ((collected / total) * 100).toFixed(1) + '%';
          expect(result.percentage).toBe(expectedPercentage);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty array produces { collected: 0, total: 0, percentage: "0.0%" }', () => {
    const result = computeOverallStats([]);
    expect(result.collected).toBe(0);
    expect(result.total).toBe(0);
    expect(result.percentage).toBe('0.0%');
  });
});
