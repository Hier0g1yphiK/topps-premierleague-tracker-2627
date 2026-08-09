-- Migration: Add card_parallels table for parallel variant tracking
-- Requirements: 1.1, 1.2, 1.3, 1.5, 9.1

CREATE TABLE card_parallels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  parallel_name text NOT NULL,
  collected boolean NOT NULL DEFAULT false,
  date_collected date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, parallel_name)
);

CREATE INDEX idx_card_parallels_card_id ON card_parallels(card_id);

-- Enable RLS
ALTER TABLE card_parallels ENABLE ROW LEVEL SECURITY;

-- RLS policy (matches cards table pattern)
CREATE POLICY "Users can manage their own parallels"
  ON card_parallels
  FOR ALL
  USING (
    card_id IN (SELECT id FROM cards WHERE user_id = auth.uid())
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE card_parallels;
