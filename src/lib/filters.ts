import type { Card, CardParallel, FilterState } from '../types';

/**
 * Filters cards by case-insensitive substring match on player, team,
 * card_number, or set_card_number.
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
      card.team.toLowerCase().includes(lower) ||
      String(card.card_number).includes(lower) ||
      card.set_card_number.toLowerCase().includes(lower)
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
 * 'all' returns all cards, 'collected' returns cards where card.collected is true,
 * 'missing' returns cards where card.collected is false.
 * The card.collected field is the single source of truth for base-card collected status.
 */
export function filterByCollectedStatus(
  cards: Card[],
  status: 'all' | 'collected' | 'missing',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _parallelsMap?: Map<string, CardParallel[]>
): Card[] {
  if (status === 'all') {
    return cards;
  }

  return cards.filter((card) => {
    return status === 'collected' ? card.collected === true : card.collected === false;
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
