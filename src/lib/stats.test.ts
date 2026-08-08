import { describe, it, expect } from 'vitest';
import { computeOverallStats, computePerSetBreakdown } from './stats';
import type { Card } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-id',
    user_id: null,
    card_number: 1,
    set_name: 'Set A',
    set_card_number: '1',
    player: 'Player',
    team: 'Team',
    notes: null,
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeOverallStats', () => {
  it('returns 0.0% for empty array', () => {
    const result = computeOverallStats([]);
    expect(result).toEqual({ collected: 0, total: 0, percentage: '0.0%' });
  });

  it('computes stats for all uncollected cards', () => {
    const cards = [makeCard(), makeCard({ id: '2', card_number: 2 })];
    const result = computeOverallStats(cards);
    expect(result).toEqual({ collected: 0, total: 2, percentage: '0.0%' });
  });

  it('computes stats for all collected cards', () => {
    const cards = [
      makeCard({ collected: true }),
      makeCard({ id: '2', card_number: 2, collected: true }),
    ];
    const result = computeOverallStats(cards);
    expect(result).toEqual({ collected: 2, total: 2, percentage: '100.0%' });
  });

  it('computes correct percentage with 1 decimal place', () => {
    const cards = [
      makeCard({ collected: true }),
      makeCard({ id: '2', card_number: 2, collected: false }),
      makeCard({ id: '3', card_number: 3, collected: false }),
    ];
    const result = computeOverallStats(cards);
    expect(result).toEqual({ collected: 1, total: 3, percentage: '33.3%' });
  });

  it('handles single card collected', () => {
    const cards = [makeCard({ collected: true })];
    const result = computeOverallStats(cards);
    expect(result).toEqual({ collected: 1, total: 1, percentage: '100.0%' });
  });
});

describe('computePerSetBreakdown', () => {
  it('returns empty array for empty input', () => {
    const result = computePerSetBreakdown([]);
    expect(result).toEqual([]);
  });

  it('groups cards by set_name', () => {
    const cards = [
      makeCard({ card_number: 1, set_name: 'Set A', collected: true }),
      makeCard({ id: '2', card_number: 2, set_name: 'Set A', collected: false }),
      makeCard({ id: '3', card_number: 3, set_name: 'Set B', collected: true }),
    ];
    const result = computePerSetBreakdown(cards);
    expect(result).toEqual([
      { setName: 'Set A', collected: 1, total: 2 },
      { setName: 'Set B', collected: 1, total: 1 },
    ]);
  });

  it('orders groups by minimum card_number in set ascending', () => {
    const cards = [
      makeCard({ card_number: 50, set_name: 'Late Set' }),
      makeCard({ id: '2', card_number: 10, set_name: 'Middle Set' }),
      makeCard({ id: '3', card_number: 1, set_name: 'Early Set' }),
    ];
    const result = computePerSetBreakdown(cards);
    expect(result[0].setName).toBe('Early Set');
    expect(result[1].setName).toBe('Middle Set');
    expect(result[2].setName).toBe('Late Set');
  });

  it('uses minimum card_number when set has multiple cards', () => {
    const cards = [
      makeCard({ card_number: 100, set_name: 'Set B' }),
      makeCard({ id: '2', card_number: 5, set_name: 'Set B' }),
      makeCard({ id: '3', card_number: 50, set_name: 'Set A' }),
      makeCard({ id: '4', card_number: 2, set_name: 'Set A' }),
    ];
    const result = computePerSetBreakdown(cards);
    // Set A has min card_number 2, Set B has min card_number 5
    expect(result[0].setName).toBe('Set A');
    expect(result[1].setName).toBe('Set B');
  });

  it('counts collected correctly per set', () => {
    const cards = [
      makeCard({ card_number: 1, set_name: 'Set A', collected: true }),
      makeCard({ id: '2', card_number: 2, set_name: 'Set A', collected: true }),
      makeCard({ id: '3', card_number: 3, set_name: 'Set A', collected: false }),
    ];
    const result = computePerSetBreakdown(cards);
    expect(result).toEqual([{ setName: 'Set A', collected: 2, total: 3 }]);
  });
});
