# Requirements Document

## Introduction

This feature adds parallel variant tracking to the Topps Premier League Tracker PWA. Currently, each card has a single collected/uncollected boolean. With parallel tracking, each card can have multiple parallel variants (e.g., "Base", "Blue Voltage", "Gold /50", "FoilFractor 1/1"), each independently trackable as collected or uncollected. The number and type of parallels varies by set — some cards have 38 parallels, others have only 1 ("Base"). The feature includes a new data model, updated UI for viewing and toggling parallels, updated statistics, a revised CSV import format, and continued offline-first support.

## Glossary

- **Tracker**: The Topps Premier League Tracker PWA application
- **Card**: A unique entry in the collection identified by card_number, representing a player in a specific set
- **Parallel**: A variant of a Card (e.g., "Base", "Blue Voltage", "Gold /50"). Each Card has one or more Parallels
- **Parallel_Name**: The string label identifying a parallel variant (e.g., "Base", "FoilFractor 1/1", "Aqua Sparkle /499")
- **Card_Parallel**: A specific combination of a Card and a Parallel_Name, representing a single collectible item that can be toggled as collected or uncollected
- **Parallels_Table**: A database table storing Card_Parallel records with their collected status
- **Card_Row**: The UI element representing a single Card in the card list (desktop row or mobile card)
- **Parallel_Panel**: An expandable/collapsible UI section within a Card_Row that displays all Parallel variants for that Card
- **CSV_Importer**: The module responsible for parsing, validating, and upserting CSV data into the database
- **Stats_Engine**: The module responsible for computing collection statistics
- **Offline_Cache**: The IndexedDB-based storage layer for offline card and parallel data

## Requirements

### Requirement 1: Parallel Data Model

**User Story:** As a collector, I want each card to have associated parallel variants stored in the database, so that I can track which specific parallels I have collected independently of one another.

#### Acceptance Criteria

1. THE Parallels_Table SHALL store each Card_Parallel as a row with fields: id (UUID), card_id (foreign key to cards), parallel_name (text), collected (boolean), date_collected (date, nullable), and created_at (timestamp)
2. THE Parallels_Table SHALL enforce a unique constraint on the combination of card_id and parallel_name
3. WHEN a Card_Parallel record is inserted, THE Parallels_Table SHALL default collected to false and date_collected to null
4. THE Tracker SHALL query parallel data alongside card data when loading the collection
5. IF a Card_Parallel insert violates the unique constraint, THEN THE Parallels_Table SHALL reject the insert and return a constraint violation error

### Requirement 2: Parallel Panel UI

**User Story:** As a collector, I want to expand a card row to see all its parallel variants and their collected status, so that I can quickly identify which parallels I still need.

#### Acceptance Criteria

1. THE Card_Row SHALL display a visual indicator showing the count of collected parallels out of total parallels for that Card (e.g., "3/38")
2. WHEN the user activates the expand control on a Card_Row, THE Parallel_Panel SHALL become visible and display all Parallel variants for that Card
3. WHEN the user activates the collapse control on an expanded Card_Row, THE Parallel_Panel SHALL become hidden
4. THE Parallel_Panel SHALL display each Parallel_Name with a collected/uncollected indicator
5. THE Parallel_Panel SHALL be keyboard accessible, allowing expand/collapse via Enter or Space keys
6. THE Parallel_Panel expand/collapse control SHALL meet the 44x44px minimum tap target size
7. WHILE the Parallel_Panel is expanded, THE Parallel_Panel SHALL sort parallels with collected items first, then uncollected items, preserving alphabetical order within each group

### Requirement 3: Parallel Toggle

**User Story:** As a collector, I want to toggle individual parallels as collected or uncollected, so that I can track my progress on specific variants.

#### Acceptance Criteria

1. WHEN the user activates a Parallel toggle within the Parallel_Panel, THE Tracker SHALL optimistically update the Card_Parallel collected status in the UI
2. WHEN a Parallel is toggled to collected, THE Tracker SHALL set date_collected to the current date
3. WHEN a Parallel is toggled to uncollected, THE Tracker SHALL set date_collected to null
4. THE Tracker SHALL persist the Card_Parallel toggle to the Parallels_Table via Supabase
5. IF the persist operation fails, THEN THE Tracker SHALL revert the Card_Parallel to its previous collected state in the UI
6. WHILE a Parallel toggle persist operation is in progress, THE Tracker SHALL display a loading indicator on the affected Parallel item
7. THE Parallel toggle control SHALL meet the 44x44px minimum tap target size

### Requirement 4: Card-Level Collected Status

**User Story:** As a collector, I want the card-level collected indicator to reflect whether I have collected at least the Base parallel, so that the existing card list remains useful at a glance.

#### Acceptance Criteria

1. THE Card_Row SHALL display the card as "collected" when the "Base" parallel for that Card has collected set to true
2. THE Card_Row SHALL display the card as "uncollected" when the "Base" parallel for that Card has collected set to false or when no "Base" parallel exists
3. WHEN the user activates the card-level toggle on a Card_Row, THE Tracker SHALL toggle the "Base" parallel collected status for that Card
4. THE Stats_Engine SHALL use the card-level collected status (Base parallel) for overall collection progress calculations

### Requirement 5: Parallel Statistics

**User Story:** As a collector, I want to see statistics about my parallel collection progress, so that I can understand how complete my collection is across all variants.

#### Acceptance Criteria

1. THE Stats_Engine SHALL compute a parallel progress summary showing total parallels collected out of total parallels available across the entire collection
2. THE Stats_Engine SHALL compute per-card parallel counts (collected parallels / total parallels for each Card)
3. THE StatsBar SHALL display overall parallel progress as a separate metric from card-level progress
4. WHEN the user expands the per-set breakdown, THE Stats_Engine SHALL include parallel counts per set (total parallels collected / total parallels available within each set)

### Requirement 6: CSV Import with Parallels

**User Story:** As a collector, I want to import a CSV file where each row represents a card+parallel combination, so that I can populate my collection with all available parallel variants.

#### Acceptance Criteria

1. THE CSV_Importer SHALL accept CSV files with columns: card_number, set, set_card_number, player, team, notes, parallel
2. WHEN the CSV contains a "parallel" column, THE CSV_Importer SHALL treat each row as a Card_Parallel record
3. THE CSV_Importer SHALL upsert Card records using card_number as the unique key, creating the Card if it does not exist
4. THE CSV_Importer SHALL upsert Card_Parallel records using the combination of card_id and parallel_name as the unique key
5. WHEN a CSV row has an empty or missing parallel value, THE CSV_Importer SHALL default the parallel_name to "Base"
6. IF a CSV row fails validation, THEN THE CSV_Importer SHALL reject that row, record the error with row number and reason, and continue processing remaining rows
7. THE CSV_Importer SHALL report an ImportSummary with counts of cards inserted, parallels created, rows skipped (duplicates), and rows rejected (validation failures)
8. FOR ALL valid CSV content, importing then exporting SHALL produce a file that re-imports to an equivalent database state (round-trip property)

### Requirement 7: CSV Parsing and Validation

**User Story:** As a collector, I want the CSV parser to handle the parallel column correctly and validate all fields, so that only valid data enters my collection.

#### Acceptance Criteria

1. THE CSV_Importer SHALL validate that parallel_name is a non-empty string after trimming whitespace
2. THE CSV_Importer SHALL accept parallel names containing special characters, numbers, and forward slashes (e.g., "FoilFractor 1/1", "Aqua Sparkle /499", "Black & White /75")
3. THE CSV_Importer SHALL accept the column header "set" as equivalent to "set_name" for backwards compatibility
4. WHEN the CSV does not contain a "parallel" column, THE CSV_Importer SHALL treat the file as a legacy format and assign "Base" as the parallel_name for all rows
5. THE CSV_Importer SHALL handle quoted fields containing commas within the parallel column

### Requirement 8: Offline Parallel Data Caching

**User Story:** As a collector, I want parallel data to be available offline, so that I can view and track parallels without a network connection.

#### Acceptance Criteria

1. THE Offline_Cache SHALL store Card_Parallel records alongside Card records in IndexedDB
2. WHEN cards and parallels are fetched from Supabase, THE Offline_Cache SHALL persist the parallel data to IndexedDB
3. WHEN the Tracker is offline and loads from cache, THE Offline_Cache SHALL provide Card_Parallel records to the UI
4. WHILE the Tracker is offline, THE Tracker SHALL allow toggling Card_Parallel collected status in the local cache
5. WHEN the Tracker returns online after offline toggles, THE Tracker SHALL sync pending Card_Parallel changes to Supabase

### Requirement 9: Realtime Sync for Parallels

**User Story:** As a collector using multiple devices, I want parallel toggle changes to sync in real time, so that my collection status is consistent across devices.

#### Acceptance Criteria

1. THE Tracker SHALL subscribe to INSERT and UPDATE events on the Parallels_Table via Supabase Realtime
2. WHEN a Card_Parallel change event is received via Realtime, THE Tracker SHALL update the corresponding Card_Parallel in the UI without a full page reload
3. WHEN the Realtime connection is re-established after a disconnection, THE Tracker SHALL re-fetch all Card_Parallel data to reconcile missed updates

### Requirement 10: Filter Integration

**User Story:** As a collector, I want existing filters to continue working with parallel data, and optionally filter by parallel collected status, so that I can find cards based on their parallel completion.

#### Acceptance Criteria

1. THE FilterBar SHALL continue to support search by player/team, filter by set, and filter by collected status (using card-level Base parallel status)
2. THE FilterBar SHALL provide an option to filter cards by parallel completion status: "All", "Has uncollected parallels", "All parallels collected"
3. WHEN the "Has uncollected parallels" filter is active, THE Tracker SHALL display only cards where at least one Card_Parallel has collected set to false
4. WHEN the "All parallels collected" filter is active, THE Tracker SHALL display only cards where all Card_Parallels have collected set to true
