# Implementation Plan: Premier League Tracker

## Overview

Build a personal web application for tracking a Topps Premier League 2026/27 trading card collection using React + Vite + Tailwind CSS + Supabase. The implementation proceeds from project scaffolding and database schema, through core data layer and UI components, to real-time sync and PWA support. Each task produces working, integrated code that builds on prior steps.

## Tasks

- [x] 1. Set up project structure and core configuration
  - [x] 1.1 Scaffold Vite + React + TypeScript project with Tailwind CSS
    - Initialise Vite project with React-TS template
    - Install dependencies: `@supabase/supabase-js`, `tailwindcss`, `postcss`, `autoprefixer`
    - Configure Tailwind CSS with content paths
    - Create `src/lib/supabase.ts` with Supabase client initialisation (env vars for URL and anon key)
    - Create `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` placeholders
    - _Requirements: 7.5_

  - [x] 1.2 Define TypeScript interfaces and types
    - Create `src/types/index.ts` with `Card`, `FilterState`, `SortConfig`, `SortColumn`, `ImportSummary`, `ImportError`, `RealtimeConfig` interfaces as specified in the design
    - _Requirements: 1.5, 2.1_

  - [x] 1.3 Set up Vitest and fast-check testing framework
    - Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `fast-check`
    - Create `vitest.config.ts` with jsdom environment
    - Create a sample test to verify the setup works
    - _Requirements: (testing infrastructure)_

- [x] 2. Implement database schema and migration
  - [x] 2.1 Create Supabase database migration for Card_Table
    - Create `supabase/migrations/` directory structure
    - Write SQL migration creating the `cards` table with all columns: id (UUID PK), user_id (UUID nullable), card_number (integer), set_name (text), set_card_number (text), player (text), team (text), notes (text nullable), collected (boolean default false), date_collected (date nullable), created_at (timestamptz)
    - Add UNIQUE constraint on (user_id, card_number)
    - Add partial unique index on card_number WHERE user_id IS NULL
    - Add B-tree index on set_name
    - Add pg_trgm extension and GIN trigram indexes on player and team
    - Add B-tree index on user_id
    - _Requirements: 1.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 3. Implement CSV import functionality
  - [x] 3.1 Create CSV parser and validation module
    - Create `src/lib/csv-import.ts`
    - Implement `parseCSV(fileContent: string): ParsedRow[]` — parses CSV text into row objects
    - Implement `validateRow(row, rowIndex): { valid: boolean; error?: ImportError }` — checks card_number is positive integer, set_name and player are non-whitespace
    - Implement `processCSVFile(file: File): Promise<{ validRows: ParsedRow[], errors: ImportError[] }>` — orchestrates parsing + validation
    - Handle non-CSV files (wrong type, unparseable content) with appropriate error
    - Handle header-only CSV (no data rows) with informational message
    - _Requirements: 1.1, 1.3, 1.6, 1.7_

  - [x] 3.2 Write property test for CSV import partition invariant
    - **Property 1: CSV Import Partition Invariant**
    - Generate random arrays of valid, invalid, and duplicate CSV rows
    - Verify that inserted + skipped + rejected = total rows for every generated input
    - Verify valid unique rows are inserted, existing card_numbers are skipped, and invalid rows are rejected with reasons
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [x] 3.3 Implement ImportModal component
    - Create `src/components/ImportModal.tsx`
    - File picker input restricted to .csv files
    - On file select: validate file type, parse CSV, validate rows, batch upsert valid rows to Supabase (ON CONFLICT skip duplicates)
    - Display import summary (inserted, skipped, rejected counts) and per-row error list
    - Handle loading/processing state with spinner
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 4. Implement core utility functions (filtering, sorting, stats)
  - [x] 4.1 Implement sort utility
    - Create `src/lib/sort.ts`
    - Implement `sortCards(cards: Card[], config: SortConfig): Card[]` — sorts by any column ascending/descending
    - Default sort: card_number ascending
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 4.2 Write property test for sort correctness
    - **Property 2: Sort Correctness**
    - Generate random card arrays and sort configurations
    - Verify every adjacent pair in result satisfies ordering constraint
    - Verify default sort is card_number ascending
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [x] 4.3 Implement filter utilities
    - Create `src/lib/filters.ts`
    - Implement `filterBySearch(cards: Card[], searchText: string): Card[]` — case-insensitive substring match on player OR team
    - Implement `filterBySetName(cards: Card[], setName: string | null): Card[]` — null means all sets
    - Implement `filterByCollectedStatus(cards: Card[], status: 'all' | 'collected' | 'missing'): Card[]`
    - Implement `applyFilters(cards: Card[], filters: FilterState): Card[]` — composes all filters with AND logic
    - Implement `extractSetNames(cards: Card[]): string[]` — distinct, sorted alphabetically case-insensitive
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.4 Write property test for text search filter correctness
    - **Property 3: Text Search Filter Correctness**
    - Generate random card arrays and search strings (up to 100 chars)
    - Verify filtered result contains exactly cards with player OR team containing search string (case-insensitive substring)
    - **Validates: Requirements 3.1**

  - [x] 4.5 Write property test for composite filter AND logic
    - **Property 4: Composite Filter AND Logic**
    - Generate random card arrays and filter combinations
    - Verify result satisfies ALL active criteria simultaneously
    - Verify that clearing all filters returns the full array
    - **Validates: Requirements 3.3, 3.4, 3.5**

  - [x] 4.6 Write property test for set name extraction
    - **Property 5: Set Name Extraction**
    - Generate random card arrays
    - Verify extracted set names are exactly the distinct set_name values, sorted alphabetically (case-insensitive), with no duplicates
    - **Validates: Requirements 3.2**

  - [x] 4.7 Implement stats computation utilities
    - Create `src/lib/stats.ts`
    - Implement `computeOverallStats(cards: Card[]): { collected: number, total: number, percentage: string }` — percentage rounded to 1 decimal place, handles empty array as "0.0%"
    - Implement `computePerSetBreakdown(cards: Card[]): { setName: string, collected: number, total: number }[]` — grouped by set_name, ordered by minimum card_number in set ascending
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 4.8 Write property test for overall stats computation
    - **Property 9: Overall Stats Computation**
    - Generate random card arrays
    - Verify collected count equals cards where collected=true, total equals array length, percentage equals (collected/total*100) rounded to 1 decimal
    - Verify empty array produces "0 / 0 collected" and "0.0%"
    - **Validates: Requirements 6.1, 6.2, 6.5**

  - [x] 4.9 Write property test for per-set breakdown
    - **Property 10: Per-Set Breakdown**
    - Generate random card arrays
    - Verify grouping by set_name is accurate (collected and total counts per group)
    - Verify ordering by minimum card_number within each set ascending
    - **Validates: Requirements 6.3**

- [x] 5. Checkpoint - Core utilities verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement collection toggle logic
  - [x] 6.1 Create toggle collected service
    - Create `src/lib/toggle-collected.ts`
    - Implement `createToggleState(card: Card): { collected: boolean, date_collected: string | null }` — flips collected, sets date_collected to today (ISO) when becoming collected or null when uncollected
    - Implement `persistToggle(supabase, cardId: string, collected: boolean, dateCollected: string | null): Promise<void>` — PATCH to Supabase
    - Implement `revertToggle(card: Card, previousState: { collected: boolean, date_collected: string | null }): Card` — restores previous values on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.2 Write property test for toggle state transition
    - **Property 6: Toggle State Transition**
    - Generate random cards
    - Verify toggling flips boolean and sets/clears date_collected correctly
    - Verify double-toggle returns to collected=false and date_collected=null
    - **Validates: Requirements 4.1, 4.2**

  - [x] 6.3 Write property test for toggle revert on failure
    - **Property 7: Toggle Revert on Failure**
    - Generate random cards in any collected state
    - Simulate persist failure, verify card state reverts to exact pre-toggle values
    - **Validates: Requirements 4.4**

  - [x] 6.4 Implement toggle queue for rapid taps
    - Add queuing logic in `src/lib/toggle-collected.ts` or a dedicated `src/hooks/useToggleCollected.ts` hook
    - While a request is in-flight for a card, queue subsequent taps and apply only the final state after the in-flight request completes
    - _Requirements: 4.5_

- [x] 7. Implement Realtime subscription and reconnection
  - [x] 7.1 Create Realtime subscription hook
    - Create `src/hooks/useRealtimeSubscription.ts`
    - Subscribe to INSERT/UPDATE events on the cards table for collected and date_collected columns
    - On card update event: merge updated card into local state
    - Return connection status ('connected' | 'reconnecting' | 'disconnected')
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Implement exponential backoff reconnection logic
    - On disconnect: attempt reconnection with delays 1s, 2s, 4s, 8s, 16s (1000 * 2^n ms)
    - Track retry count (max 5 attempts)
    - On reconnection success: fetch latest card data to reconcile missed updates
    - On all retries exhausted: set status to 'disconnected', expose manual retry function
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 7.3 Write property test for reconnection backoff timing
    - **Property 8: Reconnection Backoff Timing**
    - Generate retry attempt numbers 0-4
    - Verify delay equals 1000 * 2^n milliseconds for each attempt
    - **Validates: Requirements 5.3**

- [x] 8. Build UI components
  - [x] 8.1 Implement AppShell layout component
    - Create `src/components/AppShell.tsx`
    - Root layout with Supabase client context
    - Manage global state: cards, filters, sortConfig, connectionStatus, isOffline, isLoading
    - Fetch all cards on mount, establish Realtime subscription
    - Derive filtered/sorted cards and stats via useMemo
    - _Requirements: 2.1, 5.1_

  - [x] 8.2 Implement StatsBar component
    - Create `src/components/StatsBar.tsx`
    - Display "X / Y collected" and percentage from full unfiltered card array
    - Display per-set breakdown (collapsible on mobile)
    - Update within 1 second of collection status changes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.3 Implement FilterBar component
    - Create `src/components/FilterBar.tsx`
    - Free-text search input (max 100 chars) with 300ms debounce using `useDebouncedValue` hook
    - Set name dropdown (alphabetical, "All Sets" default)
    - Collected status dropdown ("All", "Collected", "Missing")
    - Stack controls vertically below 768px, horizontal above
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 7.4_

  - [x] 8.4 Implement CardList and CardRow components
    - Create `src/components/CardList.tsx` and `src/components/CardRow.tsx`
    - Table layout at ≥768px with sortable column headers (click to sort asc, click again for desc) with sort indicators
    - Stacked card layout at <768px with 44x44px tap targets and 8px spacing
    - Visual distinction for collected vs uncollected (background colour or icon)
    - Loading spinner state, empty state messages (no cards / no filter matches)
    - Tap-to-toggle collected status on each row
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 7.1, 7.2, 7.3_

  - [x] 8.5 Implement OfflineBanner and ConnectionIndicator components
    - Create `src/components/OfflineBanner.tsx` — persistent top banner when offline, auto-hides within 5s of reconnection
    - Create `src/components/ConnectionIndicator.tsx` — shows 'connected', 'reconnecting', or 'disconnected' with manual retry button
    - Create `src/hooks/useOnlineStatus.ts` — tracks navigator.onLine with event listeners
    - _Requirements: 5.3, 5.5, 8.5, 8.6_

- [x] 9. Checkpoint - UI components integrated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement PWA support
  - [x] 10.1 Create web app manifest and icons
    - Create `public/manifest.json` with name, short_name, icons (192px and 512px), start_url ("/"), display "standalone", theme_color
    - Add manifest link to `index.html`
    - Add placeholder icon files (or generate from a source image)
    - _Requirements: 8.1, 8.4_

  - [x] 10.2 Implement Service Worker with cache-first strategy
    - Create `src/service-worker.ts` (or use vite-plugin-pwa)
    - Cache application shell (HTML, CSS, JS) with cache-first strategy
    - Register service worker in `src/main.tsx`
    - _Requirements: 8.2_

  - [x] 10.3 Implement IndexedDB card data caching for offline use
    - Create `src/lib/offline-cache.ts`
    - On successful card data fetch: store cards in IndexedDB
    - When offline: load cards from IndexedDB cache instead of showing empty state
    - _Requirements: 8.3_

  - [x] 10.4 Implement Service Worker update detection and prompt
    - Create `src/hooks/useServiceWorker.ts` — detects new SW version via `updatefound` event
    - Create `src/components/UpdatePrompt.tsx` — inline prompt to reload when update available
    - _Requirements: 8.7_

- [x] 11. Wire everything together and final integration
  - [x] 11.1 Integrate all components in AppShell
    - Wire ImportModal trigger (button in header/nav)
    - Connect FilterBar → filter state → CardList display
    - Connect sort column clicks → sort state → CardList display
    - Connect toggle clicks → optimistic update → Supabase persist → error handling/revert
    - Connect Realtime events → local state updates → StatsBar recalculation
    - Connect online/offline status → OfflineBanner visibility
    - Connect connection status → ConnectionIndicator display
    - Ensure service worker update → UpdatePrompt display
    - _Requirements: 2.1, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.4, 8.5, 8.6, 8.7_

  - [x] 11.2 Write integration tests for end-to-end flows
    - Test CSV import → cards appear in list
    - Test toggle collected → stats update → realtime event fired
    - Test filter + sort combined behaviour
    - Test offline mode serves cached data
    - _Requirements: 1.1, 2.1, 3.4, 4.1, 6.4, 8.3_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The app fetches all ~1,137 cards on load and performs filtering/sorting client-side for instant UX
- Supabase environment variables must be configured before tasks involving database operations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "4.1", "4.3", "4.7"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "4.4", "4.5", "4.6", "4.8", "4.9", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3", "8.4", "8.5"] },
    { "id": 8, "tasks": ["10.1", "10.2", "10.3", "10.4"] },
    { "id": 9, "tasks": ["11.1"] },
    { "id": 10, "tasks": ["11.2"] }
  ]
}
```
