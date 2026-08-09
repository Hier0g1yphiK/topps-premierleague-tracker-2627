import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveCardsToCache,
  loadCardsFromCache,
  saveParallelsToCache,
  loadParallelsFromCache,
  savePendingParallelToggle,
  loadPendingParallelToggles,
  clearPendingParallelToggles,
  clearCache,
} from '../offline-cache';
import type { Card, CardParallel } from '../../types';
import type { PendingToggle } from '../offline-cache';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-id-1',
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

function makeParallel(overrides: Partial<CardParallel> = {}): CardParallel {
  return {
    id: 'parallel-id-1',
    card_id: 'test-id-1',
    parallel_name: 'Base',
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('offline-cache integration (v2)', () => {
  beforeEach(async () => {
    await clearCache();
    await saveParallelsToCache([]);
    await clearPendingParallelToggles();
  });

  describe('cards coexist with new stores', () => {
    it('saves and loads cards correctly alongside parallel stores', async () => {
      const cards: Card[] = [
        makeCard({ id: '1', card_number: 1, player: 'Haaland' }),
        makeCard({ id: '2', card_number: 2, player: 'Salah', team: 'Liverpool' }),
      ];

      await saveCardsToCache(cards);
      const loaded = await loadCardsFromCache();

      expect(loaded).toEqual(cards);
    });

    it('cards and parallels can be saved independently without interference', async () => {
      const cards: Card[] = [
        makeCard({ id: '1', card_number: 1, player: 'Haaland' }),
      ];
      const parallels: CardParallel[] = [
        makeParallel({ id: 'p1', card_id: '1', parallel_name: 'Base', collected: true }),
        makeParallel({ id: 'p2', card_id: '1', parallel_name: 'Gold /50' }),
      ];

      await saveCardsToCache(cards);
      await saveParallelsToCache(parallels);

      const loadedCards = await loadCardsFromCache();
      const loadedParallels = await loadParallelsFromCache();

      expect(loadedCards).toEqual(cards);
      expect(loadedParallels).toEqual(parallels);
    });
  });

  describe('save/load parallel data', () => {
    it('returns empty array when no parallels are cached', async () => {
      const loaded = await loadParallelsFromCache();
      expect(loaded).toEqual([]);
    });

    it('saves and loads parallels correctly', async () => {
      const parallels: CardParallel[] = [
        makeParallel({ id: 'p1', card_id: 'c1', parallel_name: 'Base', collected: true, date_collected: '2025-06-01' }),
        makeParallel({ id: 'p2', card_id: 'c1', parallel_name: 'Blue Voltage', collected: false }),
        makeParallel({ id: 'p3', card_id: 'c2', parallel_name: 'FoilFractor 1/1', collected: true, date_collected: '2025-06-15' }),
      ];

      await saveParallelsToCache(parallels);
      const loaded = await loadParallelsFromCache();

      expect(loaded).toEqual(parallels);
    });

    it('overwrites previous parallels cache when called again', async () => {
      const first: CardParallel[] = [
        makeParallel({ id: 'p1', parallel_name: 'Base' }),
      ];
      const second: CardParallel[] = [
        makeParallel({ id: 'p2', parallel_name: 'Gold /50' }),
        makeParallel({ id: 'p3', parallel_name: 'Black & White /75' }),
      ];

      await saveParallelsToCache(first);
      await saveParallelsToCache(second);
      const loaded = await loadParallelsFromCache();

      expect(loaded).toEqual(second);
    });
  });

  describe('pending toggle queue', () => {
    it('saves and loads multiple pending toggles', async () => {
      const toggle1: PendingToggle = {
        parallelId: 'p1',
        collected: true,
        date_collected: '2025-07-01',
        timestamp: 1000,
      };
      const toggle2: PendingToggle = {
        parallelId: 'p2',
        collected: false,
        date_collected: null,
        timestamp: 2000,
      };
      const toggle3: PendingToggle = {
        parallelId: 'p1',
        collected: false,
        date_collected: null,
        timestamp: 3000,
      };

      await savePendingParallelToggle(toggle1);
      await savePendingParallelToggle(toggle2);
      await savePendingParallelToggle(toggle3);

      const loaded = await loadPendingParallelToggles();

      expect(loaded).toHaveLength(3);
      expect(loaded[0]).toEqual(toggle1);
      expect(loaded[1]).toEqual(toggle2);
      expect(loaded[2]).toEqual(toggle3);
    });

    it('clears all pending toggles', async () => {
      const toggle: PendingToggle = {
        parallelId: 'p1',
        collected: true,
        date_collected: '2025-07-01',
        timestamp: 1000,
      };

      await savePendingParallelToggle(toggle);
      await savePendingParallelToggle(toggle);
      await clearPendingParallelToggles();

      const loaded = await loadPendingParallelToggles();
      expect(loaded).toEqual([]);
    });

    it('returns empty array when no toggles are pending', async () => {
      const loaded = await loadPendingParallelToggles();
      expect(loaded).toEqual([]);
    });
  });
});
