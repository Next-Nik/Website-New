-- ============================================================================
-- 174_cohorts.sql
--
-- BP-14 · Cohorts v1 — the room. Small circles (cause-leaning or kin-leaning)
-- where an inner circle sees what each other is up to. One primitive, two
-- temperaments. NextMen/NextWomen are the first charters.
--
-- Locks encoded here:
--   • Confidentiality is ABSOLUTE. Every table is member-only read (via the
--     SECURITY DEFINER helper is_cohort_member — used to avoid recursive RLS).
--     Nothing here is world-readable; circle content never reaches a public
--     surface or the ticker.
--   • Awareness is OFFERED, never harvested. A member row carries only what a
--     person chooses to offer (focus_line, offer_horizon, offer_moments). The
--     Map, I Am, Horizon Self, and Journal have NO column here and no opt-in —
--     they are structurally unshareable to a cohort.
--   • Shrinking never ejects; "full" pauses invites (enforced in add RPC).
--   • Removal is private — no public "removed" state (a deleted row, nothing more).
--   • Dormancy dims, never auto-removes (state = 'dormant', still a member).
--
-- Flame-passing (BP-9) is stubbed to direct-add-by-email here.
--
-- Numbering: 172 horizon, 173 tended; this is 174.
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

create table if not exists public.cohorts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  temperament  text not null default 'kin'  check (temperament in ('cause', 'kin')),
  governance   text not null default 'stewarded' check (governance in ('open', 'stewarded')),
  size_cap     int  not null default 12 check (size_cap between 2 and 60),
  cadence      text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.cohort_members (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references public.cohorts(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member' check (role in ('steward', 'member')),
  -- Offered elements ONLY — awareness offered, never harvested.
  focus_line    text check (focus_line is null or char_length(focus_line) <= 160),
  offer_horizon boolean not null default false,
  -- Snapshot of the member's declared horizon at the moment they chose to
  -- offer it. Snapshotted here (not read live from horizon_declarations)
  -- because that table is owner/communal-read only — offering to a circle is
  -- a deliberate, member-scoped copy, never a live harvest.
  offered_horizon_text text check (offered_horizon_text is null or char_length(offered_horizon_text) <= 240),
  offer_moments boolean not null default false,
  state         text not null default 'active' check (state in ('active', 'dormant')),
  joined_at     timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create index if not exists cohort_members_user_idx on public.cohort_members (user_id);
create index if not exists cohort_members_cohort_idx on public.cohort_members (cohort_id);

create table if not exists public.cohort_shared_moments (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts(id) on delete cascade,
  moment_id   uuid not null references public.moments(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (cohort_id, moment_id)
);
create index if not exists cohort_shared_moments_cohort_idx
  on public.cohort_shared_moments (cohort_id, created_at desc);

-- ── Membership predicate — SECURITY DEFINER so RLS policies can call it
-- without recursing on cohort_members' own policies. ──
create or replace function public.is_cohort_member(p_cohort uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cohort_members m
    where m.cohort_id = p_cohort and m.user_id = p_uid
  )
$$;
revoke all on function public.is_cohort_member(uuid, uuid) from public;
grant execute on function public.is_cohort_member(uuid, uuid) to anon, authenticated;

alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.cohort_shared_moments enable row level security;

-- Cohorts: members read the charter. Writes go through RPCs (charter edits)
-- which are steward-gated in code.
drop policy if exists "cohort member read" on public.cohorts;
create policy "cohort member read" on public.cohorts
  for select using (public.is_cohort_member(id, auth.uid()));

-- Members: a member sees co-members (their offered elements).
drop policy if exists "cohort members read" on public.cohort_members;
create policy "cohort members read" on public.cohort_members
  for select using (public.is_cohort_member(cohort_id, auth.uid()));

-- A person governs their OWN membership row: set offers / focus line / dormancy…
drop policy if exists "cohort member update self" on public.cohort_members;
create policy "cohort member update self" on public.cohort_members
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- …and may leave at any time (quiet, their shared content withdraws by cascade).
drop policy if exists "cohort member leave self" on public.cohort_members;
create policy "cohort member leave self" on public.cohort_members
  for delete using (auth.uid() = user_id);

-- Shared moments: members read; a member shares only their OWN moment.
drop policy if exists "cohort shared read" on public.cohort_shared_moments;
create policy "cohort shared read" on public.cohort_shared_moments
  for select using (public.is_cohort_member(cohort_id, auth.uid()));

drop policy if exists "cohort shared insert own" on public.cohort_shared_moments;
create policy "cohort shared insert own" on public.cohort_shared_moments
  for insert with check (
    auth.uid() = user_id
    and public.is_cohort_member(cohort_id, auth.uid())
    and exists (select 1 from public.moments mo where mo.id = moment_id and mo.user_id = auth.uid())
  );

drop policy if exists "cohort shared delete own" on public.cohort_shared_moments;
create policy "cohort shared delete own" on public.cohort_shared_moments
  for delete using (auth.uid() = user_id);

-- ── RPCs — the mutations that need to enforce charter rules server-side. ──

-- Create a circle and steward it.
create or replace function public.create_cohort(
  p_name text, p_temperament text, p_governance text, p_size_cap int, p_cadence text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sign in first'; end if;
  insert into public.cohorts (name, temperament, governance, size_cap, cadence, created_by)
    values (btrim(p_name), coalesce(p_temperament,'kin'), coalesce(p_governance,'stewarded'),
            coalesce(p_size_cap,12), p_cadence, v_uid)
    returning id into v_id;
  insert into public.cohort_members (cohort_id, user_id, role)
    values (v_id, v_uid, 'steward');
  return v_id;
end $$;
revoke all on function public.create_cohort(text,text,text,int,text) from public;
grant execute on function public.create_cohort(text,text,text,int,text) to authenticated;

-- Add a member by email (flame-passing stubbed to direct-add). Enforces
-- governance (open: any member may invite; stewarded: steward only) and the
-- size cap ("full" pauses invites).
create or replace function public.add_cohort_member_by_email(p_cohort uuid, p_email text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_role text; v_gov text; v_cap int; v_count int; v_target uuid;
begin
  if v_uid is null then raise exception 'sign in first'; end if;
  select role into v_role from public.cohort_members where cohort_id = p_cohort and user_id = v_uid;
  if v_role is null then raise exception 'not a member of this circle'; end if;
  select governance, size_cap into v_gov, v_cap from public.cohorts where id = p_cohort;
  if v_gov = 'stewarded' and v_role <> 'steward' then
    raise exception 'this circle is stewarded — invites go through the steward';
  end if;
  select count(*) into v_count from public.cohort_members where cohort_id = p_cohort;
  if v_count >= v_cap then raise exception 'this circle is full'; end if;
  select id into v_target from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_target is null then raise exception 'no one here with that email yet'; end if;
  if exists (select 1 from public.cohort_members where cohort_id = p_cohort and user_id = v_target) then
    return 'already in the circle';
  end if;
  insert into public.cohort_members (cohort_id, user_id, role) values (p_cohort, v_target, 'member');
  return 'added';
end $$;
revoke all on function public.add_cohort_member_by_email(uuid,text) from public;
grant execute on function public.add_cohort_member_by_email(uuid,text) to authenticated;

-- Steward removes a member (private — just a deleted row, no public state).
-- Never removes the last steward.
create or replace function public.remove_cohort_member(p_cohort uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_role text; v_stewards int;
begin
  select role into v_role from public.cohort_members where cohort_id = p_cohort and user_id = v_uid;
  if v_role <> 'steward' then raise exception 'only a steward can remove a member'; end if;
  select count(*) into v_stewards from public.cohort_members where cohort_id = p_cohort and role = 'steward';
  if v_stewards <= 1 and exists (
    select 1 from public.cohort_members where cohort_id = p_cohort and user_id = p_user and role = 'steward'
  ) then raise exception 'a circle keeps at least one steward'; end if;
  delete from public.cohort_members where cohort_id = p_cohort and user_id = p_user;
end $$;
revoke all on function public.remove_cohort_member(uuid,uuid) from public;
grant execute on function public.remove_cohort_member(uuid,uuid) to authenticated;

-- Steward amends the charter (name / governance / cap / cadence). Shrinking
-- the cap never ejects anyone — it only pauses future invites.
create or replace function public.update_cohort_charter(
  p_cohort uuid, p_name text, p_governance text, p_size_cap int, p_cadence text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_role text;
begin
  select role into v_role from public.cohort_members where cohort_id = p_cohort and user_id = v_uid;
  if v_role <> 'steward' then raise exception 'only a steward can amend the charter'; end if;
  update public.cohorts set
    name       = coalesce(nullif(btrim(p_name), ''), name),
    governance = coalesce(p_governance, governance),
    size_cap   = coalesce(p_size_cap, size_cap),
    cadence    = p_cadence,
    updated_at = now()
  where id = p_cohort;
end $$;
revoke all on function public.update_cohort_charter(uuid,text,text,int,text) from public;
grant execute on function public.update_cohort_charter(uuid,text,text,int,text) to authenticated;

-- Circle fire — an aggregate heartbeat, member-scoped, never names. Returns
-- the count of moments shared into the circle in a recent window.
create or replace function public.cohort_fire(p_cohort uuid, p_days int default 7)
returns int
language sql security definer set search_path = public as $$
  select count(*)::int from public.cohort_shared_moments s
  where s.cohort_id = p_cohort
    and public.is_cohort_member(p_cohort, auth.uid())
    and s.created_at >= now() - make_interval(days => greatest(p_days, 1))
$$;
revoke all on function public.cohort_fire(uuid,int) from public;
grant execute on function public.cohort_fire(uuid,int) to authenticated;

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- select public.create_cohort('NextMen · Test', 'kin', 'stewarded', 12, 'weekly');
-- select * from public.cohorts;                 -- visible only to members
-- select * from public.cohort_members;          -- co-members only
