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
│   ├── ImportModal.tsx      # CSV file import dialog
│   ├── OfflineBanner.tsx    # Banner shown when offline
│   ├── ConnectionIndicator.tsx  # Realtime connection status dot
│   └── UpdatePrompt.tsx     # PWA update notification prompt
├── hooks/                   # Custom React hooks
│   ├── useDarkMode.ts       # Dark/light theme toggle
│   ├── useDebouncedValue.ts # Generic debounce hook (used for search)
│   ├── useOnlineStatus.ts   # Browser online/offline detection
│   ├── useRealtimeSubscription.ts  # Supabase Realtime channel management
│   ├── useServiceWorker.ts  # PWA service worker update detection
│   └── useToggleCollected.ts  # Optimistic toggle with Supabase persistence
├── lib/                     # Pure logic / utilities (no React)
│   ├── supabase.ts          # Supabase client singleton
│   ├── filters.ts           # Card filtering logic
│   ├── sort.ts              # Card sorting logic
│   ├── stats.ts             # Collection statistics calculations
│   ├── csv-import.ts        # CSV parsing and validation
│   ├── offline-cache.ts     # IndexedDB cache for offline card data
│   ├── reconnection.ts      # Exponential backoff reconnection logic
│   └── toggle-collected.ts  # Toggle persistence logic
├── lib/__tests__/           # Property-based tests (fast-check)
├── types/
│   └── index.ts             # Shared TypeScript interfaces (Card, FilterState, SortConfig, etc.)
└── test/
    └── setup.ts             # Vitest global test setup (jest-dom matchers)

public/
├── manifest.json            # PWA manifest
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
