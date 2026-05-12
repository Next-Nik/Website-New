-- 034_users_admin_columns.sql
--
-- Adds columns the admin console reads but the users table is missing.
-- Without these, the BetaAdminConsole .select() fails and the user list
-- comes back empty. Adding them as nullable so existing rows are fine.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_name text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived'));

CREATE INDEX IF NOT EXISTS idx_users_status ON public.users (status);
