# Product Overview

Topps Premier League Tracker 26/27 is a PWA for tracking a Topps Premier League sticker/card collection for the 2026-27 season.

## Core Functionality

- View a full list of cards in the collection with their collected status
- Toggle cards as collected/uncollected with optimistic UI updates
- Filter cards by player/team search text, set name, and collected status
- Sort cards by any column (card number, set, player, team, collected)
- Import card data from CSV files
- Real-time sync across devices via Supabase Realtime subscriptions
- Offline-first: works without network via service worker caching and IndexedDB

## Backend

- Supabase (Postgres database + Realtime subscriptions + Row Level Security)
- No custom backend server; the app talks directly to Supabase from the browser

## Key User Flows

1. Browse cards → filter/search → toggle collected status
2. Import a CSV checklist → app upserts cards into the database
3. Offline usage → cached data is served; changes sync on reconnection
