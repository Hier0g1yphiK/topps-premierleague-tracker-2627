import { describe, it, expect } from 'vitest';
import {
  filterBySearch,
  filterBySetName,
  filterByCollectedStatus,
  applyFilters,
  extractSetNames,
} from './filters';
import type { Card, FilterState } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: '1',
    user_id: null,
    card_number: 1,
    set_name: 'Base',
    set_card_number: '1',
    player: 'Erling Haaland',
    team: 'Manchester City',
    notes: null,
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('filterBySearch', () => {
  const cards: Card[] = [
    makeCard({ id: '1', player: 'Erling Haaland', team: 'Manchester City' }),
    makeCard({ id: '2', player: 'Mohamed Salah', team: 'Liverpool' }),
    makeCard({ id: '3', player: 'Bukayo Saka', team: 'Arsenal' }),
  ];

  it('returns all cards when searchText is empty', () => {
    expect(filterBySearch(cards, '')).toBe(cards);
  });

  it('matches on player name case-insensitively', () => {
    const result = filterBySearch(cards, 'haaland');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('matches on team name case-insensitively', () => {
    const result = filterBySearch(cards, 'LIVERPOOL');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('matches partial substrings', () => {
    const result = filterBySearch(cards, 'Man');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('uses inclusive OR (player OR team)', () => {
    // 'pool' matches Liverpool (team) for Salah
    // Neither Haaland nor Saka match on player or team
    const result = filterBySearch(cards, 'pool');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');

    // 'saka' matches Bukayo Saka (player), not any team
    const result2 = filterBySearch(cards, 'saka');
    expect(result2).toHaveLength(1);
    expect(result2[0].id).toBe('3');
  });

  it('returns empty array when no match', () => {
    expect(filterBySearch(cards, 'zzz')).toHaveLength(0);
  });
});

describe('filterBySetName', () => {
  const cards: Card[] = [
    makeCard({ id: '1', set_name: 'Base' }),
    makeCard({ id: '2', set_name: 'Foil' }),
    makeCard({ id: '3', set_name: 'Base' }),
  ];

  it('returns all cards when setName is null', () => {
    expect(filterBySetName(cards, null)).toBe(cards);
  });

  it('filters by exact set_name match', () => {
    const result = filterBySetName(cards, 'Base');
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.set_name === 'Base')).toBe(true);
  });

  it('returns empty array when no match', () => {
    expect(filterBySetName(cards, 'NonExistent')).toHaveLength(0);
  });
});

describe('filterByCollectedStatus', () => {
  const cards: Card[] = [
    makeCard({ id: '1', collected: true }),
    makeCard({ id: '2', collected: false }),
    makeCard({ id: '3', collected: true }),
  ];

  it('returns all cards for status "all"', () => {
    expect(filterByCollectedStatus(cards, 'all')).toBe(cards);
  });

  it('returns only collected cards for status "collected"', () => {
    const result = filterByCollectedStatus(cards, 'collected');
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.collected === true)).toBe(true);
  });

  it('returns only uncollected cards for status "missing"', () => {
    const result = filterByCollectedStatus(cards, 'missing');
    expect(result).toHaveLength(1);
    expect(result[0].collected).toBe(false);
  });
});

describe('applyFilters', () => {
  const cards: Card[] = [
    makeCard({ id: '1', player: 'Erling Haaland', team: 'Manchester City', set_name: 'Base', collected: true }),
    makeCard({ id: '2', player: 'Mohamed Salah', team: 'Liverpool', set_name: 'Foil', collected: false }),
    makeCard({ id: '3', player: 'Bukayo Saka', team: 'Arsenal', set_name: 'Base', collected: true }),
  ];

  it('returns original array when all filters are at defaults', () => {
    const filters: FilterState = { searchText: '', setName: null, collectedStatus: 'all' };
    expect(applyFilters(cards, filters)).toBe(cards);
  });

  it('applies search filter alone', () => {
    const filters: FilterState = { searchText: 'Salah', setName: null, collectedStatus: 'all' };
    const result = applyFilters(cards, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('applies set name filter alone', () => {
    const filters: FilterState = { searchText: '', setName: 'Base', collectedStatus: 'all' };
    const result = applyFilters(cards, filters);
    expect(result).toHaveLength(2);
  });

  it('applies collected status filter alone', () => {
    const filters: FilterState = { searchText: '', setName: null, collectedStatus: 'missing' };
    const result = applyFilters(cards, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('composes all filters with AND logic', () => {
    const filters: FilterState = { searchText: 'a', setName: 'Base', collectedStatus: 'collected' };
    const result = applyFilters(cards, filters);
    // 'a' matches Haaland (player) + Manchester (team) and Saka (player) + Arsenal (team)
    // set_name 'Base' matches id 1, 3
    // collected matches id 1, 3
    // Search 'a': Haaland/Manchester City -> yes, Saka/Arsenal -> yes
    expect(result).toHaveLength(2);
  });
});

describe('extractSetNames', () => {
  it('returns distinct set names sorted alphabetically case-insensitive', () => {
    const cards: Card[] = [
      makeCard({ set_name: 'Foil' }),
      makeCard({ set_name: 'base' }),
      makeCard({ set_name: 'Base' }),
      makeCard({ set_name: 'Autograph' }),
    ];
    const result = extractSetNames(cards);
    expect(result).toEqual(['Autograph', 'base', 'Base', 'Foil']);
  });

  it('returns empty array for empty cards', () => {
    expect(extractSetNames([])).toEqual([]);
  });

  it('removes duplicates', () => {
    const cards: Card[] = [
      makeCard({ set_name: 'Base' }),
      makeCard({ set_name: 'Base' }),
      makeCard({ set_name: 'Foil' }),
    ];
    const result = extractSetNames(cards);
    expect(result).toEqual(['Base', 'Foil']);
  });
});
