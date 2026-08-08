import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createToggleState } from '../toggle-collected';
import type { Card } from '../../types';

/**
 * Feature: premier-league-tracker, Property 6: Toggle state transition
 * Validates: Requirements 4.1, 4.2
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

// --- Helpers ---

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// --- Property Tests ---

describe('Feature: premier-league-tracker, Property 6: Toggle state transition', () => {
  it('toggling flips boolean and sets/clears date_collected correctly', () => {
    fc.assert(
      fc.property(cardArbitrary, (card) => {
        const result = createToggleState(card);
        const today = getTodayISO();

        if (!card.collected) {
          // Uncollected -> collected: boolean flips to true, date set to today
          expect(result.collected).toBe(true);
          expect(result.date_collected).toBe(today);
        } else {
          // Collected -> uncollected: boolean flips to false, date cleared
          expect(result.collected).toBe(false);
          expect(result.date_collected).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('double-toggle returns to collected=false and date_collected=null', () => {
    fc.assert(
      fc.property(cardArbitrary, (card) => {
        // Start with an uncollected card
        const uncollectedCard: Card = {
          ...card,
          collected: false,
          date_collected: null,
        };

        // First toggle: should become collected with today's date
        const firstToggle = createToggleState(uncollectedCard);
        const today = getTodayISO();
        expect(firstToggle.collected).toBe(true);
        expect(firstToggle.date_collected).toBe(today);

        // Apply first toggle state to create a new card
        const collectedCard: Card = {
          ...uncollectedCard,
          collected: firstToggle.collected,
          date_collected: firstToggle.date_collected,
        };

        // Second toggle: should return to uncollected with null date
        const secondToggle = createToggleState(collectedCard);
        expect(secondToggle.collected).toBe(false);
        expect(secondToggle.date_collected).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
