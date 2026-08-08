import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computePerSetBreakdown } from '../stats';
import type { Card } from '../../types';

/**
 * Feature: premier-league-tracker, Property 10: Per-set breakdown
 * Validates: Requirements 6.3
 */

// --- Arbitraries ---

const isoDateArbitrary = fc.integer({ min: 1704067200000, max: 1830297600000 }).map(
  ts => new Date(ts).toISOString().split('T')[0]
);

const isoTimestampArbitrary = fc.integer({ min: 1704067200000, max: 1830297600000 }).map(
  ts => new Date(ts).toISOString()
);

const setNameArbitrary = fc.constantFrom(
  'Base', 'Foil', 'Rare', 'Legendary', 'Rookie', 'Star Players', 'Team Captains', 'Golden Boot'
);

const cardArbitrary: fc.Arbitrary<Card> = fc.record({
  id: fc.uuid(),
  user_id: fc.option(fc.uuid(), { nil: null }),
  card_number: fc.integer({ min: 1, max: 2000 }),
  set_name: setNameArbitrary,
  set_card_number: fc.string({ minLength: 1, maxLength: 10 }),
  player: fc.string({ minLength: 1, maxLength: 40 }),
  team: fc.string({ minLength: 1, maxLength: 30 }),
  notes: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  collected: fc.boolean(),
  date_collected: fc.option(isoDateArbitrary, { nil: null }),
  created_at: isoTimestampArbitrary,
});

// --- Property Tests ---

describe('Feature: premier-league-tracker, Property 10: Per-set breakdown', () => {
  it('groups cards by set_name with correct collected and total counts', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 1, maxLength: 50 }),
        (cards) => {
          const result = computePerSetBreakdown(cards);

          // Build expected grouping from input
          const expectedGroups = new Map<string, { collected: number; total: number }>();
          for (const card of cards) {
            const group = expectedGroups.get(card.set_name) || { collected: 0, total: 0 };
            group.total++;
            if (card.collected === true) {
              group.collected++;
            }
            expectedGroups.set(card.set_name, group);
          }

          // Result should have exactly as many groups as distinct set_names
          expect(result).toHaveLength(expectedGroups.size);

          // Each group in result should match expected counts
          for (const entry of result) {
            const expected = expectedGroups.get(entry.setName);
            expect(expected).toBeDefined();
            expect(entry.collected).toBe(expected!.collected);
            expect(entry.total).toBe(expected!.total);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('collected count equals count of cards with that set_name where collected===true', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 1, maxLength: 50 }),
        (cards) => {
          const result = computePerSetBreakdown(cards);

          for (const entry of result) {
            const cardsInSet = cards.filter(c => c.set_name === entry.setName);
            const collectedCount = cardsInSet.filter(c => c.collected === true).length;
            expect(entry.collected).toBe(collectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total count equals the total number of cards with that set_name', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 1, maxLength: 50 }),
        (cards) => {
          const result = computePerSetBreakdown(cards);

          for (const entry of result) {
            const cardsInSet = cards.filter(c => c.set_name === entry.setName);
            expect(entry.total).toBe(cardsInSet.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('groups are ordered by minimum card_number within each set ascending', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 2, maxLength: 50 }),
        (cards) => {
          const result = computePerSetBreakdown(cards);

          if (result.length < 2) return;

          // Compute min card_number per set from input
          const minCardNumbers = new Map<string, number>();
          for (const card of cards) {
            const current = minCardNumbers.get(card.set_name);
            if (current === undefined || card.card_number < current) {
              minCardNumbers.set(card.set_name, card.card_number);
            }
          }

          // Verify ordering: each group's min card_number <= next group's min card_number
          for (let i = 0; i < result.length - 1; i++) {
            const currentMin = minCardNumbers.get(result[i].setName)!;
            const nextMin = minCardNumbers.get(result[i + 1].setName)!;
            expect(currentMin).toBeLessThanOrEqual(nextMin);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns empty array for empty input', () => {
    const result = computePerSetBreakdown([]);
    expect(result).toEqual([]);
  });
});
