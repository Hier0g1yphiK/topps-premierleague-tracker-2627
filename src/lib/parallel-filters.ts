import type { Card, CardParallel, ParallelFilterStatus } from '../types';

/**
 * Derives the card-level collected status from its parallels.
 *
 * Returns true if and only if a "Base" parallel exists with collected === true.
 * In all other cases (no Base parallel, or Base parallel with collected === false),
 * returns false.
 */
export function deriveCardCollectedStatus(parallels: CardParallel[]): boolean {
  const base = parallels.find((p) => p.parallel_name === 'Base');
  return base !== undefined && base.collected === true;
}

/**
 * Filters cards by their parallel completion status.
 *
 * - 'all': returns all cards (no filtering)
 * - 'has_uncollected': returns cards where at least one parallel has collected === false,
 *    or cards with no parallels in the map (nothing collected yet)
 * - 'all_collected': returns cards where ALL parallels have collected === true,
 *    excludes cards with no parallels in the map
 */
export function filterByParallelStatus(
  cards: Card[],
  parallelsMap: Map<string, CardParallel[]>,
  status: ParallelFilterStatus
): Card[] {
  if (status === 'all') {
    return cards;
  }

  if (status === 'has_uncollected') {
    return cards.filter((card) => {
      const parallels = parallelsMap.get(card.id);
      if (!parallels || parallels.length === 0) {
        return true;
      }
      return parallels.some((p) => p.collected === false);
    });
  }

  // status === 'all_collected'
  return cards.filter((card) => {
    const parallels = parallelsMap.get(card.id);
    if (!parallels || parallels.length === 0) {
      return false;
    }
    return parallels.every((p) => p.collected === true);
  });
}
