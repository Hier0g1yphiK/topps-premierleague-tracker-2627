import type { Card, SortColumn, SortConfig } from '../types';

/** Default sort configuration: card_number ascending */
export const DEFAULT_SORT_CONFIG: SortConfig = {
  column: 'card_number',
  direction: 'asc',
};

/**
 * Returns a new sorted array of cards based on the given sort configuration.
 * Does not mutate the input array.
 */
export function sortCards(cards: Card[], config: SortConfig = DEFAULT_SORT_CONFIG): Card[] {
  const { column, direction } = config;
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...cards].sort((a, b) => {
    return multiplier * compareByColumn(a, b, column);
  });
}

function compareByColumn(a: Card, b: Card, column: SortColumn): number {
  switch (column) {
    case 'card_number':
      return a.card_number - b.card_number;

    case 'set_name':
    case 'set_card_number':
    case 'player':
    case 'team':
      return a[column].localeCompare(b[column]);

    case 'collected':
      // false before true in ascending (false = 0, true = 1)
      return Number(a.collected) - Number(b.collected);
  }
}
