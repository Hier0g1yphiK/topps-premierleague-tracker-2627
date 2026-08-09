import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { AppShell } from '../components/AppShell';
import { saveCardsToCache } from '../lib/offline-cache';
import type { Card } from '../types';

// --- Mock window.matchMedia ---
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// --- Mock Supabase ---
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => {
  const supabase = {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: () => ({
      on: () => ({ on: () => ({ subscribe: () => {} }) }),
      subscribe: () => {},
    }),
    removeChannel: vi.fn(),
  };
  return { supabase };
});

// --- Mock realtime hook to avoid channel subscription complexity ---
vi.mock('../hooks/useRealtimeSubscription', () => ({
  useRealtimeSubscription: () => ({
    status: 'connected' as const,
    retry: vi.fn(),
  }),
}));

vi.mock('../hooks/useServiceWorker', () => ({
  useServiceWorker: () => ({
    needsRefresh: false,
    updateServiceWorker: vi.fn(),
  }),
}));

// --- Helper to create mock cards ---
function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: crypto.randomUUID(),
    user_id: null,
    card_number: 1,
    set_name: 'Base Set',
    set_card_number: '1',
    player: 'Test Player',
    team: 'Test Team',
    notes: null,
    collected: false,
    date_collected: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// --- Setup mock chain for fetching cards ---
function setupSupabaseFetch(cards: Card[]) {
  mockOrder.mockResolvedValue({ data: cards, error: null });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'card_parallels') {
      return {
        select: () => Promise.resolve({ data: [], error: null }),
        upsert: mockUpsert,
        update: mockUpdate,
      };
    }
    return {
      select: () => ({ order: mockOrder }),
      upsert: mockUpsert,
      update: mockUpdate,
    };
  });
  mockEq.mockResolvedValue({ data: null, error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockUpsert.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) });
}

// Store original navigator.onLine descriptor
const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');

beforeEach(() => {
  vi.clearAllMocks();
  // Reset IndexedDB between tests
  // eslint-disable-next-line no-global-assign
  indexedDB = new IDBFactory();
});

afterEach(() => {
  // Restore navigator.onLine
  if (originalOnLineDescriptor) {
    Object.defineProperty(navigator, 'onLine', originalOnLineDescriptor);
  } else {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
  }
  vi.useRealTimers();
});

describe('Integration: CSV import → cards appear in list', () => {
  it('imports a CSV file and shows cards in the list', async () => {
    const importedCards = [
      createMockCard({ id: 'id-1', card_number: 1, set_name: 'Base Set', set_card_number: 'BS1', player: 'Marcus Rashford', team: 'Manchester United' }),
      createMockCard({ id: 'id-2', card_number: 2, set_name: 'Base Set', set_card_number: 'BS2', player: 'Bukayo Saka', team: 'Arsenal' }),
    ];

    // Track fetch call count to return empty first, then imported cards after import
    let fetchCount = 0;
    const mockOrderFn = vi.fn().mockImplementation(() => {
      fetchCount++;
      if (fetchCount <= 1) {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: importedCards, error: null });
    });

    const mockUpsertSelect = vi.fn().mockResolvedValue({
      data: [{ id: 'id-1' }, { id: 'id-2' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'card_parallels') {
        return {
          select: () => Promise.resolve({ data: [], error: null }),
          upsert: () => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }) }),
          update: mockUpdate,
        };
      }
      return {
        select: () => ({ order: mockOrderFn }),
        upsert: () => ({ select: mockUpsertSelect }),
        update: mockUpdate,
      };
    });

    render(<AppShell />);

    // Wait for initial load to finish (empty state)
    await waitFor(() => {
      expect(screen.getByText(/no cards available/i)).toBeInTheDocument();
    });

    // Open the import modal
    const importButton = screen.getByLabelText('Import CSV');
    fireEvent.click(importButton);

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText(/import cards from csv/i)).toBeInTheDocument();
    });

    // Create a CSV file
    const csvContent = 'card_number,set_name,set_card_number,player,team,notes\n1,Base Set,BS1,Marcus Rashford,Manchester United,\n2,Base Set,BS2,Bukayo Saka,Arsenal,';
    const csvFile = new File([csvContent], 'cards.csv', { type: 'text/csv' });

    // Select the CSV file
    const fileInput = screen.getByLabelText(/choose csv file/i);
    fireEvent.change(fileInput, { target: { files: [csvFile] } });

    // Wait for import to complete and cards to appear
    await waitFor(() => {
      expect(screen.getByText('Marcus Rashford')).toBeInTheDocument();
      expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});

describe('Integration: Toggle collected → stats update', () => {
  it('toggles a card and updates the stats', async () => {
    const cards = [
      createMockCard({ id: 'card-1', card_number: 1, player: 'Player One', team: 'Team A', collected: false }),
      createMockCard({ id: 'card-2', card_number: 2, player: 'Player Two', team: 'Team B', collected: true, date_collected: '2024-01-01' }),
      createMockCard({ id: 'card-3', card_number: 3, player: 'Player Three', team: 'Team C', collected: false }),
    ];

    setupSupabaseFetch(cards);

    // Mock update to succeed
    mockEq.mockResolvedValue({ data: null, error: null });

    render(<AppShell />);

    // Wait for cards to load
    await waitFor(() => {
      expect(screen.getByText('Player One')).toBeInTheDocument();
    });

    // Verify initial stats: 1 out of 3 collected
    expect(screen.getByText('1 / 3 collected')).toBeInTheDocument();

    // Click on the first uncollected card row to toggle it
    const markAsCollectedButtons = screen.getAllByLabelText('Mark as collected');
    await act(async () => {
      fireEvent.click(markAsCollectedButtons[0]);
    });

    // Stats should update optimistically: 2/3 collected
    await waitFor(() => {
      expect(screen.getByText('2 / 3 collected')).toBeInTheDocument();
    });

    // Verify that Supabase update was called with the correct card id
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'card-1');
  });
});

describe('Integration: Filter + sort combined', () => {
  it('filters by search text and sorts by column', async () => {
    vi.useFakeTimers();

    const cards = [
      createMockCard({ id: 'c1', card_number: 3, player: 'Zack Aarons', team: 'Newcastle', set_name: 'Base Set', set_card_number: '3' }),
      createMockCard({ id: 'c2', card_number: 1, player: 'Aaron Ramsdale', team: 'Arsenal', set_name: 'Base Set', set_card_number: '1' }),
      createMockCard({ id: 'c3', card_number: 2, player: 'Bruno Fernandes', team: 'Manchester United', set_name: 'Gold Set', set_card_number: '2' }),
    ];

    setupSupabaseFetch(cards);

    await act(async () => {
      render(<AppShell />);
    });

    // Wait for cards to load
    await vi.waitFor(() => {
      expect(screen.getByText('Zack Aarons')).toBeInTheDocument();
      expect(screen.getByText('Aaron Ramsdale')).toBeInTheDocument();
      expect(screen.getByText('Bruno Fernandes')).toBeInTheDocument();
    });

    // Type in the search input to filter
    const searchInput = screen.getByLabelText(/search by player or team/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Aaron' } });
    });

    // Advance past the 300ms debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // After debounce, only matching cards should be shown
    await vi.waitFor(() => {
      expect(screen.getByText('Zack Aarons')).toBeInTheDocument();
      expect(screen.getByText('Aaron Ramsdale')).toBeInTheDocument();
      expect(screen.queryByText('Bruno Fernandes')).not.toBeInTheDocument();
    });

    // Now sort by player column
    await act(async () => {
      const playerHeader = screen.getByRole('columnheader', { name: /player/i });
      fireEvent.click(playerHeader);
    });

    // Verify the order - Aaron Ramsdale should come before Zack Aarons (ascending by player)
    await vi.waitFor(() => {
      const playerCells = screen.getAllByText(/Aaron Ramsdale|Zack Aarons/);
      expect(playerCells[0]).toHaveTextContent('Aaron Ramsdale');
      expect(playerCells[1]).toHaveTextContent('Zack Aarons');
    });
  });
});

describe('Integration: Offline mode serves cached data', () => {
  it('displays cached cards and offline banner when offline', async () => {
    const cachedCards = [
      createMockCard({ id: 'cached-1', card_number: 10, player: 'Cached Player One', team: 'Cached Team', set_name: 'Cache Set', set_card_number: '10' }),
      createMockCard({ id: 'cached-2', card_number: 20, player: 'Cached Player Two', team: 'Cached Team', set_name: 'Cache Set', set_card_number: '20' }),
    ];

    // Pre-populate IndexedDB cache
    await saveCardsToCache(cachedCards);

    // Set navigator.onLine to false before rendering
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
      writable: true,
    });

    // Mock Supabase to fail (simulates network error)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'card_parallels') {
        return {
          select: () => Promise.resolve({ data: null, error: { message: 'Network error' } }),
          upsert: mockUpsert,
          update: mockUpdate,
        };
      }
      return {
        select: () => ({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
        }),
        upsert: mockUpsert,
        update: mockUpdate,
      };
    });

    render(<AppShell />);

    // Verify offline banner is shown
    await waitFor(() => {
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    // Verify cached cards are displayed (from IndexedDB fallback)
    await waitFor(() => {
      expect(screen.getByText('Cached Player One')).toBeInTheDocument();
      expect(screen.getByText('Cached Player Two')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
