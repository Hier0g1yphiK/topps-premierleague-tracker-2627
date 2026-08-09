import type { CardParallel } from '../types';

/**
 * Sorts parallels: collected first, then uncollected,
 * alphabetical by parallel_name (case-insensitive) within each group.
 */
export function sortParallels(parallels: CardParallel[]): CardParallel[] {
  return [...parallels].sort((a, b) => {
    // Collected items first
    if (a.collected !== b.collected) {
      return a.collected ? -1 : 1;
    }
    // Alphabetical by parallel_name within each group (case-insensitive)
    return a.parallel_name.localeCompare(b.parallel_name, undefined, { sensitivity: 'base' });
  });
}
