-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 048 — Watch surface (Phase v2.5b)
--
-- Layer 2 of the bounded-attention architecture: interest / watch.
-- A user can watch up to 500 entities (Focuses, actors, or people).
-- Watching is private to the user. The watched feed is chronological-only.
--
-- See: NextUs_Phase_2_5b_Watch_Surface_Spec.md for the architecture.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── nextus_user_watches ───────────────────────────────────────────────────
-- Polymorphic across three target tables (nextus_focuses, nextus_actors,
-- contributor_profiles_beta). No foreign key on entity_id — the application
-- maintains referential integrity. The three entity types are validated by
-- the CHECK constraint and by the application layer.

create table if not exists public.nextus_user_watches (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  entity_type       text not null check (entity_type in ('focus','actor','person')),
  entity_id         uuid not null,
  watched_at        timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists nextus_user_watches_user_id_idx
  on public.nextus_user_watches (user_id);

create index if not exists nextus_user_watches_entity_idx
  on public.nextus_user_watches (entity_type, entity_id);

alter table public.nextus_user_watches enable row level security;

-- A user can read only their own watches. Watching is private.
drop policy if exists "users read own watches" on public.nextus_user_watches;
create policy "users read own watches"
  on public.nextus_user_watches
  for select
  using (auth.uid() = user_id);

-- A user can insert only their own watches.
drop policy if exists "users insert own watches" on public.nextus_user_watches;
create policy "users insert own watches"
  on public.nextus_user_watches
  for insert
  with check (auth.uid() = user_id);

-- A user can delete only their own watches.
drop policy if exists "users delete own watches" on public.nextus_user_watches;
create policy "users delete own watches"
  on public.nextus_user_watches
  for delete
  using (auth.uid() = user_id);

-- No update policy. To change an entity_id, delete and re-insert.

-- ─── The 500 cap, enforced server-side ─────────────────────────────────────
-- Application-level cap checking is brittle (race conditions, browser tabs);
-- the database is the source of truth. The trigger refuses inserts that
-- would push the user over 500.

create or replace function public.enforce_watch_cap()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from public.nextus_user_watches
  where user_id = NEW.user_id;

  if current_count >= 500 then
    raise exception 'WATCH_CAP_REACHED'
      using hint = 'You are at the 500-entry cap. Remove a watched entity before adding another.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists nextus_user_watches_cap_trigger on public.nextus_user_watches;
create trigger nextus_user_watches_cap_trigger
  before insert on public.nextus_user_watches
  for each row
  execute function public.enforce_watch_cap();

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should return 0 initially:
-- select count(*) from public.nextus_user_watches;
--
-- -- Should raise WATCH_CAP_REACHED at 501st insert for a test user:
-- -- (loop in a separate script, or trust the trigger logic)
