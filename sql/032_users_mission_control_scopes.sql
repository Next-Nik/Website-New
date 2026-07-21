-- 032_users_mission_control_scopes.sql
--
-- Adds mission_control_scopes to public.users. Code paths in Mission Control
-- and the welcome flows have been reading and writing this column for months
-- via useMissionControlData and BetaMissionControl. Without it, the .select()
-- on users fails with 42703, the Promise.all in useMissionControlData errors,
-- and the dashboard renders empty.
--
-- Default: ['self','planet'] — the same default the page assumes for any
-- legacy user without the column set.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mission_control_scopes text[]
    NOT NULL
    DEFAULT ARRAY['self','planet']::text[];
