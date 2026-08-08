import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createToggleState, revertToggle } from '../toggle-collected';
import type { Card } from '../../types';

/**
 * Feature: premier-league-tracker, Property 7: Toggle revert on failure
 * Validates: Requirements 4.4
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

describe('Feature: premier-league-tracker, Property 7: Toggle revert on failure', () => {
  it('revert restores collected and date_collected to exact pre-toggle values', () => {
    fc.assert(
      fc.property(
        cardArbitrary,
        (card) => {
          // Save original state
          const originalState = {
            collected: card.collected,
            date_collected: card.date_collected,
          };

          // Compute toggle state (simulates what happens on tap)
          const toggleState = createToggleState(card);

          // Apply toggle state to simulate optimistic update
          const toggledCard: Card = {
            ...card,
            collected: toggleState.collected,
            date_collected: toggleState.date_collected,
          };

          // Simulate failure revert
          const revertedCard = revertToggle(toggledCard, originalState);

          // Verify: collected and date_collected match original exactly
          expect(revertedCard.collected).toBe(card.collected);
          expect(revertedCard.date_collected).toBe(card.date_collected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('revert preserves all other card fields unchanged', () => {
    fc.assert(
      fc.property(
        cardArbitrary,
        (card) => {
          // Save original state
          const originalState = {
            collected: card.collected,
            date_collected: card.date_collected,
          };

          // Compute toggle state and apply optimistic update
          const toggleState = createToggleState(card);
          const toggledCard: Card = {
            ...card,
            collected: toggleState.collected,
            date_collected: toggleState.date_collected,
          };

          // Simulate failure revert
          const revertedCard = revertToggle(toggledCard, originalState);

          // Verify: all non-toggle fields are preserved
          expect(revertedCard.id).toBe(card.id);
          expect(revertedCard.user_id).toBe(card.user_id);
          expect(revertedCard.card_number).toBe(card.card_number);
          expect(revertedCard.set_name).toBe(card.set_name);
          expect(revertedCard.set_card_number).toBe(card.set_card_number);
          expect(revertedCard.player).toBe(card.player);
          expect(revertedCard.team).toBe(card.team);
          expect(revertedCard.notes).toBe(card.notes);
          expect(revertedCard.created_at).toBe(card.created_at);
        }
      ),
      { numRuns: 100 }
    );
  });
});
