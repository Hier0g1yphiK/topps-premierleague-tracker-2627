# Topps Premier League Tracker 26/27

A Progressive Web App for tracking your Topps Premier League 2026-27 sticker/card collection. Mark cards as collected, track parallel variants, filter and sort your checklist, import data from CSV, and sync across devices in real time.

## Features

- **Collection tracking** — Toggle cards as collected/uncollected with optimistic UI
- **Parallel tracking** — Track named parallel variants (Blue Voltage, Gold /50, etc.) independently from the base card
- **Filtering & search** — Filter by player/team name, set, collected status, or parallel completion
- **Sorting** — Sort by card number, set, player, team, or collected status
- **CSV import** — Bulk-import card data and parallels from a CSV file (batched for large datasets)
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
- A Supabase project with `cards` and `card_parallels` tables set up

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

## Data Model

- **`cards`** — One row per unique card. `cards.collected` tracks whether you have the base version.
- **`card_parallels`** — One row per named parallel variant (e.g. "Blue Voltage", "Gold /50"). Only actual parallels are stored here — "Base" is NOT a parallel, it's represented by the card row itself.

### CSV Format

The import CSV should have columns: `card_number`, `set` (or `set_name`), `set_card_number`, `player`, `team`, `notes` (optional), `parallel` (optional).

- Rows where `parallel` is empty or "Base" create/update the card only (no parallel record).
- Rows with a named parallel value (e.g. "Blue Voltage") create a `card_parallels` record.

## Scripts

```bash
node scripts/migrate-base-parallels.mjs   # One-time migration to remove legacy "Base" parallel rows
node scripts/generate-icons.mjs           # Generate PWA icons from source image (src/resources/appicon.png)
```

## Project Structure

```
src/
├── components/    # React UI components
├── hooks/         # Custom React hooks
├── lib/           # Pure logic & utilities (no React)
├── types/         # Shared TypeScript interfaces
├── resources/     # Reference CSV data & source app icon
└── test/          # Test setup
scripts/           # Utility and migration scripts
public/
├── manifest.json  # PWA manifest
├── apple-touch-icon.png  # iOS home screen icon
├── icons/         # PWA icons (192x192, 512x512)
└── favicon.svg
```

See `.kiro/steering/structure.md` for a detailed breakdown.

## License

Private
