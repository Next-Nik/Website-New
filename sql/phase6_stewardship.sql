-- ============================================================
-- NextUs — Focus Stewardship
-- Phase 6 Migration
-- April 2026
--
-- What this does:
--   1. Creates nextus_focus_stewards — who holds stewardship
--   2. Creates nextus_focus_steward_log — full action history
--      (grant, revoke, transfer, suspend, reinstate)
--   3. Creates nextus_focus_steward_claims — inbound requests
--      from people who want to steward a Focus
--   4. RLS: stewards can read their own record;
--      founders/governors can write everything
--
-- Nothing existing is altered.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. nextus_focus_stewards
--    Current stewardship state — one row per (focus, user)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focus_stewards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'steward'
                  CHECK (role IN ('steward', 'governor')),
                  -- steward: manages goals and actors for this focus
                  -- governor: can also grant/revoke stewardship within this focus
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'revoked')),
  granted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,             -- null = no expiry
  notes         text,                   -- internal note from granting authority
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (focus_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stewards_focus  ON nextus_focus_stewards(focus_id);
CREATE INDEX IF NOT EXISTS idx_stewards_user   ON nextus_focus_stewards(user_id);
CREATE INDEX IF NOT EXISTS idx_stewards_status ON nextus_focus_stewards(status);


-- ────────────────────────────────────────────────────────────
-- 2. nextus_focus_steward_log
--    Immutable audit trail — every action recorded forever
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focus_steward_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  subject_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                -- the user whose stewardship changed
  action        text NOT NULL
                  CHECK (action IN (
                    'granted',      -- stewardship given
                    'revoked',      -- stewardship removed
                    'suspended',    -- temporarily inactive
                    'reinstated',   -- suspension lifted
                    'transferred',  -- moved from one user to another
                    'role_changed', -- steward ↔ governor
                    'expired'       -- passed expires_at
                  )),
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                -- who performed the action (null = system, e.g. expiry)
  from_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                -- for transfers: who held it before
  to_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
                -- for transfers: who holds it after
  reason        text,                   -- written rationale
  metadata      jsonb,                  -- any additional context
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_steward_log_focus   ON nextus_focus_steward_log(focus_id);
CREATE INDEX IF NOT EXISTS idx_steward_log_subject ON nextus_focus_steward_log(subject_id);
CREATE INDEX IF NOT EXISTS idx_steward_log_action  ON nextus_focus_steward_log(action);
CREATE INDEX IF NOT EXISTS idx_steward_log_time    ON nextus_focus_steward_log(created_at);


-- ────────────────────────────────────────────────────────────
-- 3. nextus_focus_steward_claims
--    Inbound requests from users wanting to steward a Focus
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nextus_focus_steward_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id      uuid NOT NULL REFERENCES nextus_focuses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rationale     text NOT NULL,          -- why they should steward this Focus
  organisation  text,                   -- org they represent, if any
  website       text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'declined', 'withdrawn')),
  reviewed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  review_note   text,                   -- internal note on decision
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (focus_id, user_id)            -- one claim per (focus, user) at a time
);

CREATE INDEX IF NOT EXISTS idx_claims_focus  ON nextus_focus_steward_claims(focus_id);
CREATE INDEX IF NOT EXISTS idx_claims_user   ON nextus_focus_steward_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON nextus_focus_steward_claims(status);


-- ────────────────────────────────────────────────────────────
-- 4. Update nextus_focus_goals RLS
--    Stewards can now insert/update goals for their focus
--    (status caps at 'proposed' — ratification stays with
--    founder/governor)
-- ────────────────────────────────────────────────────────────

-- Drop the old auth-only insert policy and replace
DROP POLICY IF EXISTS "auth_insert_focus_goals" ON nextus_focus_goals;
DROP POLICY IF EXISTS "founder_update_focus_goals" ON nextus_focus_goals;

-- Stewards can insert goals for their own focus (land as 'proposed')
CREATE POLICY "steward_insert_focus_goals"
  ON nextus_focus_goals FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- founder can insert anything
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
      OR
      -- active steward of this focus
      EXISTS (
        SELECT 1 FROM nextus_focus_stewards
        WHERE focus_id = nextus_focus_goals.focus_id
          AND user_id  = auth.uid()
          AND status   = 'active'
      )
    )
  );

-- Stewards can update goals they set (but cannot self-ratify)
CREATE POLICY "steward_update_focus_goals"
  ON nextus_focus_goals FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
    OR set_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM nextus_focus_stewards
      WHERE focus_id = nextus_focus_goals.focus_id
        AND user_id  = auth.uid()
        AND status   = 'active'
        AND role     = 'governor'
    )
  );


-- ────────────────────────────────────────────────────────────
-- 5. RLS on new tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE nextus_focus_stewards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nextus_focus_steward_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nextus_focus_steward_claims  ENABLE ROW LEVEL SECURITY;

-- Stewards table: public read, founder/governor write
CREATE POLICY "public_read_stewards"
  ON nextus_focus_stewards FOR SELECT USING (true);

CREATE POLICY "founder_all_stewards"
  ON nextus_focus_stewards FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
    OR EXISTS (
      SELECT 1 FROM nextus_focus_stewards s2
      WHERE s2.focus_id = nextus_focus_stewards.focus_id
        AND s2.user_id  = auth.uid()
        AND s2.status   = 'active'
        AND s2.role     = 'governor'
    )
  );

-- Log: public read, system/founder write (log rows are never updated or deleted)
CREATE POLICY "public_read_steward_log"
  ON nextus_focus_steward_log FOR SELECT USING (true);

CREATE POLICY "founder_insert_steward_log"
  ON nextus_focus_steward_log FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
    OR auth.role() = 'service_role'
  );

-- Claims: user can read/insert/withdraw their own; founder reads all
CREATE POLICY "user_read_own_claims"
  ON nextus_focus_steward_claims FOR SELECT
  USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
  );

CREATE POLICY "user_insert_claim"
  ON nextus_focus_steward_claims FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

CREATE POLICY "user_withdraw_claim"
  ON nextus_focus_steward_claims FOR UPDATE
  USING (
    -- user can only withdraw their own pending claim
    (user_id = auth.uid() AND status = 'pending')
    OR
    -- founder can approve/decline
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'founder'
  );


-- ────────────────────────────────────────────────────────────
-- Helper: grant_stewardship()
-- Call this instead of raw INSERT to ensure the log is written
-- atomically with the steward record.
--
-- Usage:
--   SELECT grant_stewardship(
--     focus_id   := 'uuid',
--     subject_id := 'uuid',   -- user receiving stewardship
--     actor_id   := 'uuid',   -- user granting (you)
--     role       := 'steward',
--     reason     := 'Approved claim — represents...',
--     expires_at := null
--   );
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION grant_stewardship(
  p_focus_id   uuid,
  p_subject_id uuid,
  p_actor_id   uuid,
  p_role       text    DEFAULT 'steward',
  p_reason     text    DEFAULT null,
  p_expires_at timestamptz DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert the steward record
  INSERT INTO nextus_focus_stewards
    (focus_id, user_id, role, status, granted_by, granted_at, expires_at, notes)
  VALUES
    (p_focus_id, p_subject_id, p_role, 'active', p_actor_id, now(), p_expires_at, p_reason)
  ON CONFLICT (focus_id, user_id)
  DO UPDATE SET
    role       = EXCLUDED.role,
    status     = 'active',
    granted_by = EXCLUDED.granted_by,
    granted_at = EXCLUDED.granted_at,
    expires_at = EXCLUDED.expires_at,
    notes      = EXCLUDED.notes,
    updated_at = now();

  -- Write the log
  INSERT INTO nextus_focus_steward_log
    (focus_id, subject_id, action, actor_id, reason)
  VALUES
    (p_focus_id, p_subject_id, 'granted', p_actor_id, p_reason);
END;
$$;


CREATE OR REPLACE FUNCTION revoke_stewardship(
  p_focus_id   uuid,
  p_subject_id uuid,
  p_actor_id   uuid,
  p_reason     text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE nextus_focus_stewards
  SET status = 'revoked', updated_at = now()
  WHERE focus_id = p_focus_id AND user_id = p_subject_id;

  INSERT INTO nextus_focus_steward_log
    (focus_id, subject_id, action, actor_id, reason)
  VALUES
    (p_focus_id, p_subject_id, 'revoked', p_actor_id, p_reason);
END;
$$;


CREATE OR REPLACE FUNCTION transfer_stewardship(
  p_focus_id    uuid,
  p_from_id     uuid,
  p_to_id       uuid,
  p_actor_id    uuid,
  p_reason      text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  -- Get current role to preserve it in transfer
  SELECT role INTO v_role
  FROM nextus_focus_stewards
  WHERE focus_id = p_focus_id AND user_id = p_from_id;

  -- Revoke from current holder
  UPDATE nextus_focus_stewards
  SET status = 'revoked', updated_at = now()
  WHERE focus_id = p_focus_id AND user_id = p_from_id;

  -- Grant to new holder
  INSERT INTO nextus_focus_stewards
    (focus_id, user_id, role, status, granted_by, granted_at)
  VALUES
    (p_focus_id, p_to_id, COALESCE(v_role, 'steward'), 'active', p_actor_id, now())
  ON CONFLICT (focus_id, user_id)
  DO UPDATE SET
    role       = EXCLUDED.role,
    status     = 'active',
    granted_by = EXCLUDED.granted_by,
    granted_at = EXCLUDED.granted_at,
    updated_at = now();

  -- Single log entry capturing the transfer
  INSERT INTO nextus_focus_steward_log
    (focus_id, subject_id, action, actor_id, from_user_id, to_user_id, reason)
  VALUES
    (p_focus_id, p_to_id, 'transferred', p_actor_id, p_from_id, p_to_id, p_reason);
END;
$$;


-- ────────────────────────────────────────────────────────────
-- Verify
-- ────────────────────────────────────────────────────────────

-- After migration, confirm tables exist:
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name LIKE 'nextus_focus_%'
-- ORDER BY table_name;
--
-- Expected:
--   nextus_focus_goals
--   nextus_focus_places
--   nextus_focus_steward_claims
--   nextus_focus_steward_log
--   nextus_focus_stewards
