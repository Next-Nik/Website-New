-- ============================================================
-- NextUs Crisis Protection Migration
-- Run in Supabase SQL Editor
-- April 2026
-- ============================================================

-- ── 1. Terms acceptance tracking ─────────────────────────────

CREATE TABLE IF NOT EXISTS user_terms_acceptance (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version      text NOT NULL,
  accepted_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_terms_acceptance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_terms_acceptance' AND policyname = 'Users manage own acceptance'
  ) THEN
    CREATE POLICY "Users manage own acceptance" ON user_terms_acceptance
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 2. Crisis resource registry ──────────────────────────────

CREATE TABLE IF NOT EXISTS crisis_resources (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code       text NOT NULL,
  region             text,
  name               text NOT NULL,
  phone              text,
  sms                text,
  web_url            text,
  hours              text,
  languages          text[],
  types_supported    text[],
  description        text,
  display_order      integer DEFAULT 100,
  status             text DEFAULT 'active' CHECK (status IN ('active', 'unverified', 'dead')),
  last_verified_at   timestamptz DEFAULT now(),
  notes              text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_resources_country
  ON crisis_resources(country_code, status);

ALTER TABLE crisis_resources ENABLE ROW LEVEL SECURITY;

-- Public read — anyone can see crisis resources
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crisis_resources' AND policyname = 'Public read crisis resources'
  ) THEN
    CREATE POLICY "Public read crisis resources" ON crisis_resources
      FOR SELECT USING (status = 'active');
  END IF;
END $$;

-- ── 3. Map crisis gate flag on map_results ────────────────────
-- The map_results table likely already exists. Just ensure phase
-- can hold 'crisis_gate' as a valid value (no constraint needed
-- since phase is freeform text).

-- Add a column to help admin surface crisis gate hits separately
ALTER TABLE map_results
  ADD COLUMN IF NOT EXISTS crisis_gate_triggered boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_map_results_crisis_gate
  ON map_results(crisis_gate_triggered) WHERE crisis_gate_triggered = true;

-- ── Verify ────────────────────────────────────────────────────

SELECT 'user_terms_acceptance' AS table_name, COUNT(*) AS row_count FROM user_terms_acceptance
UNION ALL
SELECT 'crisis_resources', COUNT(*) FROM crisis_resources;
