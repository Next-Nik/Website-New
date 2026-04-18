-- Migration: add_user_consent
-- Adds user_consent table to record terms acceptance and mailing list opt-in
-- captured at login. Separate from tool data — queryable for mailing list export.
-- Run once against the NextUs Supabase project.

CREATE TABLE IF NOT EXISTS public.user_consent (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_accepted_at timestamptz NOT NULL,
  mailing_opt_in    boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for mailing list queries
CREATE INDEX IF NOT EXISTS user_consent_mailing_idx
  ON public.user_consent (mailing_opt_in)
  WHERE mailing_opt_in = true;

-- RLS
ALTER TABLE public.user_consent ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own consent record
CREATE POLICY "user_consent_self_read"
  ON public.user_consent FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_consent_self_insert"
  ON public.user_consent FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_consent_self_update"
  ON public.user_consent FOR UPDATE
  USING (auth.uid() = user_id);

-- Founder can read all (for mailing list export)
CREATE POLICY "user_consent_founder_read"
  ON public.user_consent FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'founder');
