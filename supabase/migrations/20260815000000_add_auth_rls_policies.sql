-- Migration: Add Row Level Security policies restricting access to a single authorized user.
-- Replace 'REPLACE_WITH_YOUR_EMAIL' below with your actual email address before running.

-- ============================================================
-- CARDS TABLE
-- ============================================================

-- Enable RLS (idempotent — no-op if already enabled)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly-permissive policies on cards
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'cards' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON cards', pol.policyname);
  END LOOP;
END $$;

-- Single-user policy: only the authorized email can SELECT/INSERT/UPDATE/DELETE
CREATE POLICY "Authorized user full access"
  ON cards
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL')
  WITH CHECK (auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL');

-- ============================================================
-- CARD_PARALLELS TABLE
-- ============================================================

-- RLS is already enabled from the previous migration, but ensure it's on
ALTER TABLE card_parallels ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on card_parallels
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'card_parallels' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON card_parallels', pol.policyname);
  END LOOP;
END $$;

-- Single-user policy for parallels
CREATE POLICY "Authorized user full access"
  ON card_parallels
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL')
  WITH CHECK (auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL');
