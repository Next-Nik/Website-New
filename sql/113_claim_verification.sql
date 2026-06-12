-- 113_claim_verification.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Claim verification infrastructure (C1, June 2026).
--
-- Two tables:
--
-- claim_verifications — short-lived verification codes for domain-matched
--   email flow. A 6-digit code is generated, emailed to the claimant, and
--   expires after 30 minutes. Verified = true unlocks the claim.
--
-- claim_requests — pending claims for the admin-fallback path. When a
--   claimant cannot access an org-domain email, they submit evidence (a note,
--   optional URL) and an admin reviews in the Flags tab.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS claim_verifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  actor_id        uuid NOT NULL REFERENCES nextus_actors(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  email           text NOT NULL,              -- org-domain email code was sent to
  code            text NOT NULL,              -- 6-digit code (hashed in prod, plain for now)
  verified        boolean NOT NULL DEFAULT false,
  verified_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  UNIQUE (actor_id, user_id)                 -- one pending verification per pair
);

CREATE INDEX IF NOT EXISTS idx_claim_verif_actor_user ON claim_verifications (actor_id, user_id);

COMMENT ON TABLE claim_verifications IS
  'Short-lived codes for domain-matched email verification during actor claim flow.';

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS claim_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  actor_id        uuid NOT NULL REFERENCES nextus_actors(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  -- Evidence supplied by the claimant
  note            text,                       -- how they're connected to the actor
  evidence_url    text,                       -- optional URL (LinkedIn, personal site, etc.)
  user_email      text,                       -- their sign-in email (for admin context)
  -- Admin review
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at     timestamptz,
  admin_note      text,
  UNIQUE (actor_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests (status, created_at);

COMMENT ON TABLE claim_requests IS
  'Admin-fallback claims: submitted when claimant cannot verify via org-domain email.';

-- RLS
ALTER TABLE claim_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_requests       ENABLE ROW LEVEL SECURITY;

-- Verifications: service role only (API writes; user reads own)
CREATE POLICY "Users read own verifications"
  ON claim_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Requests: users manage own; admins review all (via service role in API)
CREATE POLICY "Users manage own requests"
  ON claim_requests FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
