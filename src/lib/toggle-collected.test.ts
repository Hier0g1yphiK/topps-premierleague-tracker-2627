/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { createToggleState, persistToggle, revertToggle } from './toggle-collected'
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

describe('createToggleState', () => {
  it('returns collected=true and today date when card is uncollected', () => {
    const card = makeCard({ collected: false, date_collected: null })
    const result = createToggleState(card)

    expect(result.collected).toBe(true)
    expect(result.date_collected).toBe(new Date().toISOString().split('T')[0])
  })

  it('returns collected=false and null date when card is collected', () => {
    const card = makeCard({ collected: true, date_collected: '2025-06-01' })
    const result = createToggleState(card)

    expect(result.collected).toBe(false)
    expect(result.date_collected).toBeNull()
  })
})

describe('persistToggle', () => {
  it('calls supabase update with correct params', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as any

    await persistToggle(mockSupabase, 'card-1', true, '2025-07-01')

    expect(mockSupabase.from).toHaveBeenCalledWith('cards')
    expect(mockUpdate).toHaveBeenCalledWith({ collected: true, date_collected: '2025-07-01' })
  })

  it('throws on supabase error', async () => {
    const mockError = { message: 'Network error', code: '500' }
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: mockError }),
    })
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as any

    await expect(persistToggle(mockSupabase, 'card-1', true, '2025-07-01')).rejects.toEqual(mockError)
  })
})

describe('revertToggle', () => {
  it('restores collected and date_collected to previous values', () => {
    const card = makeCard({ collected: true, date_collected: '2025-07-01' })
    const previousState = { collected: false, date_collected: null }

    const result = revertToggle(card, previousState)

    expect(result.collected).toBe(false)
    expect(result.date_collected).toBeNull()
  })

  it('preserves all other card fields', () => {
    const card = makeCard({
      id: 'card-99',
      card_number: 99,
      player: 'Bukayo Saka',
      team: 'Arsenal',
      collected: false,
      date_collected: null,
    })
    const previousState = { collected: true, date_collected: '2025-05-15' }

    const result = revertToggle(card, previousState)

    expect(result.id).toBe('card-99')
    expect(result.card_number).toBe(99)
    expect(result.player).toBe('Bukayo Saka')
    expect(result.team).toBe('Arsenal')
    expect(result.collected).toBe(true)
    expect(result.date_collected).toBe('2025-05-15')
  })
})
