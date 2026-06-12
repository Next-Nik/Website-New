-- 112_actor_calls.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Actor Calls — Phase B2 (June 2026).
--
-- One primitive, two types: challenge | ask.
-- A challenge is an actor saying "do this with us" — effort-shaped, 90 days.
-- An ask is an actor saying "we need this specifically" — fulfilled, not
-- completed; has a quantity/deadline. Asks are Phase B6; all fields land
-- here so the schema doesn't change again.
--
-- The Challenge Floor requires:
--   domain, scale, horizon_goal_text, the_move, cadence, duration_days,
--   measure, mechanism, and at least one author identity (actor_id OR
--   user_id for individuals).
-- A row below floor stays in status='draft' and is never published.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actor_calls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- ── Type ────────────────────────────────────────────────────────────────
  type            text NOT NULL DEFAULT 'challenge'
                    CHECK (type IN ('challenge', 'ask')),

  -- ── Authorship ──────────────────────────────────────────────────────────
  -- Either an Atlas actor (org/practitioner) or an individual user.
  -- Both can be set (practitioner with a claimed profile), but at least one
  -- must be non-null at publish.
  actor_id        uuid REFERENCES nextus_actors(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES auth.users(id)    ON DELETE SET NULL,

  -- ── Identity ────────────────────────────────────────────────────────────
  title           text NOT NULL DEFAULT '',
  slug            text UNIQUE,                        -- generated at publish
  tagline         text,                               -- one line

  -- ── The Challenge Floor fields ───────────────────────────────────────────
  -- All required before visibility can advance past 'draft'.
  scale           text NOT NULL DEFAULT 'civ'
                    CHECK (scale IN ('self', 'civ')),
  domain          text,                               -- one of the seven civ domains
  horizon_goal_text text,                             -- which Horizon Goal this moves
  the_move        text,                               -- the concrete action
  cadence         text NOT NULL DEFAULT '5-of-7'
                    CHECK (cadence IN ('daily-absolute', '5-of-7', 'weekly', 'custom')),
  cadence_note    text,                               -- custom cadence description
  duration_days   int  NOT NULL DEFAULT 90,
  measure         text,                               -- how you know it's working
  mechanism       text,                               -- why this moves the domain

  -- ── Ask-type fields (Phase B6) ──────────────────────────────────────────
  ask_quantity    int,                                -- how many needed
  ask_deadline    date,                               -- by when
  ask_fulfilled   int NOT NULL DEFAULT 0,             -- running count

  -- ── Participation ────────────────────────────────────────────────────────
  taken_on_count  int NOT NULL DEFAULT 0,             -- all time takers
  active_count    int NOT NULL DEFAULT 0,             -- currently in flight
  completed_count int NOT NULL DEFAULT 0,             -- finished + debriefed

  -- ── Visibility ──────────────────────────────────────────────────────────
  -- draft      — only the author can see it
  -- link_only  — unlisted; anyone with the URL can read
  -- community  — listed in browse + routable by NextSteps
  visibility      text NOT NULL DEFAULT 'draft'
                    CHECK (visibility IN ('draft', 'link_only', 'community')),

  -- ── Moderation ──────────────────────────────────────────────────────────
  flag_count      int NOT NULL DEFAULT 0,
  flagged_at      timestamptz,
  admin_reviewed  boolean NOT NULL DEFAULT false,
  admin_note      text,

  -- ── Provenance ──────────────────────────────────────────────────────────
  -- 'self'     — authored by the actor themselves
  -- 'nextus'   — admin-authored (rare)
  source          text NOT NULL DEFAULT 'self',

  CONSTRAINT actor_calls_has_author CHECK (actor_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Floor check: all required fields present
-- Used by the API to determine whether a call may be published.
-- (Postgres CHECK is intentionally permissive here to allow partial drafts;
--  the floor is enforced in the API before visibility can advance.)

COMMENT ON TABLE actor_calls IS
  'Actor Calls: challenges and asks authored by Atlas actors or individual users. One primitive, two types.';

COMMENT ON COLUMN actor_calls.cadence IS
  'daily-absolute: every day, no exceptions (labeled as such). 5-of-7: five of seven days. weekly: once per week. custom: author-described.';

COMMENT ON COLUMN actor_calls.visibility IS
  'draft=author-only. link_only=unlisted, URL-shareable. community=listed, browsable, NextSteps-routable.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_actor_calls_actor_id    ON actor_calls (actor_id)   WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_actor_calls_user_id     ON actor_calls (user_id)    WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_actor_calls_visibility  ON actor_calls (visibility, type, domain);
CREATE INDEX IF NOT EXISTS idx_actor_calls_slug        ON actor_calls (slug)        WHERE slug IS NOT NULL;

-- ── Flags table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actor_call_flags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  call_id         uuid NOT NULL REFERENCES actor_calls(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason          text NOT NULL,   -- standards violation description
  resolved        boolean NOT NULL DEFAULT false,
  resolved_at     timestamptz,
  admin_note      text
);

CREATE INDEX IF NOT EXISTS idx_call_flags_call_id    ON actor_call_flags (call_id);
CREATE INDEX IF NOT EXISTS idx_call_flags_unresolved ON actor_call_flags (resolved, created_at) WHERE resolved = false;

-- ── Participation table ───────────────────────────────────────────────────────
-- One row per user per call. Tracks the life of their commitment.

CREATE TABLE IF NOT EXISTS actor_call_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  call_id         uuid NOT NULL REFERENCES actor_calls(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  -- Links to the sibling civ session they created when they took this on
  session_id      uuid REFERENCES target_sprint_sessions(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'complete', 'withdrawn')),
  completed_at    timestamptz,
  -- Consent-gated feedback (Phase B5)
  feedback_consent  boolean NOT NULL DEFAULT false,
  reflection        text,               -- their post-completion reflection
  reflection_public boolean NOT NULL DEFAULT false,
  reflection_attributed boolean NOT NULL DEFAULT false,  -- show their name?
  UNIQUE (call_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON actor_call_participants (call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON actor_call_participants (user_id);

-- ── FK: target_sprint_sessions.challenge_id ───────────────────────────────────
-- The forward slot added in migration 111 now gets its real constraint.

ALTER TABLE target_sprint_sessions
  ADD CONSTRAINT fk_tss_challenge_id
  FOREIGN KEY (challenge_id)
  REFERENCES actor_calls(id)
  ON DELETE SET NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE actor_calls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE actor_call_flags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE actor_call_participants ENABLE ROW LEVEL SECURITY;

-- actor_calls: public reads for non-draft; authors can write their own
CREATE POLICY "Public read non-draft calls"
  ON actor_calls FOR SELECT
  USING (visibility IN ('link_only', 'community'));

CREATE POLICY "Authors read own drafts"
  ON actor_calls FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM nextus_actors WHERE id = actor_id AND profile_owner = auth.uid()
  ));

CREATE POLICY "Authors insert"
  ON actor_calls FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM nextus_actors WHERE id = actor_id AND profile_owner = auth.uid()
  ));

CREATE POLICY "Authors update own"
  ON actor_calls FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM nextus_actors WHERE id = actor_id AND profile_owner = auth.uid()
  ));

-- flags: anyone logged in can file; only admins resolve
CREATE POLICY "Logged-in users can flag"
  ON actor_call_flags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read flags count" -- flags count rendered on admin console
  ON actor_call_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- participants: private, own row only
CREATE POLICY "Users manage own participation"
  ON actor_call_participants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Aggregate counts are public (rendered on challenge page via actor_calls.taken_on_count)
-- Individual participation is private — identity never exposed.
