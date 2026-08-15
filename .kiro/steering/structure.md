# Project Structure

```
src/
├── App.tsx                  # Root component (renders AppShell)
├── main.tsx                 # Entry point (React DOM render + service worker registration)
├── index.css                # Global styles / Tailwind directives
├── pwa.d.ts                 # Type declarations for PWA virtual modules
├── components/              # React UI components
│   ├── AppShell.tsx         # Main layout: header, stats, filters, card list, import modal
│   ├── CardList.tsx         # Renders sorted/filtered cards (desktop table + mobile cards)
│   ├── CardRow.tsx          # Individual card row (desktop) and card (mobile) variants
│   ├── FilterBar.tsx        # Search, set dropdown, collected status filter controls
│   ├── StatsBar.tsx         # Collection progress stats display
│   ├── ImportModal.tsx      # CSV file import dialog (batched upserts for large datasets)
│   ├── OfflineBanner.tsx    # Banner shown when offline
│   ├── ConnectionIndicator.tsx  # Realtime connection status dot
│   ├── ParallelItem.tsx     # Individual parallel toggle button
│   ├── ParallelPanel.tsx    # Expandable parallels list for a card
│   └── UpdatePrompt.tsx     # PWA update notification prompt
├── hooks/                   # Custom React hooks
│   ├── useDarkMode.ts       # Dark/light theme toggle
│   ├── useDebouncedValue.ts # Generic debounce hook (used for search)
│   ├── useOnlineStatus.ts   # Browser online/offline detection
│   ├── useRealtimeSubscription.ts  # Supabase Realtime channel management
│   ├── useServiceWorker.ts  # PWA service worker update detection
│   ├── useToggleCollected.ts  # Optimistic toggle for card base collected status
│   └── useToggleParallel.ts   # Optimistic toggle for parallel collected status
├── lib/                     # Pure logic / utilities (no React)
│   ├── supabase.ts          # Supabase client singleton
│   ├── filters.ts           # Card filtering logic (diacritic-insensitive search, set, collected status)
│   ├── parallel-filters.ts  # Parallel-level filtering (all/has_uncollected/all_collected)
│   ├── sort.ts              # Card sorting logic
│   ├── parallel-sort.ts     # Parallel sorting (collected first, then alphabetical)
│   ├── stats.ts             # Collection statistics calculations (cards + parallels)
│   ├── csv-import.ts        # CSV parsing and validation
│   ├── offline-cache.ts     # IndexedDB cache for offline card and parallel data
│   ├── reconnection.ts      # Exponential backoff reconnection logic
│   ├── toggle-collected.ts  # Card toggle persistence logic
│   └── parallel-toggle.ts   # Parallel toggle persistence logic
├── lib/__tests__/           # Property-based tests (fast-check)
├── resources/
│   ├── appicon.png          # Source app icon (used to generate PWA icons)
│   └── Topps_Premier_League_26_27_Checklist_with_Parallels.csv  # Reference CSV
├── types/
│   └── index.ts             # Shared TypeScript interfaces (Card, CardParallel, FilterState, etc.)
└── test/
    └── setup.ts             # Vitest global test setup (jest-dom matchers)

scripts/
├── generate-icons.mjs       # Generate PWA icons from SVG source
└── migrate-base-parallels.mjs  # One-time migration: remove "Base" parallel rows

public/
├── manifest.json            # PWA manifest
├── apple-touch-icon.png     # 180x180 icon for iOS "Add to Home Screen"
├── icons/                   # PWA icons (192x192, 512x512)
└── favicon.svg
```

## Conventions

- **Co-located unit tests**: `ComponentName.test.tsx` or `module.test.ts` next to the source file
- **Property-based tests**: placed in `src/lib/__tests__/` with `.property.test.ts` suffix
- **Hooks**: one hook per file, prefixed with `use`
- **Lib modules**: pure functions, no React dependencies; easy to unit test
- **Components**: functional components only, named exports (except App which uses default export)
- **Types**: centralized in `src/types/index.ts`; imported as `import type { ... } from '../types'`

## Data Model

- **`cards` table**: one row per unique card. `cards.collected` is the single source of truth for whether the base card is collected.
- **`card_parallels` table**: one row per named parallel variant (e.g. "Blue Voltage", "Gold /50"). "Base" is NOT stored as a parallel — the card itself represents the base variant.
- CSV import creates card rows for each unique `card_number`, and parallel rows only for non-Base variants (parallel column value is not empty and not "Base").
