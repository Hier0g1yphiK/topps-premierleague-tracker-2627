import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeParallelStats, computePerSetParallelBreakdown } from '../stats';
import type { Card, CardParallel } from '../../types';

/**
 * Feature: parallel-tracking, Property 4: Overall parallel statistics aggregation
 * Feature: parallel-tracking, Property 5: Per-set parallel statistics
 *
 * Validates: Requirements 5.1, 5.2, 5.4
 */

// --- Arbitraries ---

const cardArb: fc.Arbitrary<Card> = fc.record({
  id: fc.uuid(),
  user_id: fc.constant(null),
  card_number: fc.integer({ min: 1, max: 2000 }),
  set_name: fc.constantFrom(
    'Base Set',
    'Blue Voltage',
    'Gold Collection',
    'Silver Stars',
    'Premier Icons'
  ),
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
 * Generates an array of CardParallel records with arbitrary card_ids.
 */
const parallelsArb: fc.Arbitrary<CardParallel[]> = fc
  .array(fc.uuid(), { minLength: 0, maxLength: 10 })
  .chain((cardIds) => {
    const parallelArbs = cardIds.map((cardId) =>
      fc.array(cardParallelArb(cardId), { minLength: 1, maxLength: 5 })
    );
    return fc.tuple(...parallelArbs).map((arrays) => arrays.flat());
  });

/**
 * Generates a list of cards with associated parallels, ensuring all parallels
 * reference a valid card_id in the cards array.
 */
const cardsWithParallelsArb: fc.Arbitrary<[Card[], CardParallel[]]> = fc
  .array(cardArb, { minLength: 1, maxLength: 20 })
  .chain((cards) => {
    // For each card, generate 1–5 parallels
    const parallelArbs = cards.map((card) =>
      fc.array(cardParallelArb(card.id), { minLength: 1, maxLength: 5 })
    );

    return fc.tuple(...parallelArbs).map((parallelArrays) => {
      const allParallels = parallelArrays.flat();
      return [cards, allParallels] as [Card[], CardParallel[]];
    });
  });

// --- Property Tests ---

describe('Feature: parallel-tracking, Property 4: Overall parallel statistics aggregation', () => {
  /**
   * **Validates: Requirements 5.1**
   *
   * For any array of CardParallel records, the computed parallel stats SHALL report
   * totalCollected equal to the count of records where collected === true,
   * totalAvailable equal to the array length, and percentage equal to
   * (totalCollected / totalAvailable * 100).toFixed(1) + '%' (or "0.0%" for empty arrays).
   */
  it('totalCollected equals count of collected parallels', () => {
    fc.assert(
      fc.property(parallelsArb, (parallels) => {
        const stats = computeParallelStats(parallels);
        const expectedCollected = parallels.filter((p) => p.collected === true).length;
        expect(stats.totalCollected).toBe(expectedCollected);
      }),
      { numRuns: 100 }
    );
  });

  it('totalAvailable equals array length', () => {
    fc.assert(
      fc.property(parallelsArb, (parallels) => {
        const stats = computeParallelStats(parallels);
        expect(stats.totalAvailable).toBe(parallels.length);
      }),
      { numRuns: 100 }
    );
  });

  it('percentage is correctly computed', () => {
    fc.assert(
      fc.property(parallelsArb, (parallels) => {
        const stats = computeParallelStats(parallels);
        if (parallels.length === 0) {
          expect(stats.percentage).toBe('0.0%');
        } else {
          const expectedCollected = parallels.filter((p) => p.collected === true).length;
          const expectedPercentage =
            ((expectedCollected / parallels.length) * 100).toFixed(1) + '%';
          expect(stats.percentage).toBe(expectedPercentage);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('returns 0.0% for empty arrays', () => {
    const stats = computeParallelStats([]);
    expect(stats.totalCollected).toBe(0);
    expect(stats.totalAvailable).toBe(0);
    expect(stats.percentage).toBe('0.0%');
  });
});

describe('Feature: parallel-tracking, Property 5: Per-set parallel statistics', () => {
  /**
   * **Validates: Requirements 5.2, 5.4**
   *
   * For any collection of Cards and CardParallels, grouping parallels by their card's
   * set_name SHALL produce per-set counts where each set's parallelsCollected equals the
   * count of collected parallels within that set, and parallelsTotal equals the total
   * parallels within that set.
   */
  it('per-set parallelsCollected equals count of collected parallels in that set', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallels]) => {
        const breakdown = computePerSetParallelBreakdown(cards, parallels);

        // Build expected: group parallels by set via card lookup
        const cardToSet = new Map<string, string>();
        for (const card of cards) {
          cardToSet.set(card.id, card.set_name);
        }

        for (const entry of breakdown) {
          const setParallels = parallels.filter(
            (p) => cardToSet.get(p.card_id) === entry.setName
          );
          const expectedCollected = setParallels.filter((p) => p.collected === true).length;
          expect(entry.parallelsCollected).toBe(expectedCollected);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('per-set parallelsTotal equals total parallels in that set', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallels]) => {
        const breakdown = computePerSetParallelBreakdown(cards, parallels);

        // Build expected: group parallels by set via card lookup
        const cardToSet = new Map<string, string>();
        for (const card of cards) {
          cardToSet.set(card.id, card.set_name);
        }

        for (const entry of breakdown) {
          const setParallels = parallels.filter(
            (p) => cardToSet.get(p.card_id) === entry.setName
          );
          expect(entry.parallelsTotal).toBe(setParallels.length);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all sets with parallels are represented in the breakdown', () => {
    fc.assert(
      fc.property(cardsWithParallelsArb, ([cards, parallels]) => {
        const breakdown = computePerSetParallelBreakdown(cards, parallels);

        // Find expected set names
        const cardToSet = new Map<string, string>();
        for (const card of cards) {
          cardToSet.set(card.id, card.set_name);
        }
        const expectedSets = new Set<string>();
        for (const parallel of parallels) {
          const setName = cardToSet.get(parallel.card_id);
          if (setName !== undefined) {
            expectedSets.add(setName);
          }
        }

        const breakdownSets = new Set(breakdown.map((b) => b.setName));
        expect(breakdownSets).toEqual(expectedSets);
      }),
      { numRuns: 100 }
    );
  });

  it('returns empty array when no parallels provided', () => {
    const cards: Card[] = [
      {
        id: '123',
        user_id: null,
        card_number: 1,
        set_name: 'Base Set',
        set_card_number: '1',
        player: 'Player',
        team: 'Team',
        notes: null,
        collected: false,
        date_collected: null,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];
    const breakdown = computePerSetParallelBreakdown(cards, []);
    expect(breakdown).toEqual([]);
  });
});
