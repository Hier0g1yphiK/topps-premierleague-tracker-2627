import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Card, FilterState, SortConfig, SortColumn } from '../types';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToggleCollected } from '../hooks/useToggleCollected';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { applyFilters, extractSetNames } from '../lib/filters';
import { sortCards } from '../lib/sort';
import { saveCardsToCache, loadCardsFromCache } from '../lib/offline-cache';
import { StatsBar } from './StatsBar';
import { FilterBar } from './FilterBar';
import { CardList } from './CardList';
import { ImportModal } from './ImportModal';
import { OfflineBanner } from './OfflineBanner';
import { ConnectionIndicator } from './ConnectionIndicator';
import { UpdatePrompt } from './UpdatePrompt';

const DEFAULT_FILTERS: FilterState = {
  searchText: '',
  setName: null,
  collectedStatus: 'all',
};

const DEFAULT_SORT_CONFIG: SortConfig = {
  column: 'card_number',
  direction: 'asc',
};

export function AppShell() {
  const [cards, setCards] = useState<Card[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Hooks
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const { needsRefresh, updateServiceWorker } = useServiceWorker();

  // Fetch all cards on mount
  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('card_number');

    if (!error && data) {
      setCards(data as Card[]);
      // Cache cards for offline use
      saveCardsToCache(data as Card[]).catch(() => {
        // Silently ignore cache save failures
      });
    } else {
      // On fetch failure, try loading from offline cache
      try {
        const cached = await loadCardsFromCache();
        if (cached.length > 0) {
          setCards(cached);
        }
      } catch {
        // No cached data available
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Realtime card update handler
  const handleCardUpdate = useCallback((updatedCard: Card) => {
    setCards((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === updatedCard.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...updatedCard };
        return updated;
      }
      return [...prev, updatedCard];
    });
  }, []);

  // Realtime subscription
  const { status: connectionStatus, retry } = useRealtimeSubscription({
    supabase,
    onCardUpdate: handleCardUpdate,
    onReconnected: async () => {
      // Re-fetch cards to reconcile any missed updates
      const { data } = await supabase
        .from('cards')
        .select('*')
        .order('card_number');
      if (data) {
        setCards(data as Card[]);
        saveCardsToCache(data as Card[]).catch(() => {});
      }
    },
  });

  // Toggle collected hook
  const { toggleCard, togglingIds } = useToggleCollected(supabase, setCards);

  // Sort handling: toggle direction if same column, otherwise switch to asc
  const handleSortChange = useCallback((column: SortColumn) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  }, []);

  // Import complete handler: re-fetch all cards
  const handleImportComplete = useCallback(() => {
    fetchCards();
  }, [fetchCards]);

  // Derived state via useMemo
  const filteredCards = useMemo(
    () => applyFilters(cards, filters),
    [cards, filters]
  );

  const sortedCards = useMemo(
    () => sortCards(filteredCards, sortConfig),
    [filteredCards, sortConfig]
  );

  const setNames = useMemo(() => extractSetNames(cards), [cards]);

  const hasActiveFilters = useMemo(
    () =>
      filters.searchText !== '' ||
      filters.setName !== null ||
      filters.collectedStatus !== 'all',
    [filters]
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Update prompt */}
      <UpdatePrompt show={needsRefresh} onReload={updateServiceWorker} />

      {/* Offline banner */}
      <OfflineBanner isOffline={isOffline} />

      {/* Header */}
      <header className="bg-purple-700 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">
            Premier League Card Tracker
          </h1>
          <div className="flex items-center gap-3">
            <ConnectionIndicator status={connectionStatus} onRetry={retry} />
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center px-3 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-700 min-h-[44px] min-w-[44px]"
              aria-label="Import CSV"
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-4">
        {/* StatsBar */}
        <StatsBar cards={cards} />

        {/* FilterBar */}
        <section aria-label="Filters" className="bg-white rounded-lg shadow p-4">
          <FilterBar
            setNames={setNames}
            filters={filters}
            onFilterChange={setFilters}
          />
        </section>

        {/* CardList */}
        <section aria-label="Card list" className="bg-white rounded-lg shadow p-4">
          <CardList
            cards={sortedCards}
            sortConfig={sortConfig}
            onSortChange={handleSortChange}
            onToggleCollected={toggleCard}
            isLoading={isLoading}
            togglingIds={togglingIds}
            hasActiveFilters={hasActiveFilters}
          />
        </section>
      </main>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
