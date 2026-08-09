import { describe, it, expect } from 'vitest';
import { deriveCardCollectedStatus } from './parallel-filters';
import type { CardParallel } from '../types';

function makeParallel(overrides: Partial<CardParallel> = {}): CardParallel {
  return {
    id: 'p1',
    card_id: 'c1',
    parallel_name: 'Base',
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('deriveCardCollectedStatus', () => {
  it('returns true when Base parallel is collected', () => {
    const parallels = [makeParallel({ parallel_name: 'Base', collected: true })];
    expect(deriveCardCollectedStatus(parallels)).toBe(true);
  });

  it('returns false when Base parallel is not collected', () => {
    const parallels = [makeParallel({ parallel_name: 'Base', collected: false })];
    expect(deriveCardCollectedStatus(parallels)).toBe(false);
  });

  it('returns false when no Base parallel exists', () => {
    const parallels = [
      makeParallel({ parallel_name: 'Blue Voltage', collected: true }),
      makeParallel({ parallel_name: 'Gold /50', collected: true }),
    ];
    expect(deriveCardCollectedStatus(parallels)).toBe(false);
  });

  it('returns false for an empty parallels array', () => {
    expect(deriveCardCollectedStatus([])).toBe(false);
  });

  it('returns true when Base is collected among other parallels', () => {
    const parallels = [
      makeParallel({ parallel_name: 'Blue Voltage', collected: false }),
      makeParallel({ parallel_name: 'Base', collected: true }),
      makeParallel({ parallel_name: 'Gold /50', collected: false }),
    ];
    expect(deriveCardCollectedStatus(parallels)).toBe(true);
  });

  it('is case-sensitive — "base" does not count as Base', () => {
    const parallels = [makeParallel({ parallel_name: 'base', collected: true })];
    expect(deriveCardCollectedStatus(parallels)).toBe(false);
  });
});
