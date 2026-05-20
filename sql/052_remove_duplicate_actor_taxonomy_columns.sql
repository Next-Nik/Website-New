-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 052 — Remove duplicate tagging columns from nextus_actors
--
-- Migration 051 added `subdomain_ids` (uuid[]) and `field_ids` (uuid[]) to
-- nextus_actors. But the existing schema already uses `subdomains` and
-- `fields` as text[] slug arrays (managed via OrgDomainsTab). Two parallel
-- columns serving the same purpose would cause silent inconsistency.
--
-- The existing slug-based columns win. The platform's UI for tagging
-- actors to subdomains/fields already exists and uses slugs. The new
-- IntersectionPage and ActiveFocusPrompt queries have been updated to read
-- from those existing columns.
--
-- This migration drops the redundant uuid arrays and their GIN indexes.
-- If the columns don't exist (because 051 hasn't run yet), the IF EXISTS
-- guards make this a no-op.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

drop index if exists nextus_actors_subdomain_ids_idx;
drop index if exists nextus_actors_field_ids_idx;

alter table public.nextus_actors drop column if exists subdomain_ids;
alter table public.nextus_actors drop column if exists field_ids;

commit;

-- Note: nextus_user_focus still references subdomain_ids and field_ids as
-- uuid arrays in its own table — that's intentional. A user's focus picks
-- specific subdomain and field nodes which DO have stable uuids (from
-- nextus_subdomains and nextus_fields tables seeded in 051). Only the actor
-- tagging columns are the duplicate.
