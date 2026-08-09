import type { Card, CardParallel } from '../types';

export interface OverallStats {
  collected: number;
  total: number;
  percentage: string;
}

export interface SetBreakdown {
  setName: string;
  collected: number;
  total: number;
}

/**
 * Computes overall collection statistics from a card array.
 * Returns collected count, total count, and percentage rounded to 1 decimal place.
 * Handles empty array by returning "0.0%".
 */
export function computeOverallStats(cards: Card[]): OverallStats {
  if (cards.length === 0) {
    return { collected: 0, total: 0, percentage: '0.0%' };
  }

  const collected = cards.filter((card) => card.collected === true).length;
  const total = cards.length;
  const percentage = ((collected / total) * 100).toFixed(1) + '%';

  return { collected, total, percentage };
}

/**
 * Computes per-set breakdown of collection progress.
 * Groups cards by set_name, counts collected/total per group,
 * and orders groups by the minimum card_number within each set ascending.
 */
export function computePerSetBreakdown(cards: Card[]): SetBreakdown[] {
  if (cards.length === 0) {
    return [];
  }

  const groups = new Map<string, Card[]>();

  for (const card of cards) {
    const group = groups.get(card.set_name);
    if (group) {
      group.push(card);
    } else {
      groups.set(card.set_name, [card]);
    }
  }

  const breakdowns: (SetBreakdown & { minCardNumber: number })[] = [];

  for (const [setName, groupCards] of groups) {
    const collected = groupCards.filter((card) => card.collected === true).length;
    const total = groupCards.length;
    const minCardNumber = Math.min(...groupCards.map((card) => card.card_number));

    breakdowns.push({ setName, collected, total, minCardNumber });
  }

  breakdowns.sort((a, b) => a.minCardNumber - b.minCardNumber);

  return breakdowns.map(({ setName, collected, total }) => ({ setName, collected, total }));
}


export interface ParallelStats {
  totalCollected: number;
  totalAvailable: number;
  percentage: string;
}

export interface SetParallelBreakdown {
  setName: string;
  parallelsCollected: number;
  parallelsTotal: number;
}

/**
 * Computes overall parallel collection statistics from a CardParallel array.
 * Returns totalCollected count, totalAvailable count, and percentage rounded to 1 decimal place.
 * Handles empty array by returning "0.0%".
 */
export function computeParallelStats(parallels: CardParallel[]): ParallelStats {
  if (parallels.length === 0) {
    return { totalCollected: 0, totalAvailable: 0, percentage: '0.0%' };
  }

  const totalCollected = parallels.filter((p) => p.collected === true).length;
  const totalAvailable = parallels.length;
  const percentage = ((totalCollected / totalAvailable) * 100).toFixed(1) + '%';

  return { totalCollected, totalAvailable, percentage };
}

/**
 * Computes per-set breakdown of parallel collection progress.
 * Groups parallels by their card's set_name, counts collected/total per group.
 */
export function computePerSetParallelBreakdown(
  cards: Card[],
  parallels: CardParallel[]
): SetParallelBreakdown[] {
  if (parallels.length === 0) {
    return [];
  }

  // Build a map from card_id to set_name
  const cardToSet = new Map<string, string>();
  for (const card of cards) {
    cardToSet.set(card.id, card.set_name);
  }

  // Group parallels by set_name
  const groups = new Map<string, CardParallel[]>();
  for (const parallel of parallels) {
    const setName = cardToSet.get(parallel.card_id);
    if (setName === undefined) {
      // Parallel's card not found in cards array — skip
      continue;
    }
    const group = groups.get(setName);
    if (group) {
      group.push(parallel);
    } else {
      groups.set(setName, [parallel]);
    }
  }

  const breakdowns: SetParallelBreakdown[] = [];
  for (const [setName, groupParallels] of groups) {
    const parallelsCollected = groupParallels.filter((p) => p.collected === true).length;
    const parallelsTotal = groupParallels.length;
    breakdowns.push({ setName, parallelsCollected, parallelsTotal });
  }

  return breakdowns;
}
