import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import type { Card, CardParallel } from '../types';

// Mock the reconnection module
vi.mock('../lib/reconnection', () => ({
  createReconnectionManager: vi.fn((reconnectFn, callbacks) => {
    return {
      start: vi.fn(() => callbacks.onReconnecting(0)),
      retry: vi.fn(() => {
        callbacks.onReconnecting(0);
      }),
      stop: vi.fn(),
      getAttemptCount: vi.fn(() => 0),
    };
  }),
  calculateBackoffDelay: vi.fn((attempt: number) => 1000 * Math.pow(2, attempt)),
}));

// Mock channel implementation
function createMockChannel() {
  let subscribeCallback: ((status: string) => void) | null = null;
  const listeners: Record<string, ((payload: { new: unknown }) => void)[]> = {};

  const channel = {
    on: vi.fn((type: string, filter: { event: string; table?: string }, callback: (payload: { new: unknown }) => void) => {
      const key = `${type}:${filter.event}:${filter.table || 'cards'}`;
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(callback);
      return channel;
    }),
    subscribe: vi.fn((callback: (status: string) => void) => {
      subscribeCallback = callback;
      return channel;
    }),
    // Helper to simulate status changes in tests
    _simulateStatus(status: string) {
      subscribeCallback?.(status);
    },
    // Helper to simulate a postgres_changes event
    _simulateEvent(event: string, payload: { new: unknown; table?: string }) {
      const table = payload.table || 'cards';
      const key = `postgres_changes:${event}:${table}`;
      listeners[key]?.forEach((cb) => cb(payload));
    },
  };

  return channel;
}

function createMockSupabase(channel: ReturnType<typeof createMockChannel>) {
  return {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  } as unknown as Parameters<typeof useRealtimeSubscription>[0]['supabase'];
}

const mockCard: Card = {
  id: '123',
  user_id: null,
  card_number: 1,
  set_name: 'Base',
  set_card_number: '1',
  player: 'Test Player',
  team: 'Test FC',
  notes: null,
  collected: true,
  date_collected: '2025-01-15',
  created_at: '2025-01-01T00:00:00Z',
};

const mockParallel: CardParallel = {
  id: 'par-1',
  card_id: '123',
  parallel_name: 'Blue Voltage',
  collected: true,
  date_collected: '2025-01-20',
  created_at: '2025-01-01T00:00:00Z',
};

describe('useRealtimeSubscription', () => {
  let mockChannel: ReturnType<typeof createMockChannel>;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockChannel = createMockChannel();
    mockSupabase = createMockSupabase(mockChannel);
  });

  it('starts with disconnected status', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    expect(result.current.status).toBe('disconnected');
  });

  it('subscribes to INSERT and UPDATE events on the cards table', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith('cards-changes');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'cards' },
      expect.any(Function)
    );
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'cards' },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('subscribes to INSERT and UPDATE events on the card_parallels table', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'card_parallels' },
      expect.any(Function)
    );
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'card_parallels' },
      expect.any(Function)
    );
  });

  it('sets status to connected on SUBSCRIBED', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate, onStatusChange })
    );

    act(() => {
      mockChannel._simulateStatus('SUBSCRIBED');
    });

    expect(result.current.status).toBe('connected');
    expect(onStatusChange).toHaveBeenCalledWith('connected');
  });

  it('sets status to reconnecting on CHANNEL_ERROR (triggers reconnection)', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate, onStatusChange })
    );

    act(() => {
      mockChannel._simulateStatus('CHANNEL_ERROR');
    });

    expect(result.current.status).toBe('reconnecting');
    expect(onStatusChange).toHaveBeenCalledWith('reconnecting');
  });

  it('sets status to reconnecting on TIMED_OUT (triggers reconnection)', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate, onStatusChange })
    );

    act(() => {
      mockChannel._simulateStatus('TIMED_OUT');
    });

    expect(result.current.status).toBe('reconnecting');
    expect(onStatusChange).toHaveBeenCalledWith('reconnecting');
  });

  it('sets status to disconnected on CLOSED', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    act(() => {
      mockChannel._simulateStatus('CLOSED');
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('calls onCardUpdate when an INSERT event is received', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    act(() => {
      mockChannel._simulateEvent('INSERT', { new: mockCard });
    });

    expect(onCardUpdate).toHaveBeenCalledWith(mockCard);
  });

  it('calls onCardUpdate when an UPDATE event is received', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    act(() => {
      mockChannel._simulateEvent('UPDATE', { new: { ...mockCard, collected: false } });
    });

    expect(onCardUpdate).toHaveBeenCalledWith({ ...mockCard, collected: false });
  });

  it('calls onParallelUpdate when an INSERT event on card_parallels is received', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    act(() => {
      mockChannel._simulateEvent('INSERT', { new: mockParallel, table: 'card_parallels' });
    });

    expect(onParallelUpdate).toHaveBeenCalledWith(mockParallel);
  });

  it('calls onParallelUpdate when an UPDATE event on card_parallels is received', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    act(() => {
      mockChannel._simulateEvent('UPDATE', { new: { ...mockParallel, collected: false }, table: 'card_parallels' });
    });

    expect(onParallelUpdate).toHaveBeenCalledWith({ ...mockParallel, collected: false });
  });

  it('cleans up subscription on unmount', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const { unmount } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  it('works without onStatusChange callback', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    act(() => {
      mockChannel._simulateStatus('SUBSCRIBED');
    });

    expect(result.current.status).toBe('connected');
  });

  it('exposes a retry function', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    expect(result.current.retry).toBeInstanceOf(Function);
  });

  it('retry triggers reconnection when called', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate })
    );

    act(() => {
      result.current.retry();
    });

    // After retry, status should be reconnecting
    expect(result.current.status).toBe('reconnecting');
  });

  it('accepts an onReconnected callback option', () => {
    const onCardUpdate = vi.fn();
    const onParallelUpdate = vi.fn();
    const onReconnected = vi.fn();

    // Should not throw when onReconnected is provided
    const { result } = renderHook(() =>
      useRealtimeSubscription({ supabase: mockSupabase, onCardUpdate, onParallelUpdate, onReconnected })
    );

    expect(result.current.status).toBe('disconnected');
  });
});
