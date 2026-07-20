-- 170_moments_and_moderation.sql
--
-- BP-2 · Photo infrastructure. Two tables:
--
--   moments        — a witnessed moment: an optional photo and/or one line in
--                    the person's own words, captured at the moment of a
--                    check-in (BP-5 wires the capture; this is the substrate).
--                    Soft-deleted by the owner (deleted_at), never hard-deleted
--                    by users, so the founder review queue can still see
--                    reported content that was hidden.
--   moment_reports — the moderation floor. Any signed-in person can report a
--                    moment; only the founder reads and resolves reports.
--
-- Visibility in BP-2 is deliberately narrow: owner + founder only. The daily
-- surface (BP-6) adds its own read policy when moments become communal.
--
-- Prerequisite (manual, Supabase dashboard): a PUBLIC storage bucket named
-- 'moment-images' (public read; writes only via the service-key API route,
-- same pattern as 'challenge-images').
--
-- Run manually in the Supabase SQL editor. Additive only.

create table if not exists public.moments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid,
  domain       text,
  image_path   text,
  thumb_path   text,
  line         text check (line is null or char_length(line) <= 280),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint moments_has_content check (image_path is not null or line is not null)
);

create index if not exists moments_user_idx    on public.moments (user_id, created_at desc);
create index if not exists moments_day_idx     on public.moments (created_at desc) where deleted_at is null;

alter table public.moments enable row level security;

drop policy if exists moments_owner_select on public.moments;
create policy moments_owner_select on public.moments
  for select using (auth.uid() = user_id);

drop policy if exists moments_owner_insert on public.moments;
create policy moments_owner_insert on public.moments
  for insert with check (auth.uid() = user_id);

drop policy if exists moments_owner_update on public.moments;
create policy moments_owner_update on public.moments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists moments_founder_select on public.moments;
create policy moments_founder_select on public.moments
  for select using (public.is_founder());

drop policy if exists moments_founder_update on public.moments;
create policy moments_founder_update on public.moments
  for update using (public.is_founder());

comment on table public.moments is
  'Witnessed moments: optional photo + one line, captured at check-in. Owner + founder read in BP-2; the daily surface adds communal read in BP-6.';

create table if not exists public.moment_reports (
  id          uuid primary key default gen_random_uuid(),
  moment_id   uuid not null references public.moments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason      text check (reason is null or char_length(reason) <= 500),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolution  text check (resolution in ('removed','kept') or resolution is null)
);

create index if not exists moment_reports_open_idx on public.moment_reports (created_at desc) where resolved_at is null;

alter table public.moment_reports enable row level security;

drop policy if exists moment_reports_insert on public.moment_reports;
create policy moment_reports_insert on public.moment_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists moment_reports_founder_select on public.moment_reports;
create policy moment_reports_founder_select on public.moment_reports
  for select using (public.is_founder());

drop policy if exists moment_reports_founder_update on public.moment_reports;
create policy moment_reports_founder_update on public.moment_reports
  for update using (public.is_founder());

comment on table public.moment_reports is
  'Moderation floor: any signed-in person can report a moment; founder reads and resolves. Resolution removed = moment soft-deleted by founder; kept = report dismissed.';
