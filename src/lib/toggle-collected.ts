import type { SupabaseClient } from '@supabase/supabase-js'
import type { Card } from '../types'

/**
 * Computes the new toggle state for a card.
 * - If currently uncollected: becomes collected with today's date
 * - If currently collected: becomes uncollected with null date
 */
export function createToggleState(card: Card): { collected: boolean; date_collected: string | null } {
  if (!card.collected) {
    return {
      collected: true,
      date_collected: new Date().toISOString().split('T')[0],
    }
  }
  return {
    collected: false,
    date_collected: null,
  }
}

/**
 * Persists the toggle state to Supabase.
 * Throws on error.
 */
export async function persistToggle(
  supabase: SupabaseClient,
  cardId: string,
  collected: boolean,
  dateCollected: string | null
): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ collected, date_collected: dateCollected })
    .eq('id', cardId)

  if (error) {
    throw error
  }
}

/**
 * Reverts a card to its previous state after a failed toggle.
 * Returns a new Card object with collected and date_collected restored.
 */
export function revertToggle(
  card: Card,
  previousState: { collected: boolean; date_collected: string | null }
): Card {
  return {
    ...card,
    collected: previousState.collected,
    date_collected: previousState.date_collected,
  }
}
