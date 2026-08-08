import type { Card, FilterState } from '../types';

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
 * 'all' returns all cards, 'collected' returns collected===true,
 * 'missing' returns collected===false.
 */
export function filterByCollectedStatus(
  cards: Card[],
  status: 'all' | 'collected' | 'missing'
): Card[] {
  if (status === 'all') {
    return cards;
  }
  if (status === 'collected') {
    return cards.filter((card) => card.collected === true);
  }
  return cards.filter((card) => card.collected === false);
}

/**
 * Composes all filters with AND logic.
 * If all filters are at default (empty search, null setName, 'all' status),
 * returns the original array reference.
 */
export function applyFilters(cards: Card[], filters: FilterState): Card[] {
  const { searchText, setName, collectedStatus } = filters;

  // Short-circuit if all filters are at their defaults
  if (!searchText && setName === null && collectedStatus === 'all') {
    return cards;
  }

  let result = cards;
  result = filterBySearch(result, searchText);
  result = filterBySetName(result, setName);
  result = filterByCollectedStatus(result, collectedStatus);
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
