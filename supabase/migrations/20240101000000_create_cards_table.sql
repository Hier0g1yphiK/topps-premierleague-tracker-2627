-- Migration: Create cards table for Premier League Trading Card Tracker
-- Requirements: 1.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT NULL,
  card_number INTEGER NOT NULL,
  set_name TEXT NOT NULL,
  set_card_number TEXT NOT NULL,
  player TEXT NOT NULL,
  team TEXT NOT NULL,
  notes TEXT,
  collected BOOLEAN NOT NULL DEFAULT FALSE,
  date_collected DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uniqueness for future multi-user: (user_id, card_number) pair
  CONSTRAINT cards_user_card_unique UNIQUE (user_id, card_number)
);

-- Single-user mode uniqueness (when user_id is NULL)
CREATE UNIQUE INDEX cards_card_number_null_user
  ON cards (card_number) WHERE user_id IS NULL;

-- Filter support
CREATE INDEX cards_set_name_idx ON cards (set_name);

-- Trigram indexes for partial-match search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX cards_player_trgm_idx ON cards USING GIN (player gin_trgm_ops);
CREATE INDEX cards_team_trgm_idx ON cards USING GIN (team gin_trgm_ops);

-- Future RLS support
CREATE INDEX cards_user_id_idx ON cards (user_id);
