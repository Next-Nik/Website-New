-- ============================================================================
-- 178_field_guide_v3.sql
--
-- Field Guide v3 (July 2026) — champions, mission suggestions, ping log.
--
-- Three pieces:
--
--   1. actor_champions — the ONE capped thing in the guide. A user names
--      5–10 organisations as their champions ("we become the average of
--      the company we keep"). Hard cap of 10 enforced at the database
--      layer (CHAMPION_CAP_REACHED), mirroring the enforce_watch_cap
--      pattern. The general collection (actor_field_notes, watches) stays
--      unlimited.
--
--   2. actor_mission_suggestions — when an org hasn't stated a mission,
--      a collector may write one as a suggestion. Author-owned; the
--      actor's profile owner can read suggestions for their own org (to
--      confirm or refine later). One suggestion per user per actor.
--
--   3. guide_ping_log — server-side throttle record for warm pings
--      (e.g. "someone made you a champion"), written by /api/guide-ping
--      under the service key. One ping per actor per kind per 7 days.
--
--   Plus: actor_guide_counts(uuid[]) — a SECURITY DEFINER counting RPC so
--   an org owner can see "in N field guides · champion to M people"
--   WITHOUT reading anyone's private rows. Counts only, never content.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

-- ─── 1. Champions ───────────────────────────────────────────────────────────

create table if not exists public.actor_champions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  actor_id    uuid not null references public.nextus_actors(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (user_id, actor_id)
);

create index if not exists actor_champions_user_id_idx
  on public.actor_champions (user_id);
create index if not exists actor_champions_actor_id_idx
  on public.actor_champions (actor_id);

-- Hard cap: 10 champions per user. Raised message is matched client-side
-- (useChampions) the same way WATCH_CAP_REACHED is.
create or replace function public.enforce_champion_cap()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.actor_champions where user_id = new.user_id) >= 10 then
    raise exception 'CHAMPION_CAP_REACHED';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_champion_cap on public.actor_champions;
create trigger trg_enforce_champion_cap
  before insert on public.actor_champions
  for each row execute function public.enforce_champion_cap();

alter table public.actor_champions enable row level security;

drop policy if exists "users read own champions" on public.actor_champions;
create policy "users read own champions"
  on public.actor_champions for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own champions" on public.actor_champions;
create policy "users insert own champions"
  on public.actor_champions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own champions" on public.actor_champions;
create policy "users delete own champions"
  on public.actor_champions for delete
  using (auth.uid() = user_id);

-- ─── 2. Mission suggestions ────────────────────────────────────────────────

create table if not exists public.actor_mission_suggestions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  actor_id    uuid not null references public.nextus_actors(id) on delete cascade,
  suggestion  text not null check (char_length(btrim(suggestion)) > 0),
  status      text not null default 'offered'
              check (status in ('offered','accepted','declined')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, actor_id)
);

create index if not exists actor_mission_suggestions_actor_idx
  on public.actor_mission_suggestions (actor_id);

alter table public.actor_mission_suggestions enable row level security;

-- Author: full CRUD on their own suggestions.
drop policy if exists "authors read own mission suggestions" on public.actor_mission_suggestions;
create policy "authors read own mission suggestions"
  on public.actor_mission_suggestions for select
  using (auth.uid() = user_id);

drop policy if exists "authors insert own mission suggestions" on public.actor_mission_suggestions;
create policy "authors insert own mission suggestions"
  on public.actor_mission_suggestions for insert
  with check (auth.uid() = user_id);

drop policy if exists "authors update own mission suggestions" on public.actor_mission_suggestions;
create policy "authors update own mission suggestions"
  on public.actor_mission_suggestions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "authors delete own mission suggestions" on public.actor_mission_suggestions;
create policy "authors delete own mission suggestions"
  on public.actor_mission_suggestions for delete
  using (auth.uid() = user_id);

-- Actor owner: may READ suggestions offered for their org (to confirm or
-- refine). Separate policy — select is granted if either clause passes.
drop policy if exists "actor owners read suggestions for their org" on public.actor_mission_suggestions;
create policy "actor owners read suggestions for their org"
  on public.actor_mission_suggestions for select
  using (
    exists (
      select 1 from public.nextus_actors a
      where a.id = actor_mission_suggestions.actor_id
        and a.profile_owner = auth.uid()
    )
  );

-- ─── 3. Ping throttle log ──────────────────────────────────────────────────
-- Written only by the server (service key bypasses RLS). No user policies:
-- enabling RLS with none denies all client access.

create table if not exists public.guide_ping_log (
  id        uuid primary key default gen_random_uuid(),
  actor_id  uuid not null references public.nextus_actors(id) on delete cascade,
  kind      text not null check (kind in ('championed','added_to_guide')),
  sent_at   timestamptz default now()
);

create index if not exists guide_ping_log_actor_kind_idx
  on public.guide_ping_log (actor_id, kind, sent_at desc);

alter table public.guide_ping_log enable row level security;

-- ─── 4. Counting RPC ───────────────────────────────────────────────────────
-- Counts only — never row content. Lets any signed-in caller render
-- "in N field guides · champion to M people" for live actors (the same
-- numbers the mockup shows on an org's own entry).

create or replace function public.actor_guide_counts(p_actor_ids uuid[])
returns table (actor_id uuid, guide_count bigint, champion_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select a.id as actor_id,
         (select count(*) from public.actor_field_notes n where n.actor_id = a.id) as guide_count,
         (select count(*) from public.actor_champions c where c.actor_id = a.id)   as champion_count
  from public.nextus_actors a
  where a.id = any(p_actor_ids)
    and a.status = 'live';
$$;

revoke all on function public.actor_guide_counts(uuid[]) from public;
grant execute on function public.actor_guide_counts(uuid[]) to authenticated;

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- select count(*) from public.actor_champions;                -- 0
-- select count(*) from public.actor_mission_suggestions;      -- 0
-- -- 11th champion insert for one user should fail with CHAMPION_CAP_REACHED.
-- select * from public.actor_guide_counts(array['<some-actor-uuid>']::uuid[]);
