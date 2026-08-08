import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { extractSetNames } from '../filters';
import type { Card } from '../../types';

/**
 * Property 5: Set Name Extraction
 *
 * For any array of cards, the extracted set name list contains exactly
 * the distinct set_name values present in the array, sorted in
 * case-insensitive alphabetical order, with no duplicates.
 *
 * **Validates: Requirements 3.2**
 */

// Safe date arbitraries using integer timestamps to avoid Invalid Date issues
const safeDateStringArb = fc
  .integer({ min: 1577836800000, max: 1924991999000 }) // 2020-01-01 to 2030-12-31
  .map((ts) => new Date(ts).toISOString().split('T')[0]);

const safeTimestampArb = fc
  .integer({ min: 1577836800000, max: 1924991999000 })
  .map((ts) => new Date(ts).toISOString());

// Arbitrary for generating a Card object with various set_name values
const cardArb: fc.Arbitrary<Card> = fc.record({
  id: fc.uuid(),
  user_id: fc.option(fc.uuid(), { nil: null }),
  card_number: fc.integer({ min: 1, max: 9999 }),
  set_name: fc.string({ minLength: 1, maxLength: 50 }),
  set_card_number: fc.string({ minLength: 1, maxLength: 10 }),
  player: fc.string({ minLength: 0, maxLength: 80 }),
  team: fc.string({ minLength: 0, maxLength: 80 }),
  notes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  collected: fc.boolean(),
  date_collected: fc.option(safeDateStringArb, { nil: null }),
  created_at: safeTimestampArb,
});

// Arbitrary for cards that reuse set names (introduces duplicates)
const cardWithSharedSetNamesArb: fc.Arbitrary<Card[]> = fc
  .array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 })
  .chain((setNames) =>
    fc.array(
      fc.tuple(cardArb, fc.nat({ max: setNames.length - 1 })).map(([card, idx]) => ({
        ...card,
        set_name: setNames[idx],
      })),
      { minLength: 1, maxLength: 30 }
    )
  );

describe('Feature: premier-league-tracker, Property 5: Set name extraction', () => {
  it('result contains exactly the distinct set_name values from input', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 30 }),
        (cards) => {
          const result = extractSetNames(cards);
          const expectedDistinct = new Set(cards.map((c) => c.set_name));

          // Result set matches the distinct set_name values
          const resultSet = new Set(result);
          expect(resultSet).toEqual(expectedDistinct);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result is sorted case-insensitively using localeCompare with sensitivity base', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 30 }),
        (cards) => {
          const result = extractSetNames(cards);

          // Every adjacent pair must be in non-decreasing order (case-insensitive)
          for (let i = 0; i < result.length - 1; i++) {
            const cmp = result[i].localeCompare(result[i + 1], undefined, {
              sensitivity: 'base',
            });
            expect(cmp).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result contains no duplicates', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 30 }),
        (cards) => {
          const result = extractSetNames(cards);
          const unique = new Set(result);
          expect(result.length).toBe(unique.size);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result has no duplicates even when input cards share set_name values', () => {
    fc.assert(
      fc.property(cardWithSharedSetNamesArb, (cards) => {
        const result = extractSetNames(cards);
        const unique = new Set(result);
        expect(result.length).toBe(unique.size);
      }),
      { numRuns: 100 }
    );
  });

  it('empty input returns empty array', () => {
    const result = extractSetNames([]);
    expect(result).toEqual([]);
  });
});
