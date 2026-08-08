import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { applyFilters } from '../filters';
import type { Card, FilterState } from '../../types';

/**
 * Property 4: Composite Filter AND Logic
 *
 * For any array of cards and any combination of active filters (search text,
 * set name, collected status), the filtered result SHALL contain exactly those
 * cards satisfying ALL active filter criteria simultaneously. When all filters
 * are in their default/cleared state, the result SHALL equal the full card array.
 *
 * **Validates: Requirements 3.3, 3.4, 3.5**
 *
 * Tag: Feature: premier-league-tracker, Property 4: Composite filter AND logic
 */

// --- Arbitraries ---

const cardArb: fc.Arbitrary<Card> = fc.record({
  id: fc.uuid(),
  user_id: fc.constant(null),
  card_number: fc.integer({ min: 1, max: 2000 }),
  set_name: fc.string({ minLength: 1, maxLength: 30 }),
  set_card_number: fc.string({ minLength: 1, maxLength: 10 }),
  player: fc.string({ minLength: 1, maxLength: 50 }),
  team: fc.string({ minLength: 1, maxLength: 50 }),
  notes: fc.constant(null),
  collected: fc.boolean(),
  date_collected: fc.constant(null),
  created_at: fc.constant('2025-01-01T00:00:00Z'),
});

const cardsArb = fc.array(cardArb, { minLength: 0, maxLength: 50 });

const filterStateArb: fc.Arbitrary<FilterState> = fc.record({
  searchText: fc.string({ minLength: 0, maxLength: 100 }),
  setName: fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 1, maxLength: 30 })
  ),
  collectedStatus: fc.constantFrom('all' as const, 'collected' as const, 'missing' as const),
});

// --- Helper: check if a single card satisfies all active filter criteria ---

function satisfiesAllFilters(card: Card, filters: FilterState): boolean {
  const { searchText, setName, collectedStatus } = filters;

  // Search text filter: card.player or card.team contains searchText (case-insensitive)
  if (searchText) {
    const lower = searchText.toLowerCase();
    if (
      !card.player.toLowerCase().includes(lower) &&
      !card.team.toLowerCase().includes(lower)
    ) {
      return false;
    }
  }

  // Set name filter: exact match
  if (setName !== null) {
    if (card.set_name !== setName) {
      return false;
    }
  }

  // Collected status filter
  if (collectedStatus === 'collected' && card.collected !== true) {
    return false;
  }
  if (collectedStatus === 'missing' && card.collected !== false) {
    return false;
  }

  return true;
}

describe('Feature: premier-league-tracker, Property 4: Composite filter AND logic', () => {
  /**
   * **Validates: Requirements 3.3, 3.4, 3.5**
   */
  it('every card in the result satisfies ALL active criteria simultaneously', () => {
    fc.assert(
      fc.property(cardsArb, filterStateArb, (cards, filters) => {
        const result = applyFilters(cards, filters);

        // Every card in the result must satisfy all active criteria
        for (const card of result) {
          expect(satisfiesAllFilters(card, filters)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.3, 3.4, 3.5**
   */
  it('no excluded card would have satisfied all criteria', () => {
    fc.assert(
      fc.property(cardsArb, filterStateArb, (cards, filters) => {
        const result = applyFilters(cards, filters);
        const resultSet = new Set(result.map((c) => c.id));

        // Every card NOT in the result must fail at least one criterion
        for (const card of cards) {
          if (!resultSet.has(card.id)) {
            expect(satisfiesAllFilters(card, filters)).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.3, 3.4, 3.5**
   */
  it('clearing all filters returns the full array (same reference)', () => {
    fc.assert(
      fc.property(cardsArb, (cards) => {
        const defaultFilters: FilterState = {
          searchText: '',
          setName: null,
          collectedStatus: 'all',
        };
        const result = applyFilters(cards, defaultFilters);

        // When all filters are defaults, result should be the same reference
        expect(result).toBe(cards);
      }),
      { numRuns: 100 }
    );
  });
});
