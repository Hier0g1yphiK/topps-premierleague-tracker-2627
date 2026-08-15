# Tech Stack & Build

## Core Stack

- **Runtime**: Browser (PWA)
- **Language**: TypeScript 5.8
- **Framework**: React 19 (functional components, hooks only)
- **Styling**: Tailwind CSS 4 (via @tailwindcss/vite plugin, utility-first)
- **Backend**: Supabase JS SDK v2 (database, realtime, auth)
- **Build Tool**: Vite 6
- **PWA**: vite-plugin-pwa (Workbox, registerType: prompt)

## Testing

- **Test Runner**: Vitest 3
- **Component Tests**: @testing-library/react + @testing-library/user-event
- **Property-Based Tests**: fast-check 4
- **DOM Environment**: jsdom
- **IndexedDB Mock**: fake-indexeddb

## Linting

- ESLint 9 (flat config)
- typescript-eslint
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh

## Common Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript compile + Vite production build
npm run lint       # Run ESLint across the project
npm run test       # Run all tests once (vitest --run)
npm run test:watch # Run tests in watch mode
npm run preview    # Preview production build locally
```

## Scripts

```bash
node scripts/migrate-base-parallels.mjs  # Remove legacy "Base" parallel rows from DB
node scripts/generate-icons.mjs          # Generate PWA icons from source image
```

## Environment Variables

Stored in `.env` (gitignored). Required:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous/public key

## Key Conventions

- Use `import.meta.env.VITE_*` for env vars (Vite convention)
- Tailwind classes applied directly in JSX; no CSS modules or styled-components
- Dark mode via `dark:` Tailwind variants; toggled by a `useDarkMode` hook
- All interactive elements must meet 44x44px minimum tap target
- Accessibility: use aria-labels, semantic HTML, keyboard navigation
- **Base card vs. parallels**: `cards.collected` is the single source of truth for base-card status. Only named variants (not "Base") go into `card_parallels`. CSV rows with empty or "Base" parallel column do NOT create a parallel record.
- **Supabase pagination**: all fetches use `.range()` pagination (page size 1000) to handle datasets exceeding Supabase's default row limit. All inserts/upserts batch in groups of 500.
- **Diacritic-insensitive search**: search uses `String.normalize('NFD')` + combining-mark removal so accented characters match their ASCII equivalents (e.g. "moises" matches "Moisés"). Implemented via `removeDiacritics()` in `src/lib/filters.ts`.
