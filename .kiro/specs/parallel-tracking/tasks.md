# Implementation Plan: Parallel Tracking

## Overview

This plan implements parallel variant tracking across the entire stack: database schema, TypeScript types, pure logic modules, React hooks, UI components, offline caching, realtime subscriptions, and tests. Each task builds incrementally — types and data layer first, then logic, then hooks, then UI, then integration wiring.

## Tasks

- [x] 1. Define types and database schema
  - [x] 1.1 Add new TypeScript types to `src/types/index.ts`
    - Add `CardParallel` interface with fields: id, card_id, parallel_name, collected, date_collected, created_at
    - Add `ParallelFilterStatus` type: `'all' | 'has_uncollected' | 'all_collected'`
    - Update `FilterState` to include `parallelStatus: ParallelFilterStatus`
    - Update `ImportSummary` to include `parallelsCreated: number`
    - _Requirements: 1.1, 1.2, 1.3, 10.2_

  - [x] 1.2 Create SQL migration file for `card_parallels` table
    - Create `supabase/migrations/` directory and migration SQL file
    - Define `card_parallels` table with id, card_id, parallel_name, collected, date_collected, created_at
    - Add UNIQUE constraint on (card_id, parallel_name)
    - Add index on card_id
    - Enable RLS with user_id-based policy matching cards table
    - Add table to supabase_realtime publication
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 9.1_

- [ ] 2. Implement pure logic modules for parallels
  - [x] 2.1 Create `src/lib/parallel-sort.ts`
    - Implement `sortParallels(parallels: CardParallel[]): CardParallel[]`
    - Collected items first, uncollected second, alphabetical by parallel_name within each group (case-insensitive)
    - _Requirements: 2.7_

  - [-] 2.2 Write property test for parallel sort ordering
    - Create `src/lib/__tests__/parallel-sort.property.test.ts`
    - **Property 1: Parallel sort ordering** — collected items always precede uncollected; alphabetical within each group
    - **Validates: Requirements 2.7**

  - [x] 2.3 Create `src/lib/parallel-toggle.ts`
    - Implement `createParallelToggleState(parallel: CardParallel)` — returns flipped collected and appropriate date_collected
    - Implement `persistParallelToggle(supabase, parallelId, collected, dateCollected)` — UPDATE card_parallels via Supabase
    - Implement `revertParallelToggle(parallel, previousState)` — returns CardParallel with reverted state
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [-] 2.4 Write property test for parallel toggle state transition
    - Create `src/lib/__tests__/parallel-toggle-state.property.test.ts`
    - **Property 2: Parallel toggle state transition** — toggling flips collected, sets date_collected to today when collected or null when uncollected
    - **Validates: Requirements 3.2, 3.3**

  - [x] 2.5 Create `src/lib/parallel-filters.ts`
    - Implement `filterByParallelStatus(cards, parallelsMap, status)` — filters cards by parallel completion
    - "has_uncollected": cards with at least one uncollected parallel
    - "all_collected": cards where all parallels are collected
    - "all": no filtering
    - _Requirements: 10.2, 10.3, 10.4_

  - [-] 2.6 Write property tests for parallel filters
    - Create `src/lib/__tests__/parallel-filters.property.test.ts`
    - **Property 13: Has uncollected parallels** — every result card has at least one uncollected parallel; every excluded card has all collected
    - **Property 14: All parallels collected** — every result card has all parallels collected; every excluded card has at least one uncollected
    - **Validates: Requirements 10.3, 10.4**

  - [x] 2.7 Add card-level status derivation utility
    - Create `deriveCardCollectedStatus(parallels: CardParallel[]): boolean` in `src/lib/parallel-filters.ts` or a dedicated file
    - Returns true if and only if a "Base" parallel exists with collected === true
    - _Requirements: 4.1, 4.2_

  - [-] 2.8 Write property test for card-level status derivation
    - Create `src/lib/__tests__/card-level-status.property.test.ts`
    - **Property 3: Card-level status derivation from Base parallel** — true iff Base parallel exists and is collected
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [~] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Extend stats module for parallel statistics
  - [-] 4.1 Add parallel stats functions to `src/lib/stats.ts`
    - Add `ParallelStats` and `SetParallelBreakdown` interfaces
    - Implement `computeParallelStats(parallels: CardParallel[]): ParallelStats` — totalCollected, totalAvailable, percentage
    - Implement `computePerSetParallelBreakdown(cards, parallels): SetParallelBreakdown[]` — per-set parallel counts
    - _Requirements: 5.1, 5.2, 5.4_

  - [~] 4.2 Write property tests for parallel statistics
    - Create `src/lib/__tests__/parallel-stats.property.test.ts`
    - **Property 4: Overall parallel statistics aggregation** — totalCollected equals count of collected parallels, totalAvailable equals array length, correct percentage
    - **Property 5: Per-set parallel statistics** — grouped counts match per-set filtered totals
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 5. Update CSV import for parallel support
  - [~] 5.1 Update `src/lib/csv-import.ts` to support parallel column
    - Extend `ParsedRow` with `parallel_name: string` field
    - Update header validation to accept optional "parallel" column
    - Accept "set" as alias for "set_name" (backwards compatibility)
    - Default missing/empty parallel value to "Base"
    - Validate parallel_name is non-empty after trim
    - Handle quoted fields with commas in parallel column (existing parser already handles this)
    - _Requirements: 6.1, 6.2, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [~] 5.2 Write property tests for CSV import with parallels
    - Create `src/lib/__tests__/csv-import-parallels.property.test.ts`
    - **Property 6: CSV import partition invariant** — inserted + skipped + rejected === N
    - **Property 7: CSV card deduplication** — card count equals distinct card_number count
    - **Property 8: CSV parallel deduplication** — parallel count equals distinct (card_number, parallel_name) pairs
    - **Property 9: Empty parallel name defaults to "Base"** — empty/whitespace parallel becomes "Base"
    - **Property 10: CSV import/export round-trip** — import→export→import produces equivalent state
    - **Property 11: Parser accepts special characters in parallel names** — forward slashes, ampersands, etc.
    - **Property 12: Parser handles quoted fields with internal commas** — quoted parallel names with commas parse correctly
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.5**

- [ ] 6. Update offline cache for parallel data
  - [~] 6.1 Update `src/lib/offline-cache.ts` for version 2 schema
    - Bump DB_VERSION from 1 to 2
    - Add `card-parallels` object store in `onupgradeneeded` (version < 2 branch)
    - Add `pending-parallel-toggles` object store with autoIncrement key
    - Implement `saveParallelsToCache(parallels: CardParallel[]): Promise<void>`
    - Implement `loadParallelsFromCache(): Promise<CardParallel[]>`
    - Implement `savePendingParallelToggle(toggle): Promise<void>` and `loadPendingParallelToggles(): Promise<PendingToggle[]>` and `clearPendingParallelToggles(): Promise<void>`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [~] 6.2 Write integration test for offline cache upgrade
    - Create `src/lib/__tests__/offline-cache.integration.test.ts`
    - Test IndexedDB version upgrade from 1 to 2 preserves existing card data
    - Test save/load parallel data
    - Test pending toggle queue operations
    - _Requirements: 8.1, 8.2, 8.3_

- [~] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement hooks for parallel toggle and realtime
  - [~] 8.1 Create `src/hooks/useToggleParallel.ts`
    - Implement optimistic toggle with in-flight tracking and queued state (mirror useToggleCollected pattern)
    - Track `togglingIds: Set<string>` for loading indicators
    - Persist via `persistParallelToggle` from parallel-toggle.ts
    - Revert on failure via `revertParallelToggle`
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [~] 8.2 Update `src/hooks/useRealtimeSubscription.ts` for parallel events
    - Add `onParallelUpdate: (parallel: CardParallel) => void` to options interface
    - Subscribe to INSERT and UPDATE events on `card_parallels` table in the same channel
    - Update reconnection logic to include parallel subscriptions
    - _Requirements: 9.1, 9.2, 9.3_

  - [~] 8.3 Write unit tests for useToggleParallel hook
    - Create `src/hooks/useToggleParallel.test.ts`
    - Test optimistic update, revert on failure, queue behavior for rapid toggles
    - _Requirements: 3.1, 3.5, 3.6_

- [ ] 9. Implement ParallelPanel and ParallelItem components
  - [~] 9.1 Create `src/components/ParallelItem.tsx`
    - Render parallel_name with collected/uncollected indicator
    - Toggle button meeting 44x44px minimum tap target
    - Show loading spinner when isToggling is true
    - Keyboard accessible (Enter/Space to toggle)
    - _Requirements: 2.4, 3.6, 3.7_

  - [~] 9.2 Create `src/components/ParallelPanel.tsx`
    - Render sorted list of ParallelItem components (collected first, then uncollected, alphabetical within groups)
    - Accept `isExpanded` prop to show/hide panel content
    - Accessible container with appropriate aria attributes
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.7_

  - [~] 9.3 Write unit tests for ParallelPanel and ParallelItem
    - Create `src/components/ParallelPanel.test.tsx` and `src/components/ParallelItem.test.tsx`
    - Test expand/collapse rendering, keyboard navigation, tap target sizing, toggle interaction, loading state
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 3.6, 3.7_

- [ ] 10. Update CardRow components with expand/collapse and parallel count
  - [~] 10.1 Update `src/components/CardRow.tsx` (both Desktop and Mobile variants)
    - Add expand/collapse button (chevron icon) meeting 44x44px tap target
    - Display parallel count indicator (e.g., "3/38") on each card row
    - Manage local `isExpanded` state per row
    - Render `ParallelPanel` when expanded
    - Card-level toggle delegates to toggling the "Base" parallel
    - Keyboard accessible expand/collapse (Enter/Space)
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 4.3_

  - [~] 10.2 Update unit tests for CardRow
    - Update `src/components/CardRow.test.tsx` (or create if not exists)
    - Test parallel count display, expand/collapse, Base toggle delegation
    - _Requirements: 2.1, 2.2, 4.3_

- [ ] 11. Update FilterBar with parallel status filter
  - [~] 11.1 Update `src/components/FilterBar.tsx`
    - Add fourth dropdown: "Parallel Status" with options "All", "Has uncollected parallels", "All parallels collected"
    - Wire new filter value to FilterState.parallelStatus
    - Ensure existing search, set, and collected status filters continue working unchanged
    - _Requirements: 10.1, 10.2_

  - [~] 11.2 Write unit test for FilterBar parallel status dropdown
    - Update/create `src/components/FilterBar.test.tsx`
    - Test new dropdown renders, selection updates state, existing filters unaffected
    - _Requirements: 10.1, 10.2_

- [ ] 12. Update StatsBar with parallel statistics
  - [~] 12.1 Update `src/components/StatsBar.tsx`
    - Display secondary metric: "X / Y parallels collected" with progress bar
    - Include per-set parallel counts in expanded breakdown view
    - _Requirements: 5.1, 5.3, 5.4_

  - [~] 12.2 Write unit test for StatsBar parallel metrics
    - Update/create `src/components/StatsBar.test.tsx`
    - Test dual metric display, per-set breakdown with parallel counts
    - _Requirements: 5.1, 5.3_

- [ ] 13. Wire everything together in AppShell
  - [~] 13.1 Integrate parallel data loading and state management in `src/components/AppShell.tsx`
    - Fetch card_parallels alongside cards from Supabase on load
    - Store parallels in state as `CardParallel[]` and derive a `Map<string, CardParallel[]>` (cardId → parallels)
    - Pass parallels map and toggle handlers down to CardList → CardRow → ParallelPanel
    - Integrate `useToggleParallel` hook
    - Update `useRealtimeSubscription` call with `onParallelUpdate` callback
    - Apply `filterByParallelStatus` in the filter pipeline
    - Pass parallel data to StatsBar for parallel statistics
    - Compute card-level collected status from Base parallel for existing card-level indicators
    - Save/load parallels from offline cache
    - Sync pending parallel toggles on reconnection
    - _Requirements: 1.4, 4.3, 4.4, 8.2, 8.3, 8.4, 8.5, 9.2, 9.3, 10.1_

  - [~] 13.2 Update `src/components/ImportModal.tsx` for parallel-aware import
    - Update import flow to handle parallel column in CSV
    - Upsert cards using card_number as unique key
    - Upsert card_parallels using (card_id, parallel_name) as unique key
    - Display updated ImportSummary including parallelsCreated count
    - _Requirements: 6.2, 6.3, 6.4, 6.7_

- [~] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design
- Unit tests validate specific examples, edge cases, and UI interactions
- The SQL migration (1.2) must be run manually against Supabase — it is included as a file artifact for version control
- The existing `useToggleCollected` hook pattern is replicated for `useToggleParallel` — same optimistic update + queue approach
- Card-level `collected` status is now derived from the "Base" parallel rather than stored directly on the card

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "2.7"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.8", "4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["4.2", "5.2", "6.2"] },
    { "id": 4, "tasks": ["8.1", "8.2"] },
    { "id": 5, "tasks": ["8.3", "9.1", "9.2"] },
    { "id": 6, "tasks": ["9.3", "10.1", "11.1", "12.1"] },
    { "id": 7, "tasks": ["10.2", "11.2", "12.2"] },
    { "id": 8, "tasks": ["13.1", "13.2"] }
  ]
}
```
