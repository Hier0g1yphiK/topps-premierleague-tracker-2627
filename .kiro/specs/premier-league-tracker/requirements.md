# Requirements Document

## Introduction

A personal web application for tracking a Topps Premier League 2026/27 trading card collection (~1,137 cards). The app allows the user to browse the full checklist, search and filter cards, mark cards as collected, and view progress statistics. The app is backed by Supabase (Postgres) for cross-device sync and is configured as an installable PWA for mobile use.

## Glossary

- **App**: The Premier League Trading Card Tracker web application (React + Vite + Tailwind CSS frontend)
- **Card**: A single trading card entry in the checklist, identified by a unique binder card number
- **Card_Table**: The Supabase Postgres table storing all card data and collection status
- **Checklist**: The complete set of ~1,137 cards imported from the source CSV
- **Binder_Card_Number**: A sequential integer uniquely identifying each card's position in the binder
- **Set_Name**: The named subset a card belongs to (e.g. "Base", "Beast Mode", "Chrome Classics Autograph Cards")
- **Set_Card_Number**: A set-specific alphanumeric identifier for a card within its set (e.g. "BM 1", "CC-IW")
- **Collected_Status**: A boolean flag indicating whether the user owns a specific card
- **Date_Collected**: An optional date recording when a card was acquired
- **CSV_File**: A comma-separated values file containing the source checklist data with columns: card_number, set_name, set_card_number, player, team, notes
- **Filter_Bar**: The UI component providing search and filter controls
- **Stats_Bar**: The UI component displaying collection progress statistics
- **Card_List**: The main UI component displaying cards in a scrollable table/list
- **Service_Worker**: A background script enabling PWA offline caching and install capability
- **Realtime_Subscription**: A Supabase realtime channel that pushes database changes to connected clients

## Requirements

### Requirement 1: CSV Data Import

**User Story:** As a collector, I want to import my card checklist from a CSV file into the database, so that I have all card data available in the app.

#### Acceptance Criteria

1. WHEN a valid CSV_File with columns card_number, set_name, set_card_number, player, team, and notes is provided, THE App SHALL parse all rows and insert them into the Card_Table.
2. WHEN a CSV_File row contains a card_number that already exists in the Card_Table, THE App SHALL skip that row without modifying the existing record.
3. WHEN a CSV_File contains rows with missing or whitespace-only required fields (card_number, set_name, or player), or where card_number is not a valid positive integer, THE App SHALL reject those rows and display an error message listing the invalid row numbers and the reason for rejection.
4. WHEN the import completes, THE App SHALL display a summary showing the count of cards inserted, the count of rows skipped (duplicates), and the count of rows rejected (validation failures).
5. THE Card_Table SHALL store each card with columns: id (UUID primary key), user_id (UUID, nullable, for future auth), card_number (integer, unique per the constraint defined in Requirement 9), set_name (text), set_card_number (text), player (text), team (text), notes (text, nullable), collected (boolean, default false), date_collected (date, nullable), created_at (timestamp).
6. WHEN the user selects a file that is not a valid CSV (unparseable or wrong file type), THE App SHALL display an error message indicating the file is not a valid CSV and SHALL NOT modify the Card_Table.
7. WHEN the user selects a CSV_File that contains a header row but no data rows, THE App SHALL display an informational message indicating that no cards were found in the file.

### Requirement 2: Card List Display

**User Story:** As a collector, I want to view the full checklist as a sortable table, so that I can browse all cards and see their details at a glance.

#### Acceptance Criteria

1. THE Card_List SHALL display all cards from the Card_Table in a tabular format with columns: binder card number, set name, set card number, player, team, and collected status.
2. THE Card_List SHALL sort cards by Binder_Card_Number in ascending order by default.
3. WHEN the user taps a column header, THE Card_List SHALL sort the displayed cards by that column in ascending order and display an ascending sort indicator on that column header.
4. WHEN the user taps a column header that is already the active sort column in ascending order, THE Card_List SHALL reverse the sort to descending order and display a descending sort indicator on that column header.
5. THE Card_List SHALL visually distinguish collected cards from uncollected cards by applying a different background colour or displaying a distinct icon on each row.
6. WHILE the Card_List is loading data from the Card_Table, THE Card_List SHALL display a loading indicator.
7. IF the Card_Table contains no cards, THEN THE Card_List SHALL display an empty state message indicating that no cards are available.

### Requirement 3: Search and Filter

**User Story:** As a collector, I want to search and filter the card list by player name, team, and set, so that I can quickly find specific cards.

#### Acceptance Criteria

1. THE Filter_Bar SHALL provide a free-text search input, with a maximum length of 100 characters, that filters cards where the player name or team name contains the entered text as a substring (case-insensitive). Filtering SHALL begin live as the user types (from the first keystroke).
2. THE Filter_Bar SHALL provide a dropdown for Set_Name that lists all distinct set names from the Card_Table sorted alphabetically, preceded by an "All Sets" option selected by default.
3. THE Filter_Bar SHALL provide a dropdown for Collected_Status with options: "All" (selected by default), "Collected", and "Missing".
4. WHEN multiple filters are active simultaneously, THE App SHALL display only cards matching all active filter criteria (logical AND).
5. WHEN the user clears all filters, THE Card_List SHALL display all cards in the default sort order.
6. WHEN the user types in the free-text search input, THE Card_List SHALL update results within 300 milliseconds of the last keystroke (debounced).
7. WHEN the active filter criteria match no cards, THE Card_List SHALL display an empty state message indicating that no cards match the current filters.

### Requirement 4: Toggle Collected Status

**User Story:** As a collector, I want to mark a card as collected or uncollected with a single tap, so that I can quickly update my collection while at a card show.

#### Acceptance Criteria

1. WHEN the user taps the collected toggle on an uncollected card, THE App SHALL optimistically update the UI to show the card as collected, set that card's Collected_Status to true, and set Date_Collected to the current date in the user's local timezone.
2. WHEN the user taps the collected toggle on a collected card, THE App SHALL optimistically update the UI to show the card as uncollected, set that card's Collected_Status to false, and set Date_Collected to null.
3. WHEN a collected status change is made, THE App SHALL persist the change to the Card_Table in Supabase within 2 seconds.
4. IF a network error occurs during the collected status update, THEN THE App SHALL revert the toggle to its previous state and display an error notification for 5 seconds.
5. WHILE a previous toggle request for the same card is still in flight, THE App SHALL queue subsequent taps and apply only the final state after the in-flight request completes.

### Requirement 5: Real-Time Cross-Device Sync

**User Story:** As a collector, I want changes made on one device to appear on my other devices in real time, so that my collection status is always up to date regardless of which device I use.

#### Acceptance Criteria

1. WHEN the App loads, THE App SHALL establish a Realtime_Subscription to the Card_Table for changes to the collected and date_collected columns.
2. WHEN a card's Collected_Status is updated in the Card_Table by another client, THE App SHALL reflect the updated status in the Card_List within 3 seconds without requiring a page refresh.
3. IF the Realtime_Subscription disconnects, THEN THE App SHALL attempt to reconnect using exponential backoff starting at 1 second, up to a maximum of 5 retry attempts, and SHALL display a connection status indicator showing one of three states: connected, reconnecting, or disconnected.
4. WHEN the Realtime_Subscription reconnects after a disconnection, THE App SHALL fetch the latest card data to reconcile any missed updates.
5. IF all 5 reconnection attempts fail, THEN THE App SHALL display the connection status indicator in the disconnected state and provide a manual retry control that the user can activate to restart the reconnection process.

### Requirement 6: Progress Statistics

**User Story:** As a collector, I want to see my overall completion progress and a per-set breakdown, so that I know how close I am to completing the collection.

#### Acceptance Criteria

1. THE Stats_Bar SHALL display the total number of collected cards and the total number of cards in the Checklist (e.g. "523 / 1137 collected"), calculated from all cards in the Card_Table regardless of any active filters in the Filter_Bar.
2. THE Stats_Bar SHALL display the overall completion percentage rounded to one decimal place (e.g. "46.0%").
3. THE Stats_Bar SHALL display a per-set breakdown showing each Set_Name with its collected count and total count (e.g. "Base: 210/280"), ordered by the lowest Binder_Card_Number in each set ascending.
4. WHEN a card's Collected_Status changes, THE Stats_Bar SHALL update the displayed counts and percentages within 1 second.
5. IF the Card_Table contains zero cards, THEN THE Stats_Bar SHALL display "0 / 0 collected" and "0.0%" for the overall completion percentage.

### Requirement 7: Responsive Layout

**User Story:** As a collector, I want the app to be comfortable to use on both my phone and my laptop, so that I can use it wherever I am.

#### Acceptance Criteria

1. THE App SHALL render a layout on viewports from 320px to 2560px wide with no horizontal scrollbar, all text readable without user zooming, and all interactive elements reachable without horizontal scrolling.
2. WHILE the viewport width is below 768px, THE Card_List SHALL display cards in a stacked card/row format with a minimum tap target size of 44x44 pixels and a minimum spacing of 8px between adjacent interactive elements.
3. WHILE the viewport width is 768px or above, THE Card_List SHALL display cards in a full table layout with all columns visible (binder card number, set name, set card number, player, team, and collected status).
4. WHILE the viewport width is below 768px, THE Filter_Bar SHALL stack its controls vertically with each control spanning the full available width.
5. THE App SHALL use Tailwind CSS responsive utility classes to adapt layout between mobile and desktop breakpoints.

### Requirement 8: PWA Install Support

**User Story:** As a collector, I want to install the app on my phone's home screen, so that I can open it quickly without navigating to a browser bookmark.

#### Acceptance Criteria

1. THE App SHALL include a valid web app manifest with name, short_name, icons (192px and 512px), start_url, display set to "standalone", and theme_color.
2. THE App SHALL register a Service_Worker that caches the application shell (HTML, CSS, JS) using a cache-first strategy so that the UI loads from cache when available and falls back to the network on first visit or cache miss.
3. THE App SHALL cache the most recent card data response in IndexedDB (or a runtime cache) so that WHEN the device is offline, THE Card_List displays the last-fetched card data rather than an empty state.
4. WHEN the app is installed to the home screen, THE App SHALL launch in standalone mode without browser chrome.
5. WHEN the device loses network connectivity, THE App SHALL display a persistent inline banner at the top of the viewport indicating that displayed data may be stale and that changes will sync when connectivity is restored.
6. WHEN network connectivity is restored after an offline period, THE App SHALL remove the offline banner within 5 seconds of detecting connectivity and resume normal data operations.
7. WHEN a new Service_Worker version is detected, THE App SHALL notify the user with an inline prompt offering to reload the app to apply the update.

### Requirement 9: Database Schema Design

**User Story:** As a developer, I want the database schema structured to support future multi-user access, so that authentication can be added later without a schema rewrite.

#### Acceptance Criteria

1. THE Card_Table SHALL include a user_id column of type UUID that is nullable and defaults to null.
2. THE Card_Table SHALL have a unique constraint on the combination of user_id and card_number, with an additional unique index on card_number WHERE user_id IS NULL, to enforce uniqueness in single-user mode when user_id is null.
3. THE Card_Table SHALL have a B-tree index on the set_name column to support filter queries on set name.
4. THE Card_Table SHALL have a GIN trigram index on the player column and a separate GIN trigram index on the team column to support case-insensitive partial-match search queries.
5. THE Card_Table SHALL have a B-tree index on the user_id column to support future Row Level Security policy evaluation.
6. WHEN Supabase Row Level Security is enabled in the future, THE Card_Table schema SHALL support RLS policies filtering by user_id without requiring column additions or data-model changes (policy creation itself is expected).
