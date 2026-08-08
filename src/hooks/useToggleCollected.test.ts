import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToggleCollected } from './useToggleCollected'
import type { Card } from '../types'

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    user_id: null,
    card_number: 1,
    set_name: 'Base',
    set_card_number: '1',
    player: 'Erling Haaland',
    team: 'Manchester City',
    notes: null,
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

describe('useToggleCollected', () => {
  let updateCards: ReturnType<typeof vi.fn>

  beforeEach(() => {
    updateCards = vi.fn()
  })

  it('toggles an uncollected card to collected optimistically', async () => {
    const supabase = createMockSupabase()
    const { result } = renderHook(() => useToggleCollected(supabase, updateCards))

    const card = makeCard({ collected: false, date_collected: null })

    await act(async () => {
      await result.current.toggleCard(card)
    })

    // Should have called updateCards with the optimistic update
    expect(updateCards).toHaveBeenCalled()
    const updater = updateCards.mock.calls[0][0]
    const updated = updater([card])
    expect(updated[0].collected).toBe(true)
    expect(updated[0].date_collected).toBe(new Date().toISOString().split('T')[0])
  })

  it('toggles a collected card to uncollected optimistically', async () => {
    const supabase = createMockSupabase()
    const { result } = renderHook(() => useToggleCollected(supabase, updateCards))

    const card = makeCard({ collected: true, date_collected: '2025-06-01' })

    await act(async () => {
      await result.current.toggleCard(card)
    })

    const updater = updateCards.mock.calls[0][0]
    const updated = updater([card])
    expect(updated[0].collected).toBe(false)
    expect(updated[0].date_collected).toBeNull()
  })

  it('reverts optimistic update on persist failure', async () => {
    const supabase = createMockSupabase({ shouldFail: true })
    const { result } = renderHook(() => useToggleCollected(supabase, updateCards))

    const card = makeCard({ collected: false, date_collected: null })

    await act(async () => {
      await result.current.toggleCard(card)
    })

    // First call is optimistic update, second call is revert
    expect(updateCards).toHaveBeenCalledTimes(2)
    const revertUpdater = updateCards.mock.calls[1][0]
    const reverted = revertUpdater([{ ...card, collected: true, date_collected: '2025-07-01' }])
    expect(reverted[0].collected).toBe(false)
    expect(reverted[0].date_collected).toBeNull()
  })

  it('tracks toggling card ids', async () => {
    let resolveRequest: () => void
    const pendingPromise = new Promise<{ error: null }>((resolve) => {
      resolveRequest = () => resolve({ error: null })
    })

    const eqFn = vi.fn().mockReturnValue(pendingPromise)
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn })
    const supabase = { from: vi.fn().mockReturnValue({ update: updateFn }) } as any

    const { result } = renderHook(() => useToggleCollected(supabase, updateCards))
    const card = makeCard()

    // Start toggle but don't resolve yet
    let togglePromise: Promise<void>
    act(() => {
      togglePromise = result.current.toggleCard(card)
    })

    // Card should be in togglingIds
    expect(result.current.togglingIds.has('card-1')).toBe(true)

    // Resolve the request
    await act(async () => {
      resolveRequest!()
      await togglePromise!
    })

    // Card should no longer be in togglingIds
    expect(result.current.togglingIds.has('card-1')).toBe(false)
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

    const { result } = renderHook(() => useToggleCollected(supabase, updateCards))

    const card = makeCard({ collected: false, date_collected: null })

    // First toggle: uncollected -> collected (goes in-flight)
    let firstToggle: Promise<void>
    act(() => {
      firstToggle = result.current.toggleCard(card)
    })

    // Second toggle while first is in-flight: collected -> uncollected (queued)
    const cardAfterFirst = makeCard({ collected: true, date_collected: '2025-07-01' })
    act(() => {
      result.current.toggleCard(cardAfterFirst)
    })

    // Third toggle while first is in-flight: uncollected -> collected (overwrites queue)
    const cardAfterSecond = makeCard({ collected: false, date_collected: null })
    act(() => {
      result.current.toggleCard(cardAfterSecond)
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
    const { result } = renderHook(() => useToggleCollected(supabase, updateCards))

    const card = makeCard({ collected: false })

    await act(async () => {
      await result.current.toggleCard(card)
    })

    // Only one persist call
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })
})
