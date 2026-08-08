# Topps Premier League Tracker 26/27

A Progressive Web App for tracking your Topps Premier League 2026-27 sticker/card collection. Mark cards as collected, filter and sort your checklist, import data from CSV, and sync across devices in real time.

## Features

- **Collection tracking** — Toggle cards as collected/uncollected with optimistic UI
- **Filtering & search** — Filter by player/team name, set, or collected status
- **Sorting** — Sort by card number, set, player, team, or collected status
- **CSV import** — Bulk-import card data from a CSV file
- **Real-time sync** — Live updates across devices via Supabase Realtime
- **Offline-first** — Works without network using service worker caching and IndexedDB
- **Dark mode** — System-aware with manual toggle
- **PWA** — Installable on mobile and desktop

## Tech Stack

- React 19 + TypeScript 5.8
- Vite 6
- Tailwind CSS 4
- Supabase (Postgres + Realtime)
- vite-plugin-pwa (Workbox)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the `cards` table set up

### Setup

```bash
# Install dependencies
npm install

# Copy the example env file and fill in your Supabase credentials
cp .env.example .env
```

Edit `.env` with your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm run test       # Run all tests once
npm run test:watch # Run tests in watch mode
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── components/    # React UI components
├── hooks/         # Custom React hooks
├── lib/           # Pure logic & utilities (no React)
├── types/         # Shared TypeScript interfaces
└── test/          # Test setup
```

See `.kiro/steering/structure.md` for a detailed breakdown.

## License

Private
