-- 152_constellation_beacon.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- The Beacon — drop 1 of the constellation engine (June 2026).
--
-- The beacon is a SEASON rooted at one founding challenge. Everyone who responds
-- to that challenge is the constellation: people who take it on, and orgs who
-- carry it forward (their version is a lineage child via parent_call_id). The
-- beacon counts the founding challenge AND its whole lineage tree.
--
-- A spark is not a new thing. It already exists: one row in
-- actor_call_strand_log (a participant marking a strand done on a day) IS a
-- check-in. This migration adds NO new ledger. It adds ONE object — the season
-- (label, window, close date, spark economy) — and the read functions that
-- aggregate what is already there.
--
-- The spark economy, as data not code:
--   • a check-in  = 1 spark   (checkin_sparks)
--   • a completion = 5 sparks (completion_sparks)
--   beacon sparks = checkins · checkin_sparks  +  completions · completion_sparks
-- Completion already exists on actor_call_participants (status='complete',
-- completed_at). A `once` challenge completes on its single check-in; a recurring
-- one completes for everyone who showed up at the close (the drop-6 cron flips
-- status to 'complete'). Nothing here computes the close — it only counts.
--
-- ── Rooting the beacon ────────────────────────────────────────────────────────
-- The founding challenge does not exist yet — it is authored through the normal
-- challenge flow. So this migration seeds the season with root_call_id NULL and
-- status 'pending'. The endpoint returns zeros (not an error) while pending.
-- Once the founding challenge is published, root the beacon with ONE statement:
--
--   UPDATE constellation_beacons
--      SET root_call_id = '<founding challenge uuid>', status = 'live'
--    WHERE slug = 'founding-nature';
-- ─────────────────────────────────────────────────────────────────────────────

-- ── The season object ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS constellation_beacons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  slug               text UNIQUE,
  label              text NOT NULL,

  -- The founding challenge. The beacon counts this call + its lineage descendants.
  -- ON DELETE SET NULL so deleting the root parks the beacon rather than erroring.
  root_call_id       uuid REFERENCES actor_calls(id) ON DELETE SET NULL,

  -- The season window. closes_on is the witnessing date (Climate Week close).
  opens_on           date,
  closes_on          date,

  -- The spark economy — config, not code. A check-in is worth 1, a completion 5.
  checkin_sparks     int  NOT NULL DEFAULT 1,
  completion_sparks  int  NOT NULL DEFAULT 5,

  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'live', 'closed')),

  CONSTRAINT constellation_beacons_window
    CHECK (closes_on IS NULL OR opens_on IS NULL OR closes_on >= opens_on)
);

COMMENT ON TABLE constellation_beacons IS
  'A beacon season rooted at one founding challenge. Counts sparks across the founding challenge and its lineage tree. One row per constellation season; seasons rotate, the row is the only new object the engine needs.';
COMMENT ON COLUMN constellation_beacons.root_call_id IS
  'The founding challenge. The beacon aggregates this call plus every lineage descendant (carried-forward versions). NULL until the founding challenge is authored and the beacon is rooted.';
COMMENT ON COLUMN constellation_beacons.completion_sparks IS
  'Sparks awarded for finishing a challenge (default 5). A once-challenge finishes on its single check-in; a recurring one at the season close.';

CREATE INDEX IF NOT EXISTS idx_beacons_root ON constellation_beacons (root_call_id)
  WHERE root_call_id IS NOT NULL;

-- Seed the Founding Nature Constellation (pending until rooted — see header).
INSERT INTO constellation_beacons (slug, label, opens_on, closes_on, status)
VALUES ('founding-nature', 'The Founding Nature Constellation', '2026-06-25', '2026-09-27', 'pending')
ON CONFLICT (slug) DO NOTHING;

-- RLS: the beacon is public.
ALTER TABLE constellation_beacons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read beacons" ON constellation_beacons;
CREATE POLICY "Public read beacons"
  ON constellation_beacons FOR SELECT USING (true);

-- ── Tally: the headline numbers ───────────────────────────────────────────────
-- Returns raw counts for the founding challenge + its lineage tree. The spark
-- formula (× checkin_sparks, × completion_sparks) is applied by the endpoint
-- from the beacon row, so the economy lives in one place.

CREATE OR REPLACE FUNCTION beacon_tally(p_root_call_id uuid)
RETURNS TABLE (
  checkins    bigint,
  completions bigint,
  people      bigint,
  orgs        bigint,
  challenges  bigint
)
LANGUAGE sql STABLE AS $$
  WITH tree AS (
    SELECT p_root_call_id AS id
    UNION
    SELECT d.id FROM challenge_descendants(p_root_call_id, NULL) d
  ),
  live_tree AS (
    SELECT c.id, c.actor_id
    FROM actor_calls c
    JOIN tree t ON t.id = c.id
    WHERE c.visibility = 'community'
      AND c.lifecycle_state <> 'deleted'
  ),
  parts AS (
    SELECT pp.id, pp.user_id, pp.status
    FROM actor_call_participants pp
    JOIN live_tree lt ON lt.id = pp.call_id
    WHERE pp.status <> 'withdrawn'
  )
  SELECT
    (SELECT count(*) FROM actor_call_strand_log sl
       JOIN parts pr ON pr.id = sl.participant_id
       WHERE sl.done = true)::bigint                              AS checkins,
    (SELECT count(*) FROM parts WHERE status = 'complete')::bigint AS completions,
    (SELECT count(DISTINCT user_id) FROM parts)::bigint           AS people,
    (SELECT count(DISTINCT actor_id) FROM live_tree
       WHERE actor_id IS NOT NULL)::bigint                        AS orgs,
    (SELECT count(*) FROM live_tree)::bigint                      AS challenges;
$$;

-- ── Breakdown: per-challenge, for the steward ledger and the record ───────────
-- One row per challenge in the tree, with its own people / check-ins /
-- completions. "Actions done" for the record = checkins. Never ordered here;
-- the surface decides, and the surface never ranks.

CREATE OR REPLACE FUNCTION beacon_breakdown(p_root_call_id uuid)
RETURNS TABLE (
  call_id     uuid,
  title       text,
  the_move    text,
  domain      text,
  cadence     text,
  actor_id    uuid,
  actor_name  text,
  actor_slug  text,
  people      bigint,
  checkins    bigint,
  completions bigint
)
LANGUAGE sql STABLE AS $$
  WITH tree AS (
    SELECT p_root_call_id AS id
    UNION
    SELECT d.id FROM challenge_descendants(p_root_call_id, NULL) d
  ),
  live_tree AS (
    SELECT c.id, c.title, c.the_move, c.domain, c.cadence, c.actor_id
    FROM actor_calls c
    JOIN tree t ON t.id = c.id
    WHERE c.visibility = 'community'
      AND c.lifecycle_state <> 'deleted'
  )
  SELECT
    lt.id, lt.title, lt.the_move, lt.domain, lt.cadence,
    lt.actor_id, a.name, a.slug,
    (SELECT count(DISTINCT pp.user_id)
       FROM actor_call_participants pp
       WHERE pp.call_id = lt.id AND pp.status <> 'withdrawn')::bigint        AS people,
    (SELECT count(*)
       FROM actor_call_strand_log sl
       JOIN actor_call_participants pp ON pp.id = sl.participant_id
       WHERE pp.call_id = lt.id AND pp.status <> 'withdrawn' AND sl.done)::bigint AS checkins,
    (SELECT count(*)
       FROM actor_call_participants pp
       WHERE pp.call_id = lt.id AND pp.status = 'complete')::bigint          AS completions
  FROM live_tree lt
  LEFT JOIN nextus_actors a ON a.id = lt.actor_id;
$$;

GRANT EXECUTE ON FUNCTION beacon_tally(uuid)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION beacon_breakdown(uuid) TO anon, authenticated;

COMMENT ON FUNCTION beacon_tally(uuid) IS
  'Raw counts (checkins, completions, people, orgs, challenges) for a founding challenge and its lineage tree. Endpoint applies the spark economy.';
COMMENT ON FUNCTION beacon_breakdown(uuid) IS
  'Per-challenge counts across the founding challenge and its lineage tree, for the steward ledger and the public record. Unordered; the surface never ranks.';
