-- 153_cadence_once_monthly.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Cadence vocabulary for the beacon authoring tool (June 2026).
--
-- The authoring tool offers five cadences: Once / Daily / A few times a week /
-- Weekly / Monthly. Four map onto existing slugs; 'once' and 'monthly' are new.
-- This widens the actor_calls.cadence CHECK to admit them. Existing slugs are
-- untouched — we only add.
--
-- Cadence sets the reminder rhythm, not the score — a spark is a spark. The one
-- behaviour that follows from cadence: a 'once' challenge completes on its single
-- check-in (a finish, +5); recurring cadences complete at the season close.
--
-- Strand-level cadence lives in the protocol JSON and is unconstrained, so only
-- the column CHECK needs widening. The existing check is dropped by definition
-- (not by a guessed name) so this is safe regardless of how Postgres named it.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'actor_calls'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%cadence%'
  LOOP
    EXECUTE format('ALTER TABLE actor_calls DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE actor_calls
  ADD CONSTRAINT actor_calls_cadence_check
  CHECK (cadence IN ('once', 'daily-absolute', '5-of-7', 'weekly', 'monthly', 'custom'));

COMMENT ON COLUMN actor_calls.cadence IS
  'Challenge cadence: once | daily-absolute | 5-of-7 | weekly | monthly | custom. Sets the reminder rhythm, not the score. A "once" challenge completes on its single check-in (+5); recurring cadences complete at the season close.';
