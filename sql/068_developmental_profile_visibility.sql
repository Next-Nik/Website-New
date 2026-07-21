-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 068 — Developmental profile visibility
--
-- Adds a profile-level visibility master switch to contributor_profiles_beta
-- per the Practitioner Profile Architecture (May 2026).
--
-- The developmental profile (/profile/:id) renders a person's developmental
-- work — wheels, sprints, IA statements, what they stand for. Under the new
-- architecture this is private by default, with the user opting up to
-- 'authenticated' (any signed-in NextUs user can see) or 'public' (anyone
-- with the URL can see — the old behaviour).
--
-- This is independent of the existing artefact_visibility model. That model
-- gates per-artefact (this specific sprint, that specific IA statement).
-- This new column gates the *profile as a whole*. When the master is private,
-- no artefacts are exposed regardless of their individual visibility.
--
-- Default: 'private' for new rows. Existing rows are also set to 'private'
-- explicitly to honour the architecture; users who want their developmental
-- profile public can toggle it back on. (This is a deliberate posture
-- change — the architecture treats developmental data as intimate work,
-- private until the user chooses to share.)
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.contributor_profiles_beta
  add column if not exists developmental_profile_visibility text
    not null default 'private';

-- Check constraint via DO block for idempotence
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contributor_profiles_beta_dev_visibility_check') then
    alter table public.contributor_profiles_beta
      add constraint contributor_profiles_beta_dev_visibility_check
      check (developmental_profile_visibility in ('private', 'authenticated', 'public'));
  end if;
end$$;

-- Set existing rows explicitly to 'private' (the default applies to new rows
-- only on insert; this UPDATE ensures consistency for rows already present).
-- This is intentional: the architecture moves developmental profiles to
-- private-by-default. Users who want theirs public must toggle.
update public.contributor_profiles_beta
   set developmental_profile_visibility = 'private'
 where developmental_profile_visibility is null
    or developmental_profile_visibility = '';

create index if not exists idx_contributor_profiles_beta_dev_visibility
  on public.contributor_profiles_beta (developmental_profile_visibility);

comment on column public.contributor_profiles_beta.developmental_profile_visibility is
  'Profile-level visibility: private (owner only), authenticated (any signed-in user), public (anyone). Default private.';

commit;
