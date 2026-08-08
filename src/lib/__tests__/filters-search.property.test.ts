import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterBySearch } from '../filters';
import type { Card } from '../../types';

/**
 * Property 3: Text Search Filter Correctness
 * 
 * For any array of cards and any search string S (up to 100 characters),
 * the filtered result contains exactly those cards where the player name
 * OR team name contains S as a case-insensitive substring.
 *
 * **Validates: Requirements 3.1**
 */

// Safe date arbitrary using integer timestamps to avoid invalid date issues
const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59Z').getTime();

const safeDateISOArb = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP }).map(
  (ts) => new Date(ts).toISOString()
);

const safeDateOnlyArb = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP }).map(
  (ts) => new Date(ts).toISOString().split('T')[0]
);

// Arbitrary for generating a Card object
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
  date_collected: fc.option(safeDateOnlyArb, { nil: null }),
  created_at: safeDateISOArb,
});

// Arbitrary for search strings up to 100 characters
const searchArb: fc.Arbitrary<string> = fc.string({ minLength: 0, maxLength: 100 });

describe('Feature: premier-league-tracker, Property 3: Text search filter correctness', () => {
  it('filtered result contains exactly cards matching search text as case-insensitive substring in player OR team', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 30 }),
        searchArb,
        (cards, searchText) => {
          const result = filterBySearch(cards, searchText);
          const lower = searchText.toLowerCase();

          // Soundness: every card in the result must match
          for (const card of result) {
            const playerMatches = card.player.toLowerCase().includes(lower);
            const teamMatches = card.team.toLowerCase().includes(lower);
            expect(playerMatches || teamMatches).toBe(true);
          }

          // Completeness: no card excluded from result should have matched
          const resultIds = new Set(result.map((c) => c.id));
          for (const card of cards) {
            if (!resultIds.has(card.id)) {
              const playerMatches = card.player.toLowerCase().includes(lower);
              const teamMatches = card.team.toLowerCase().includes(lower);
              expect(playerMatches || teamMatches).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when searchText is empty, result is the same reference as input array', () => {
    fc.assert(
      fc.property(
        fc.array(cardArb, { minLength: 0, maxLength: 30 }),
        (cards) => {
          const result = filterBySearch(cards, '');
          expect(result).toBe(cards);
        }
      ),
      { numRuns: 100 }
    );
  });
});
