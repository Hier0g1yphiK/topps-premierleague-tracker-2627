import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterByParallelStatus } from '../parallel-filters';
import type { Card, CardParallel } from '../../types';

/**
 * Feature: parallel-tracking, Property 13: Has uncollected parallels
 * Feature: parallel-tracking, Property 14: All parallels collected
 *
 * Validates: Requirements 10.3, 10.4
 */

// --- Arbitraries ---

const cardArb: fc.Arbitrary<Card> = fc.record({
  id: fc.uuid(),
  user_id: fc.constant(null),
  card_number: fc.integer({ min: 1, max: 2000 }),
  set_name: fc.string({ minLength: 1, maxLength: 30 }),
  set_card_number: fc.string({ minLength: 1, maxLength: 10 }),
  player: fc.string({ minLength: 1, maxLength: 40 }),
  team: fc.string({ minLength: 1, maxLength: 30 }),
  notes: fc.constant(null),
  collected: fc.boolean(),
  date_collected: fc.constant(null),
  created_at: fc.constant('2025-01-01T00:00:00Z'),
});

const parallelNameArb = fc.constantFrom(
  'Base',
  'Blue Voltage',
  'Gold /50',
  'FoilFractor 1/1',
  'Aqua Sparkle /499',
  'Black & White /75',
  'Silver',
  'Purple /25',
  'Red /10',
  'Green /99'
);

function cardParallelArb(cardId: string): fc.Arbitrary<CardParallel> {
  return fc.record({
    id: fc.uuid(),
    card_id: fc.constant(cardId),
    parallel_name: parallelNameArb,
    collected: fc.boolean(),
    date_collected: fc.constant(null),
    created_at: fc.constant('2025-01-01T00:00:00Z'),
  });
}

/**
 * Generates a list of cards, each with 0–5 associated CardParallels.
 * Returns [cards, parallelsMap] where parallelsMap is Map<cardId, CardParallel[]>.
 */
const cardsWithParallelsArb: fc.Arbitrary<[Card[], Map<string, CardParallel[]>]> = fc
  .array(cardArb, { minLength: 0, maxLength: 30 })
  .chain((cards) => {
    // For each card, generate 0–5 parallels (0 means no entry in map)
    const parallelArbs = cards.map((card) =>
      fc.array(cardParallelArb(card.id), { minLength: 0, maxLength: 5 })
    );

    return fc.tuple(...parallelArbs).map((parallelArrays) => {
      const parallelsMap = new Map<string, CardParallel[]>();
      for (let i = 0; i < cards.length; i++) {
        if (parallelArrays[i].length > 0) {
          parallelsMap.set(cards[i].id, parallelArrays[i]);
        }
      }
      return [cards, parallelsMap] as [Card[], Map<string, CardParallel[]>];
    });
  });

// --- Property Tests ---

describe('Feature: parallel-tracking, Property 13: Has uncollected parallels', () => {
  /**
   * **Validates: Requirements 10.3**
   *
   * For any set of Cards with associated CardParallels, when the "has_uncollected"
   * parallel filter is active, every card in the result SHALL have at least one
   * CardParallel with collected === false, and every card excluded from the result
   * SHALL have all CardParallels with collected === true.
   */
  it('every result card has at least one uncollected parallel or no parallels in the map', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallelsMap]) => {
        const result = filterByParallelStatus(cards, parallelsMap, 'has_uncollected');
        const resultIds = new Set(result.map((c) => c.id));

        for (const card of result) {
          const parallels = parallelsMap.get(card.id);
          if (parallels && parallels.length > 0) {
            // Card has parallels: at least one must be uncollected
            const hasUncollected = parallels.some((p) => p.collected === false);
            expect(hasUncollected).toBe(true);
          }
          // Cards with no parallels in the map are included (nothing collected yet)
        }
      }),
      { numRuns: 100 }
    );
  });

  it('every excluded card has all parallels collected (not empty)', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallelsMap]) => {
        const result = filterByParallelStatus(cards, parallelsMap, 'has_uncollected');
        const resultIds = new Set(result.map((c) => c.id));

        for (const card of cards) {
          if (!resultIds.has(card.id)) {
            const parallels = parallelsMap.get(card.id);
            // Excluded cards must have parallels and all must be collected
            expect(parallels).toBeDefined();
            expect(parallels!.length).toBeGreaterThan(0);
            const allCollected = parallels!.every((p) => p.collected === true);
            expect(allCollected).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('cards with no parallels in the map are included', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallelsMap]) => {
        const result = filterByParallelStatus(cards, parallelsMap, 'has_uncollected');
        const resultIds = new Set(result.map((c) => c.id));

        for (const card of cards) {
          const parallels = parallelsMap.get(card.id);
          if (!parallels || parallels.length === 0) {
            expect(resultIds.has(card.id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: parallel-tracking, Property 14: All parallels collected', () => {
  /**
   * **Validates: Requirements 10.4**
   *
   * For any set of Cards with associated CardParallels, when the "all_collected"
   * parallel filter is active, every card in the result SHALL have all CardParallels
   * with collected === true, and every card excluded from the result SHALL have at
   * least one CardParallel with collected === false.
   */
  it('every result card has all parallels collected', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallelsMap]) => {
        const result = filterByParallelStatus(cards, parallelsMap, 'all_collected');

        for (const card of result) {
          const parallels = parallelsMap.get(card.id);
          // Result cards must have parallels and all must be collected
          expect(parallels).toBeDefined();
          expect(parallels!.length).toBeGreaterThan(0);
          const allCollected = parallels!.every((p) => p.collected === true);
          expect(allCollected).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('every excluded card has at least one uncollected parallel or no parallels', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallelsMap]) => {
        const result = filterByParallelStatus(cards, parallelsMap, 'all_collected');
        const resultIds = new Set(result.map((c) => c.id));

        for (const card of cards) {
          if (!resultIds.has(card.id)) {
            const parallels = parallelsMap.get(card.id);
            if (parallels && parallels.length > 0) {
              // Has parallels: at least one must be uncollected
              const hasUncollected = parallels.some((p) => p.collected === false);
              expect(hasUncollected).toBe(true);
            }
            // Cards with no parallels are excluded (nothing to be "all collected")
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('cards with no parallels in the map are excluded', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallelsMap]) => {
        const result = filterByParallelStatus(cards, parallelsMap, 'all_collected');
        const resultIds = new Set(result.map((c) => c.id));

        for (const card of cards) {
          const parallels = parallelsMap.get(card.id);
          if (!parallels || parallels.length === 0) {
            expect(resultIds.has(card.id)).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
