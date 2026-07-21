-- ─────────────────────────────────────────────────────────────
-- 071_dismissed_rail_tools.sql
--
-- Adds dismissed_rail_tools column to users. This is the
-- backing store for the rail dismiss/pin mechanic on Mission
-- Control. The array holds tool keys ('map', 'purpose-piece',
-- 'horizon-state', 'horizon-practice') that the user has chosen
-- to hide from their left rail.
--
-- Empty array → nothing dismissed → full rail shown.
-- Two tiles are NEVER dismissible regardless of this array:
-- Let's Talk (entry conversation) and Journal (the record).
--
-- Reads/writes happen client-side from MissionControl.jsx.
-- Dismissed tools remain accessible from the Journal under
-- the "You" lens (revisit affordance).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS dismissed_rail_tools text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN users.dismissed_rail_tools IS
  'Tool keys the user has dismissed from their Mission Control left rail. Dismissed tools remain accessible via the Journal.';
