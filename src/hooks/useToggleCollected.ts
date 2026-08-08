import { useCallback, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Card } from '../types'
import { createToggleState, persistToggle, revertToggle } from '../lib/toggle-collected'

/**
 * Hook that manages toggling card collected status with optimistic UI updates
 * and queuing logic for rapid taps.
 *
 * While a persist request is in-flight for a given card, subsequent taps are
 * queued. Once the in-flight request completes, only the final queued state
 * is persisted — ensuring rapid taps result in the correct final state.
 */
export function useToggleCollected(
  supabase: SupabaseClient,
  updateCards: (updater: (cards: Card[]) => Card[]) => void
) {
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Track in-flight status per card
  const inFlightRef = useRef<Map<string, boolean>>(new Map())

  // Track the queued (final) state per card while a request is in-flight
  const queuedStateRef = useRef<
    Map<string, { collected: boolean; date_collected: string | null }>
  >(new Map())

  const toggleCard = useCallback(
    async (card: Card) => {
      const cardId = card.id
      const newState = createToggleState(card)

      // Optimistically update the UI immediately
      updateCards((cards) =>
        cards.map((c) =>
          c.id === cardId
            ? { ...c, collected: newState.collected, date_collected: newState.date_collected }
            : c
        )
      )

      // If a request is already in-flight for this card, queue the new state
      if (inFlightRef.current.get(cardId)) {
        queuedStateRef.current.set(cardId, newState)
        return
      }

      // Mark as in-flight
      inFlightRef.current.set(cardId, true)
      setTogglingIds((prev) => new Set(prev).add(cardId))

      const previousState = { collected: card.collected, date_collected: card.date_collected }

      try {
        await persistToggle(supabase, cardId, newState.collected, newState.date_collected)
      } catch {
        // Revert optimistic update on failure
        updateCards((cards) =>
          cards.map((c) => (c.id === cardId ? revertToggle(c, previousState) : c))
        )
        // Clear in-flight and any queued state on failure
        inFlightRef.current.delete(cardId)
        queuedStateRef.current.delete(cardId)
        setTogglingIds((prev) => {
          const next = new Set(prev)
          next.delete(cardId)
          return next
        })
        return
      }

      // After successful persist, check for queued state
      await processQueue(cardId)
    },
    [supabase, updateCards]
  )

  const processQueue = useCallback(
    async (cardId: string) => {
      const queued = queuedStateRef.current.get(cardId)

      if (queued) {
        // Clear the queued entry and persist the final state
        queuedStateRef.current.delete(cardId)

        try {
          await persistToggle(supabase, cardId, queued.collected, queued.date_collected)
        } catch {
          // On failure, revert to the state before the queued toggle
          const revertState = {
            collected: !queued.collected,
            date_collected: queued.collected ? null : new Date().toISOString().split('T')[0],
          }
          updateCards((cards) =>
            cards.map((c) => (c.id === cardId ? revertToggle(c, revertState) : c))
          )
        }
      }

      // Done — clear in-flight
      inFlightRef.current.delete(cardId)
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(cardId)
        return next
      })
    },
    [supabase, updateCards]
  )

  return { toggleCard, togglingIds }
}
