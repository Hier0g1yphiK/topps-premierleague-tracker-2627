import { useCallback, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardParallel } from '../types'
import {
  createParallelToggleState,
  persistParallelToggle,
  revertParallelToggle,
} from '../lib/parallel-toggle'

/**
 * Hook that manages toggling parallel collected status with optimistic UI updates
 * and queuing logic for rapid taps.
 *
 * While a persist request is in-flight for a given parallel, subsequent taps are
 * queued. Once the in-flight request completes, only the final queued state
 * is persisted — ensuring rapid taps result in the correct final state.
 */
export function useToggleParallel(
  supabase: SupabaseClient,
  updateParallels: (updater: (parallels: CardParallel[]) => CardParallel[]) => void
): {
  toggleParallel: (parallel: CardParallel) => Promise<void>;
  togglingIds: Set<string>;
} {
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Track in-flight status per parallel
  const inFlightRef = useRef<Map<string, boolean>>(new Map())

  // Track the queued (final) state per parallel while a request is in-flight
  const queuedStateRef = useRef<
    Map<string, { collected: boolean; date_collected: string | null }>
  >(new Map())

  const toggleParallel = useCallback(
    async (parallel: CardParallel) => {
      const parallelId = parallel.id
      const newState = createParallelToggleState(parallel)

      // Optimistically update the UI immediately
      updateParallels((parallels) =>
        parallels.map((p) =>
          p.id === parallelId
            ? { ...p, collected: newState.collected, date_collected: newState.date_collected }
            : p
        )
      )

      // If a request is already in-flight for this parallel, queue the new state
      if (inFlightRef.current.get(parallelId)) {
        queuedStateRef.current.set(parallelId, newState)
        return
      }

      // Mark as in-flight
      inFlightRef.current.set(parallelId, true)
      setTogglingIds((prev) => new Set(prev).add(parallelId))

      const previousState = {
        collected: parallel.collected,
        date_collected: parallel.date_collected,
      }

      try {
        await persistParallelToggle(
          supabase,
          parallelId,
          newState.collected,
          newState.date_collected
        )
      } catch {
        // Revert optimistic update on failure
        updateParallels((parallels) =>
          parallels.map((p) => (p.id === parallelId ? revertParallelToggle(p, previousState) : p))
        )
        // Clear in-flight and any queued state on failure
        inFlightRef.current.delete(parallelId)
        queuedStateRef.current.delete(parallelId)
        setTogglingIds((prev) => {
          const next = new Set(prev)
          next.delete(parallelId)
          return next
        })
        return
      }

      // After successful persist, check for queued state
      await processQueue(parallelId)
    },
    [supabase, updateParallels]
  )

  const processQueue = useCallback(
    async (parallelId: string) => {
      const queued = queuedStateRef.current.get(parallelId)

      if (queued) {
        // Clear the queued entry and persist the final state
        queuedStateRef.current.delete(parallelId)

        try {
          await persistParallelToggle(supabase, parallelId, queued.collected, queued.date_collected)
        } catch {
          // On failure, revert to the state before the queued toggle
          const revertState = {
            collected: !queued.collected,
            date_collected: queued.collected ? null : new Date().toISOString().split('T')[0],
          }
          updateParallels((parallels) =>
            parallels.map((p) => (p.id === parallelId ? revertParallelToggle(p, revertState) : p))
          )
        }
      }

      // Done — clear in-flight
      inFlightRef.current.delete(parallelId)
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(parallelId)
        return next
      })
    },
    [supabase, updateParallels]
  )

  return { toggleParallel, togglingIds }
}
