import type { Card, CardParallel, FilterState } from '../types';

/**
 * Filters cards by case-insensitive substring match on player OR team.
 * Returns all cards if searchText is empty.
 */
export function filterBySearch(cards: Card[], searchText: string): Card[] {
  if (!searchText) {
    return cards;
  }
  const lower = searchText.toLowerCase();
  return cards.filter(
    (card) =>
      card.player.toLowerCase().includes(lower) ||
      card.team.toLowerCase().includes(lower)
  );
}

/**
 * Filters cards by exact set_name match.
 * Returns all cards if setName is null (meaning "All Sets").
 */
export function filterBySetName(cards: Card[], setName: string | null): Card[] {
  if (setName === null) {
    return cards;
  }
  return cards.filter((card) => card.set_name === setName);
}

/**
 * Filters cards by collected status.
 * 'all' returns all cards, 'collected' returns cards with at least one parallel collected,
 * 'missing' returns cards with no parallels collected.
 * Falls back to card.collected if no parallels exist for a card.
 */
export function filterByCollectedStatus(
  cards: Card[],
  status: 'all' | 'collected' | 'missing',
  parallelsMap?: Map<string, CardParallel[]>
): Card[] {
  if (status === 'all') {
    return cards;
  }

  return cards.filter((card) => {
    const parallels = parallelsMap?.get(card.id);
    // Determine collected: any parallel collected, or fall back to card.collected
    const isCollected = parallels && parallels.length > 0
      ? parallels.some((p) => p.collected === true)
      : card.collected === true;

    return status === 'collected' ? isCollected : !isCollected;
  });
}

/**
 * Composes all filters with AND logic.
 * If all filters are at default (empty search, null setName, 'all' status),
 * returns the original array reference.
 */
export function applyFilters(
  cards: Card[],
  filters: FilterState,
  parallelsMap?: Map<string, CardParallel[]>
): Card[] {
  const { searchText, setName, collectedStatus } = filters;

  // Short-circuit if all filters are at their defaults
  if (!searchText && setName === null && collectedStatus === 'all') {
    return cards;
  }

  let result = cards;
  result = filterBySearch(result, searchText);
  result = filterBySetName(result, setName);
  result = filterByCollectedStatus(result, collectedStatus, parallelsMap);
  return result;
}

/**
 * Extracts distinct set_name values from the cards array,
 * sorted alphabetically case-insensitive using localeCompare.
 */
export function extractSetNames(cards: Card[]): string[] {
  const setNamesSet = new Set<string>();
  for (const card of cards) {
    setNamesSet.add(card.set_name);
  }
  const names = Array.from(setNamesSet);
  names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return names;
}
