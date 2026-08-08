import { useEffect, useState, useRef, useCallback } from 'react';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Card } from '../types';
import { createReconnectionManager } from '../lib/reconnection';
import type { ReconnectionManager } from '../lib/reconnection';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface UseRealtimeSubscriptionOptions {
  supabase: SupabaseClient;
  onCardUpdate: (card: Card) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onReconnected?: () => void;
}

export interface UseRealtimeSubscriptionResult {
  status: ConnectionStatus;
  retry: () => void;
}

export function useRealtimeSubscription({
  supabase,
  onCardUpdate,
  onStatusChange,
  onReconnected,
}: UseRealtimeSubscriptionOptions): UseRealtimeSubscriptionResult {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectionManagerRef = useRef<ReconnectionManager | null>(null);
  const onCardUpdateRef = useRef(onCardUpdate);
  const onStatusChangeRef = useRef(onStatusChange);
  const onReconnectedRef = useRef(onReconnected);

  // Keep refs up to date to avoid stale closures
  useEffect(() => {
    onCardUpdateRef.current = onCardUpdate;
  }, [onCardUpdate]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onReconnectedRef.current = onReconnected;
  }, [onReconnected]);

  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChangeRef.current?.(newStatus);
  }, []);

  const subscribeChannel = useCallback((supabaseClient: SupabaseClient): RealtimeChannel => {
    const channel = supabaseClient
      .channel('cards-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cards',
        },
        (payload) => {
          onCardUpdateRef.current(payload.new as Card);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cards',
        },
        (payload) => {
          onCardUpdateRef.current(payload.new as Card);
        }
      )
      .subscribe((subscriptionStatus) => {
        switch (subscriptionStatus) {
          case 'SUBSCRIBED':
            updateStatus('connected');
            // Stop any ongoing reconnection attempts on successful subscription
            reconnectionManagerRef.current?.stop();
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            // Trigger reconnection on disconnect events
            startReconnection(supabaseClient);
            break;
          case 'CLOSED':
            updateStatus('disconnected');
            break;
        }
      });

    return channel;
  }, [updateStatus]);

  const startReconnection = useCallback((supabaseClient: SupabaseClient) => {
    // Don't start reconnection if already in progress
    if (reconnectionManagerRef.current) {
      return;
    }

    const manager = createReconnectionManager(
      async () => {
        // Remove old channel before reconnecting
        if (channelRef.current) {
          supabaseClient.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Try subscribing again
        return new Promise<boolean>((resolve) => {
          const channel = supabaseClient
            .channel('cards-changes')
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'cards' },
              (payload) => {
                onCardUpdateRef.current(payload.new as Card);
              }
            )
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'cards' },
              (payload) => {
                onCardUpdateRef.current(payload.new as Card);
              }
            )
            .subscribe((subscriptionStatus) => {
              if (subscriptionStatus === 'SUBSCRIBED') {
                channelRef.current = channel;
                resolve(true);
              } else if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') {
                supabaseClient.removeChannel(channel);
                resolve(false);
              }
            });
        });
      },
      {
        onReconnecting: () => {
          updateStatus('reconnecting');
        },
        onReconnected: () => {
          updateStatus('connected');
          reconnectionManagerRef.current = null;
          // Notify consumer to fetch latest data to reconcile missed updates
          onReconnectedRef.current?.();
        },
        onFailed: () => {
          updateStatus('disconnected');
          reconnectionManagerRef.current = null;
        },
      }
    );

    reconnectionManagerRef.current = manager;
    manager.start();
  }, [updateStatus]);

  const retry = useCallback(() => {
    // Manual retry: reset and start fresh
    if (reconnectionManagerRef.current) {
      reconnectionManagerRef.current.stop();
      reconnectionManagerRef.current = null;
    }
    startReconnection(supabase);
  }, [supabase, startReconnection]);

  useEffect(() => {
    const channel = subscribeChannel(supabase);
    channelRef.current = channel;

    return () => {
      // Cleanup: stop reconnection and remove channel
      if (reconnectionManagerRef.current) {
        reconnectionManagerRef.current.stop();
        reconnectionManagerRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, subscribeChannel]);

  return { status, retry };
}
