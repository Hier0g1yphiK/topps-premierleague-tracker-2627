import { describe, it, expect } from 'vitest';
import { filterByParallelStatus } from './parallel-filters';
import type { Card, CardParallel } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    user_id: null,
    card_number: 1,
    set_name: 'Base',
    set_card_number: '1',
    player: 'Test Player',
    team: 'Test Team',
    notes: null,
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeParallel(overrides: Partial<CardParallel> = {}): CardParallel {
  return {
    id: 'p1',
    card_id: 'c1',
    parallel_name: 'Blue Voltage',
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('filterByParallelStatus', () => {
  const cards = [
    makeCard({ id: 'c1' }),
    makeCard({ id: 'c2' }),
    makeCard({ id: 'c3' }),
  ];

  it('returns all cards for status "all"', () => {
    const map = new Map<string, CardParallel[]>();
    expect(filterByParallelStatus(cards, map, 'all')).toBe(cards);
  });

  it('returns cards with uncollected parallels for "has_uncollected"', () => {
    const map = new Map<string, CardParallel[]>([
      ['c1', [makeParallel({ id: 'p1', card_id: 'c1', collected: true })]],
      ['c2', [makeParallel({ id: 'p2', card_id: 'c2', collected: false })]],
    ]);
    const result = filterByParallelStatus(cards, map, 'has_uncollected');
    // c2 has uncollected parallel, c3 has no parallels at all
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toContain('c2');
    expect(result.map((c) => c.id)).toContain('c3');
  });

  it('returns cards with all parallels collected for "all_collected"', () => {
    const map = new Map<string, CardParallel[]>([
      ['c1', [makeParallel({ id: 'p1', card_id: 'c1', collected: true })]],
      ['c2', [makeParallel({ id: 'p2', card_id: 'c2', collected: false })]],
    ]);
    const result = filterByParallelStatus(cards, map, 'all_collected');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('excludes cards with no parallels from "all_collected"', () => {
    const map = new Map<string, CardParallel[]>();
    const result = filterByParallelStatus(cards, map, 'all_collected');
    expect(result).toHaveLength(0);
  });

  it('includes cards with no parallels in "has_uncollected"', () => {
    const map = new Map<string, CardParallel[]>();
    const result = filterByParallelStatus(cards, map, 'has_uncollected');
    expect(result).toHaveLength(3);
  });
});
