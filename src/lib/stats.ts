import type { Card } from '../types';

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
