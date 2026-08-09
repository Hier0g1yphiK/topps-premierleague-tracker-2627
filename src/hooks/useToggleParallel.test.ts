/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToggleParallel } from './useToggleParallel'
import type { CardParallel } from '../types'

function makeParallel(overrides: Partial<CardParallel> = {}): CardParallel {
  return {
    id: 'parallel-1',
    card_id: 'card-1',
    parallel_name: 'Blue Voltage',
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

function createMockSupabase(options: { shouldFail?: boolean; delay?: number } = {}) {
  const { shouldFail = false, delay = 0 } = options
  const eqFn = vi.fn().mockImplementation(() => {
    if (delay > 0) {
      return new Promise((resolve) =>
        setTimeout(
          () => resolve({ error: shouldFail ? { message: 'Network error' } : null }),
          delay
        )
      )
    }
    return Promise.resolve({ error: shouldFail ? { message: 'Network error' } : null })
  })
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn })
  const fromFn = vi.fn().mockReturnValue({ update: updateFn })

  return { from: fromFn, _updateFn: updateFn, _eqFn: eqFn } as any
}

describe('useToggleParallel', () => {
  let updateParallels: ReturnType<typeof vi.fn>

  beforeEach(() => {
    updateParallels = vi.fn()
  })

  it('toggles an uncollected parallel to collected optimistically', async () => {
    const supabase = createMockSupabase()
    const { result } = renderHook(() => useToggleParallel(supabase, updateParallels))

    const parallel = makeParallel({ collected: false, date_collected: null })

    await act(async () => {
      await result.current.toggleParallel(parallel)
    })

    // Should have called updateParallels with the optimistic update
    expect(updateParallels).toHaveBeenCalled()
    const updater = updateParallels.mock.calls[0][0]
    const updated = updater([parallel])
    expect(updated[0].collected).toBe(true)
    expect(updated[0].date_collected).toBe(new Date().toISOString().split('T')[0])
  })

  it('toggles a collected parallel to uncollected optimistically', async () => {
    const supabase = createMockSupabase()
    const { result } = renderHook(() => useToggleParallel(supabase, updateParallels))

    const parallel = makeParallel({ collected: true, date_collected: '2025-06-01' })

    await act(async () => {
      await result.current.toggleParallel(parallel)
    })

    const updater = updateParallels.mock.calls[0][0]
    const updated = updater([parallel])
    expect(updated[0].collected).toBe(false)
    expect(updated[0].date_collected).toBeNull()
  })

  it('reverts optimistic update on persist failure', async () => {
    const supabase = createMockSupabase({ shouldFail: true })
    const { result } = renderHook(() => useToggleParallel(supabase, updateParallels))

    const parallel = makeParallel({ collected: false, date_collected: null })

    await act(async () => {
      await result.current.toggleParallel(parallel)
    })

    // First call is optimistic update, second call is revert
    expect(updateParallels).toHaveBeenCalledTimes(2)
    const revertUpdater = updateParallels.mock.calls[1][0]
    const reverted = revertUpdater([
      { ...parallel, collected: true, date_collected: '2025-07-01' },
    ])
    expect(reverted[0].collected).toBe(false)
    expect(reverted[0].date_collected).toBeNull()
  })

  it('tracks toggling IDs (adds during in-flight, removes after)', async () => {
    let resolveRequest: () => void
    const pendingPromise = new Promise<{ error: null }>((resolve) => {
      resolveRequest = () => resolve({ error: null })
    })

    const eqFn = vi.fn().mockReturnValue(pendingPromise)
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn })
    const supabase = { from: vi.fn().mockReturnValue({ update: updateFn }) } as any

    const { result } = renderHook(() => useToggleParallel(supabase, updateParallels))
    const parallel = makeParallel()

    // Start toggle but don't resolve yet
    let togglePromise: Promise<void>
    act(() => {
      togglePromise = result.current.toggleParallel(parallel)
    })

    // Parallel should be in togglingIds
    expect(result.current.togglingIds.has('parallel-1')).toBe(true)

    // Resolve the request
    await act(async () => {
      resolveRequest!()
      await togglePromise!
    })

    // Parallel should no longer be in togglingIds
    expect(result.current.togglingIds.has('parallel-1')).toBe(false)
  })

  it('queues rapid taps and persists only the final state', async () => {
    let resolveFirst: () => void
    const firstPromise = new Promise<{ error: null }>((resolve) => {
      resolveFirst = () => resolve({ error: null })
    })

    let callCount = 0
    const eqFn = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return firstPromise
      return Promise.resolve({ error: null })
    })
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn })
    const supabase = { from: vi.fn().mockReturnValue({ update: updateFn }) } as any

    const { result } = renderHook(() => useToggleParallel(supabase, updateParallels))

    const parallel = makeParallel({ collected: false, date_collected: null })

    // First toggle: uncollected -> collected (goes in-flight)
    let firstToggle: Promise<void>
    act(() => {
      firstToggle = result.current.toggleParallel(parallel)
    })

    // Second toggle while first is in-flight: collected -> uncollected (queued)
    const parallelAfterFirst = makeParallel({ collected: true, date_collected: '2025-07-01' })
    act(() => {
      result.current.toggleParallel(parallelAfterFirst)
    })

    // Third toggle while first is in-flight: uncollected -> collected (overwrites queue)
    const parallelAfterSecond = makeParallel({ collected: false, date_collected: null })
    act(() => {
      result.current.toggleParallel(parallelAfterSecond)
    })

    // Resolve the first request - should then process the final queued state
    await act(async () => {
      resolveFirst!()
      await firstToggle!
    })

    // persist should have been called twice total:
    // 1. The initial in-flight request
    // 2. The final queued state (collected: true)
    expect(updateFn).toHaveBeenCalledTimes(2)
    // Second persist call should be with the final toggled state (collected=true)
    expect(updateFn).toHaveBeenLastCalledWith({
      collected: true,
      date_collected: expect.any(String),
    })
  })

  it('does not queue if no subsequent taps occur', async () => {
    const supabase = createMockSupabase()
    const { result } = renderHook(() => useToggleParallel(supabase, updateParallels))

    const parallel = makeParallel({ collected: false })

    await act(async () => {
      await result.current.toggleParallel(parallel)
    })

    // Only one persist call
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })
})
