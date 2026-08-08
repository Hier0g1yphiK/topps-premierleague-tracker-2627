import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sortCards, DEFAULT_SORT_CONFIG } from '../sort';
import type { Card, SortColumn, SortConfig } from '../../types';

/**
 * Feature: premier-league-tracker, Property 2: Sort correctness
 * Validates: Requirements 2.2, 2.3, 2.4
 */

// --- Arbitraries ---

// Use integer-based date generation to avoid Invalid Date issues
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

const sortColumnArbitrary: fc.Arbitrary<SortColumn> = fc.constantFrom(
  'card_number', 'set_name', 'set_card_number', 'player', 'team', 'collected'
);

const sortConfigArbitrary: fc.Arbitrary<SortConfig> = fc.record({
  column: sortColumnArbitrary,
  direction: fc.constantFrom('asc' as const, 'desc' as const),
});

// --- Helpers ---

function getCompareValue(card: Card, column: SortColumn): string | number | boolean {
  return card[column];
}

function adjacentPairsSatisfyOrdering(sorted: Card[], config: SortConfig): boolean {
  const { column, direction } = config;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];

    let comparison: number;

    switch (column) {
      case 'card_number':
        comparison = a.card_number - b.card_number;
        break;
      case 'set_name':
      case 'set_card_number':
      case 'player':
      case 'team':
        comparison = a[column].localeCompare(b[column]);
        break;
      case 'collected':
        comparison = Number(a.collected) - Number(b.collected);
        break;
    }

    if (direction === 'asc' && comparison > 0) return false;
    if (direction === 'desc' && comparison < 0) return false;
  }

  return true;
}

// --- Property Tests ---

describe('Feature: premier-league-tracker, Property 2: Sort correctness', () => {
  it('every adjacent pair satisfies ordering constraint for any sort config', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 0, maxLength: 50 }),
        sortConfigArbitrary,
        (cards, config) => {
          const sorted = sortCards(cards, config);

          // Same length
          expect(sorted).toHaveLength(cards.length);

          // Adjacent pair ordering
          expect(adjacentPairsSatisfyOrdering(sorted, config)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('default sort produces card_number ascending ordering', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 0, maxLength: 50 }),
        (cards) => {
          const sorted = sortCards(cards);

          // Same length
          expect(sorted).toHaveLength(cards.length);

          // Verify card_number ascending
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].card_number).toBeLessThanOrEqual(sorted[i + 1].card_number);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorted array has the same length as input', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 0, maxLength: 50 }),
        sortConfigArbitrary,
        (cards, config) => {
          const sorted = sortCards(cards, config);
          expect(sorted).toHaveLength(cards.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ascending string columns satisfy a.localeCompare(b) <= 0', () => {
    const stringColumns: SortColumn[] = ['set_name', 'set_card_number', 'player', 'team'];

    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 2, maxLength: 50 }),
        fc.constantFrom(...stringColumns),
        (cards, column) => {
          const config: SortConfig = { column, direction: 'asc' };
          const sorted = sortCards(cards, config);

          for (let i = 0; i < sorted.length - 1; i++) {
            const cmp = sorted[i][column].toString().localeCompare(sorted[i + 1][column].toString());
            expect(cmp).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ascending collected column satisfies Number(a) <= Number(b)', () => {
    fc.assert(
      fc.property(
        fc.array(cardArbitrary, { minLength: 2, maxLength: 50 }),
        (cards) => {
          const config: SortConfig = { column: 'collected', direction: 'asc' };
          const sorted = sortCards(cards, config);

          for (let i = 0; i < sorted.length - 1; i++) {
            expect(Number(sorted[i].collected)).toBeLessThanOrEqual(Number(sorted[i + 1].collected));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
