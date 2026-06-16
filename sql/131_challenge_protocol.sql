-- 131_challenge_protocol.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Packaged challenges — Phase 2 (June 2026).
--
-- A challenge stops being a single move and becomes a PACKAGE: a set of
-- standing strands that run together for a fixed window. Think 75 Hard —
-- two workouts, water, ten pages, a photo, the diet — authored once, then
-- plugged into any individual's life on a clock that starts the day they
-- take it on.
--
-- The package is the executable layer beneath the Challenge Floor. The Floor
-- (domain, Horizon Goal, the_move, measure, mechanism) is still stated once
-- for the whole thing. `protocol` holds what a participant actually does.
--
-- ── The strand contract ──────────────────────────────────────────────────────
-- `protocol` is a JSON array. Each element is one strand:
--   {
--     "id":      "s1",                  -- stable across edits; the daily log
--                                          and the participant checklist key
--                                          off this, so it must not be reused
--     "text":    "Two 45-min workouts, one outdoors",
--     "cadence": "daily-absolute",      -- daily-absolute | 5-of-7 | weekly | custom
--     "note":    "optional clarifier"   -- optional
--   }
--
-- A challenge with a one-element protocol IS a single task. Same primitive,
-- no separate task object. A short-duration, one-strand challenge is the
-- "do this one thing" case; a 21- or 90-day multi-strand challenge is the
-- bigger bite. There is no `is_packaged` flag — packaged simply means the
-- array has more than one strand. Consumers read `protocol` and render
-- whatever is there.
--
-- ── Duration ─────────────────────────────────────────────────────────────────
-- duration_days already exists (int, default 90). It stays a free integer.
-- Confirmed authoring presets: 21, 90, or custom. No schema change needed;
-- the comment below records the contract.
--
-- ── Scale ────────────────────────────────────────────────────────────────────
-- scale (self|civ) is internal plumbing and is never shown to anyone. The
-- authoring API infers a sensible default and the take_on flow honors it so
-- the challenge lands in the right place. No one picks "self" or "civ".
-- ─────────────────────────────────────────────────────────────────────────────

-- ── The package column ────────────────────────────────────────────────────────

ALTER TABLE actor_calls
  ADD COLUMN IF NOT EXISTS protocol jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Permissive shape guard: must be a JSON array. The strand-level contract
-- (id/text/cadence) is enforced in the API at create/publish, consistent with
-- how the rest of the Floor is enforced — Postgres stays lenient here so a
-- partial draft can still be saved.
ALTER TABLE actor_calls
  DROP CONSTRAINT IF EXISTS actor_calls_protocol_is_array;

ALTER TABLE actor_calls
  ADD CONSTRAINT actor_calls_protocol_is_array
  CHECK (jsonb_typeof(protocol) = 'array');

COMMENT ON COLUMN actor_calls.protocol IS
  'Packaged challenge strands: JSON array of { id, text, cadence, note? }. One strand = a single task. Many strands = a protocol (e.g. 75 Hard). Executable layer beneath the Challenge Floor. Enforced in API, not by Postgres.';

COMMENT ON COLUMN actor_calls.duration_days IS
  'Length of the challenge window in days. Free integer; confirmed authoring presets are 21, 90, and custom. Default 90.';

-- ── Backfill ──────────────────────────────────────────────────────────────────
-- Every existing challenge becomes a one-strand package so Phase 3 (take_on
-- copy-down) and the public page have a single, uniform shape to read. Asks
-- are not executed as checklists, so they get no protocol.

UPDATE actor_calls
SET protocol = jsonb_build_array(
      jsonb_build_object(
        'id',      's1',
        'text',    the_move,
        'cadence', cadence
      )
    )
WHERE type = 'challenge'
  AND (protocol IS NULL OR protocol = '[]'::jsonb)
  AND the_move IS NOT NULL
  AND length(btrim(the_move)) > 0;

-- ── Index ─────────────────────────────────────────────────────────────────────
-- Lets a future "challenges with N+ strands" / packaged-only browse filter
-- read strand count cheaply.
CREATE INDEX IF NOT EXISTS idx_actor_calls_protocol_len
  ON actor_calls ((jsonb_array_length(protocol)))
  WHERE type = 'challenge';
