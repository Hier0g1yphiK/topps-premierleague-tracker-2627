import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardParallel } from '../types'

/**
 * Computes the new toggle state for a card parallel.
 * - If currently uncollected: becomes collected with today's date
 * - If currently collected: becomes uncollected with null date
 */
export function createParallelToggleState(
  parallel: CardParallel
): { collected: boolean; date_collected: string | null } {
  if (!parallel.collected) {
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
 * Persists the parallel toggle state to Supabase.
 * Throws on error.
 */
export async function persistParallelToggle(
  supabase: SupabaseClient,
  parallelId: string,
  collected: boolean,
  dateCollected: string | null
): Promise<void> {
  const { error } = await supabase
    .from('card_parallels')
    .update({ collected, date_collected: dateCollected })
    .eq('id', parallelId)

  if (error) {
    throw error
  }
}

/**
 * Reverts a card parallel to its previous state after a failed toggle.
 * Returns a new CardParallel object with collected and date_collected restored.
 */
export function revertParallelToggle(
  parallel: CardParallel,
  previousState: { collected: boolean; date_collected: string | null }
): CardParallel {
  return {
    ...parallel,
    collected: previousState.collected,
    date_collected: previousState.date_collected,
  }
}
