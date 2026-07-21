-- ─────────────────────────────────────────────────────────────────────────────
-- 164_honest_spark_economy.sql
--
-- A spark is one real check-in. Nothing else mints light.
--
-- The founding economy (152) weighted a completion at 5 sparks. Combined with
-- the once-cadence rule (a single check-in auto-completes the run), one real
-- action minted six points of light: 1 check-in + 1 completion × 5. The beacon
-- copy defines a spark as "show up, take one real action" — so the sky was
-- honestly drawing a dishonest number.
--
-- After this migration: sparks = checkins, exactly. Completions remain counted
-- (beacon_tally / beacon_breakdown still return them) and remain a milestone to
-- celebrate in copy and seals — they just add no extra stars to the sky.
--
-- Run manually in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE constellation_beacons
SET checkin_sparks = 1,
    completion_sparks = 0;

ALTER TABLE constellation_beacons
  ALTER COLUMN checkin_sparks SET DEFAULT 1,
  ALTER COLUMN completion_sparks SET DEFAULT 0;

COMMENT ON COLUMN constellation_beacons.checkin_sparks IS
  'Sparks minted per check-in. A spark is one real check-in; keep at 1.';
COMMENT ON COLUMN constellation_beacons.completion_sparks IS
  'Sparks minted per completion. 0 since migration 164: completions are counted and celebrated but mint no extra light — on once-cadence challenges the completing check-in already minted its spark.';
