export interface Card {
  id: string;              // UUID
  user_id: string | null;  // UUID, nullable
  card_number: number;     // Binder card number (positive integer)
  set_name: string;
  set_card_number: string;
  player: string;
  team: string;
  notes: string | null;
  collected: boolean;
  date_collected: string | null; // ISO date string
  created_at: string;      // ISO timestamp
}

export interface FilterState {
  searchText: string;      // Max 100 chars
  setName: string | null;  // null = "All Sets"
  collectedStatus: 'all' | 'collected' | 'missing';
}

export interface SortConfig {
  column: SortColumn;
  direction: 'asc' | 'desc';
}

export type SortColumn = 'card_number' | 'set_name' | 'set_card_number' | 'player' | 'team' | 'collected';

export interface ImportSummary {
  inserted: number;
  skipped: number;
  rejected: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  reason: string;
}

export interface RealtimeConfig {
  maxRetries: 5;
  initialBackoff: 1000;    // ms
  backoffMultiplier: 2;
}
