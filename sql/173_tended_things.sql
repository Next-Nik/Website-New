-- ============================================================================
-- 173_tended_things.sql
--
-- BP-11 · The tended thing. On joining a challenge, each person receives their
-- own living thing, lit from the communal fire. Belonging felt as growth, not
-- points. One mechanic, domain skins (Nature skin ships first).
--
-- Locks encoded here:
--   • Grows ONLY on real action. Nothing auto-increments stage; the only
--     writer is a real check-in (the log_strand path from BP-3), via the app.
--   • Never punishes. There is no "died" state and no decay column — dimming
--     and resting are derived client-side from last_tended_at, never stored as
--     loss. One real act sets last_tended_at = now() and it wakes.
--   • Grove privacy: the communal grove reads AGGREGATE stage counts only,
--     never names or user ids — via the SECURITY DEFINER function below, which
--     returns counts and nothing that pairs a person to a practice.
--
-- Numbering: 172 is horizon_declarations (BP-8); this is 173, the next free.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

create table if not exists public.tended_things (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  challenge_id   uuid not null references public.actor_calls(id) on delete cascade,
  -- 0 seed · 1 roots · 2 sprout · 3 leaves · 4 thriving (Nature skin)
  stage          int  not null default 0 check (stage between 0 and 4),
  tend_count     int  not null default 0 check (tend_count >= 0),
  last_tended_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create index if not exists tended_things_challenge_idx
  on public.tended_things (challenge_id);

alter table public.tended_things enable row level security;

-- Owner reads only their own living things.
drop policy if exists "own tended read" on public.tended_things;
create policy "own tended read"
  on public.tended_things for select
  using (auth.uid() = user_id);

drop policy if exists "own tended insert" on public.tended_things;
create policy "own tended insert"
  on public.tended_things for insert
  with check (auth.uid() = user_id);

drop policy if exists "own tended update" on public.tended_things;
create policy "own tended update"
  on public.tended_things for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own tended delete" on public.tended_things;
create policy "own tended delete"
  on public.tended_things for delete
  using (auth.uid() = user_id);

-- ── Grove aggregate — counts per stage for one challenge, no identities. ──
-- SECURITY DEFINER so the grove can be drawn without granting read on the
-- rows themselves. Returns only (stage, n). Never a name, never a user id.
create or replace function public.grove_stage_counts(p_challenge_id uuid)
returns table (stage int, n bigint)
language sql
security definer
set search_path = public
as $$
  select stage, count(*)::bigint as n
  from public.tended_things
  where challenge_id = p_challenge_id
  group by stage
  order by stage
$$;

revoke all on function public.grove_stage_counts(uuid) from public;
grant execute on function public.grove_stage_counts(uuid) to anon, authenticated;

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should return 0 initially:
-- select count(*) from public.tended_things;
-- -- Aggregate only, no identities:
-- select * from public.grove_stage_counts('<some-challenge-uuid>');
