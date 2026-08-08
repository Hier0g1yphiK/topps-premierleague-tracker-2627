import { describe, it, expect } from 'vitest';
import { sortCards, DEFAULT_SORT_CONFIG } from './sort';
import type { Card } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: '1',
    user_id: null,
    card_number: 1,
    set_name: 'Base',
    set_card_number: '1',
    player: 'Player A',
    team: 'Team A',
    notes: null,
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('sortCards', () => {
  it('does not mutate the input array', () => {
    const cards = [
      makeCard({ card_number: 3 }),
      makeCard({ card_number: 1 }),
      makeCard({ card_number: 2 }),
    ];
    const original = [...cards];
    sortCards(cards, DEFAULT_SORT_CONFIG);
    expect(cards).toEqual(original);
  });

  it('sorts by card_number ascending by default', () => {
    const cards = [
      makeCard({ card_number: 5 }),
      makeCard({ card_number: 2 }),
      makeCard({ card_number: 8 }),
    ];
    const sorted = sortCards(cards, DEFAULT_SORT_CONFIG);
    expect(sorted.map((c) => c.card_number)).toEqual([2, 5, 8]);
  });

  it('sorts by card_number descending', () => {
    const cards = [
      makeCard({ card_number: 5 }),
      makeCard({ card_number: 2 }),
      makeCard({ card_number: 8 }),
    ];
    const sorted = sortCards(cards, { column: 'card_number', direction: 'desc' });
    expect(sorted.map((c) => c.card_number)).toEqual([8, 5, 2]);
  });

  it('sorts by player name ascending with localeCompare', () => {
    const cards = [
      makeCard({ player: 'Zaha' }),
      makeCard({ player: 'Almiron' }),
      makeCard({ player: 'Mbappe' }),
    ];
    const sorted = sortCards(cards, { column: 'player', direction: 'asc' });
    expect(sorted.map((c) => c.player)).toEqual(['Almiron', 'Mbappe', 'Zaha']);
  });

  it('sorts by team descending', () => {
    const cards = [
      makeCard({ team: 'Arsenal' }),
      makeCard({ team: 'Chelsea' }),
      makeCard({ team: 'Brighton' }),
    ];
    const sorted = sortCards(cards, { column: 'team', direction: 'desc' });
    expect(sorted.map((c) => c.team)).toEqual(['Chelsea', 'Brighton', 'Arsenal']);
  });

  it('sorts by collected ascending (false before true)', () => {
    const cards = [
      makeCard({ collected: true }),
      makeCard({ collected: false }),
      makeCard({ collected: true }),
    ];
    const sorted = sortCards(cards, { column: 'collected', direction: 'asc' });
    expect(sorted.map((c) => c.collected)).toEqual([false, true, true]);
  });

  it('sorts by collected descending (true before false)', () => {
    const cards = [
      makeCard({ collected: false }),
      makeCard({ collected: true }),
      makeCard({ collected: false }),
    ];
    const sorted = sortCards(cards, { column: 'collected', direction: 'desc' });
    expect(sorted.map((c) => c.collected)).toEqual([true, false, false]);
  });

  it('sorts by set_name ascending', () => {
    const cards = [
      makeCard({ set_name: 'Trophy' }),
      makeCard({ set_name: 'Base' }),
      makeCard({ set_name: 'Foil' }),
    ];
    const sorted = sortCards(cards, { column: 'set_name', direction: 'asc' });
    expect(sorted.map((c) => c.set_name)).toEqual(['Base', 'Foil', 'Trophy']);
  });

  it('sorts by set_card_number as a string', () => {
    const cards = [
      makeCard({ set_card_number: 'B12' }),
      makeCard({ set_card_number: 'A3' }),
      makeCard({ set_card_number: 'C1' }),
    ];
    const sorted = sortCards(cards, { column: 'set_card_number', direction: 'asc' });
    expect(sorted.map((c) => c.set_card_number)).toEqual(['A3', 'B12', 'C1']);
  });

  it('handles empty array', () => {
    expect(sortCards([], DEFAULT_SORT_CONFIG)).toEqual([]);
  });

  it('handles single element array', () => {
    const cards = [makeCard({ card_number: 42 })];
    const sorted = sortCards(cards, DEFAULT_SORT_CONFIG);
    expect(sorted).toEqual(cards);
  });
});

describe('DEFAULT_SORT_CONFIG', () => {
  it('is card_number ascending', () => {
    expect(DEFAULT_SORT_CONFIG).toEqual({ column: 'card_number', direction: 'asc' });
  });
});
