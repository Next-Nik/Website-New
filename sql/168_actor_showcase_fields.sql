-- 168_actor_showcase_fields.sql
--
-- Showcase layer: five owner-authored narrative fields that let an actor
-- show the depth of their work. All five are OWNER-ONLY — the seeder and
-- extractor must never populate them. They render on the public profile
-- only once the profile is claimed (same law as mission_statement and
-- working_on_now).
--
--   track_record    — what they've done: proof, milestones, impact
--   how_we_work     — how they do it: approach, method
--   best_practices  — what they've learned and want to pass on
--   direction       — where they're heading
--   main_challenges — what's hard right now (soft bridge to Actor Calls)
--
-- Run manually in the Supabase SQL editor.

alter table public.nextus_actors
  add column if not exists track_record    text,
  add column if not exists how_we_work     text,
  add column if not exists best_practices  text,
  add column if not exists direction       text,
  add column if not exists main_challenges text;

comment on column public.nextus_actors.track_record    is 'Owner-only. What the actor has done — proof, milestones, impact. Never seeded.';
comment on column public.nextus_actors.how_we_work     is 'Owner-only. How the actor works — approach and method. Never seeded.';
comment on column public.nextus_actors.best_practices  is 'Owner-only. Practices and lessons the actor wants to pass on. Never seeded.';
comment on column public.nextus_actors.direction       is 'Owner-only. Where the work is heading. Never seeded.';
comment on column public.nextus_actors.main_challenges is 'Owner-only. What is hard right now. Never seeded.';
