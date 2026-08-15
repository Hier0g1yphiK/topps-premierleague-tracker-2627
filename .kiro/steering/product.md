# Product Overview

Topps Premier League Tracker 26/27 is a PWA for tracking a Topps Premier League sticker/card collection for the 2026-27 season.

## Core Functionality

- View a full list of cards in the collection with their collected status
- Toggle cards as collected/uncollected with optimistic UI updates
- Track parallel variants (Blue Voltage, Gold /50, etc.) separately from the base card
- Filter cards by player/team name, card number, set card number, set name, collected status, and parallel completion (search is diacritic-insensitive — e.g. "moises" matches "Moisés")
- Sort cards by any column (card number, set, player, team, collected)
- Import card data from CSV files (supports parallel column for variant tracking)
- Real-time sync across devices via Supabase Realtime subscriptions
- Offline-first: works without network via service worker caching and IndexedDB

## Backend

- Supabase (Postgres database + Realtime subscriptions + Row Level Security)
- No custom backend server; the app talks directly to Supabase from the browser
- Two tables: `cards` (base card data + collected status) and `card_parallels` (named variant tracking)

## Data Model

- A **card** represents the base collectible item. `cards.collected` tracks whether you have the base version.
- A **parallel** is a named variant of a card (e.g. "Blue Voltage", "Gold /50"). These are tracked in `card_parallels` as separate collected states.
- "Base" is NOT stored as a parallel — the card row itself is the base. CSV rows with an empty or "Base" parallel column only create/update the card, not a parallel record.

## Key User Flows

1. Browse cards → filter/search → toggle base collected status
2. Expand parallels dropdown → toggle individual parallel variants
3. Import a CSV checklist → app upserts cards and parallel variants into the database
4. Offline usage → cached data is served; changes sync on reconnection
