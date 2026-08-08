import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { saveCardsToCache, loadCardsFromCache, clearCache } from './offline-cache';
import type { Card } from '../types';

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

describe('offline-cache', () => {
  beforeEach(async () => {
    // Clear the database between tests
    await clearCache();
  });

  describe('loadCardsFromCache', () => {
    it('returns an empty array when nothing is cached', async () => {
      const result = await loadCardsFromCache();
      expect(result).toEqual([]);
    });
  });

  describe('saveCardsToCache', () => {
    it('stores cards that can be retrieved later', async () => {
      const cards: Card[] = [
        makeCard({ id: '1', card_number: 1, player: 'Haaland' }),
        makeCard({ id: '2', card_number: 2, player: 'Salah', team: 'Liverpool' }),
      ];

      await saveCardsToCache(cards);
      const result = await loadCardsFromCache();

      expect(result).toEqual(cards);
    });

    it('overwrites previous cache when called again', async () => {
      const firstBatch: Card[] = [makeCard({ id: '1', card_number: 1 })];
      const secondBatch: Card[] = [
        makeCard({ id: '2', card_number: 2 }),
        makeCard({ id: '3', card_number: 3 }),
      ];

      await saveCardsToCache(firstBatch);
      await saveCardsToCache(secondBatch);
      const result = await loadCardsFromCache();

      expect(result).toEqual(secondBatch);
    });

    it('handles an empty array', async () => {
      await saveCardsToCache([]);
      const result = await loadCardsFromCache();
      expect(result).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('removes cached cards', async () => {
      const cards: Card[] = [makeCard({ id: '1', card_number: 1 })];
      await saveCardsToCache(cards);
      await clearCache();

      const result = await loadCardsFromCache();
      expect(result).toEqual([]);
    });
  });
});
