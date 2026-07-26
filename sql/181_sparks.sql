-- ============================================================================
-- 181_sparks.sql
--
-- Social half · item 5 · Passing a spark. The named gift: you choose one
-- person, write one line in your own words about why them, and they take it
-- up. What they catch carries its lineage — where it came from, and from whom
-- before that. A spark is small and can be handed over; that is the whole
-- reason it is a spark and not a flame.
--
-- Distinct from 160 (member→org invites). This is person→person, and in the
-- cold-landing phase it is the thing that CREATES membership.
--
-- Locks encoded here:
--   • The lineage is the giver's alone. spark_lineage() returns only sparks
--     descended from the caller's own. It is never public, never compared,
--     never ranked, and never shown to the people inside it. There is no
--     "top passer" query and no column that would support one.
--   • Nobody is nagged. There is no reminder column, no expiry, no read
--     receipt. A spark that is never taken up simply stays 'sent' forever.
--   • Names are denormalised at write time (giver_name), so the receive
--     screen never needs to read auth.users and no email is ever exposed to
--     a client. Addressing by email happens INSIDE send_spark, security
--     definer, and the address is not stored.
--   • receiver_id is nullable and `token` exists but is unused in v1. The
--     cold landing (a stranger's page → sign-up → caught with lineage
--     attached) is a later slice and is purely additive on this shape — no
--     migration of existing rows will be needed.
--   • One line, the person's own, 1–240 chars. Never pre-filled, never
--     machine-written.
--
-- Numbering: 180 is pulse_events; this is 181, the next free.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

-- ── sparks ──────────────────────────────────────────────────────────────────
create table if not exists public.sparks (
  id               uuid primary key default gen_random_uuid(),

  giver_id         uuid not null references auth.users(id) on delete cascade,
  giver_name       text,          -- denormalised at send time, display only
  receiver_id      uuid references auth.users(id) on delete set null,
  token            text unique,   -- cold landing, phase two. Null in v1.

  -- What is being passed. challenge_id is a plain uuid to match moments (170);
  -- the title and domain are denormalised so the receive screen stands alone
  -- even if the challenge is later renamed.
  challenge_id     uuid,
  challenge_title  text,
  domain           text,

  line             text not null
                     check (char_length(btrim(line)) between 1 and 240),

  status           text not null default 'sent'
                     check (status in ('sent', 'caught', 'declined')),

  -- Lineage: the spark THIS giver caught, if they were themselves given one.
  -- Null means they were there at the start.
  parent_spark_id  uuid references public.sparks(id) on delete set null,

  created_at       timestamptz not null default now(),
  caught_at        timestamptz,

  -- A spark is addressed to somebody: a known person, or (later) a token.
  constraint sparks_has_addressee check (receiver_id is not null or token is not null)
);

create index if not exists sparks_giver_idx    on public.sparks (giver_id, created_at desc);
create index if not exists sparks_receiver_idx on public.sparks (receiver_id, created_at desc)
  where receiver_id is not null;
create index if not exists sparks_parent_idx   on public.sparks (parent_spark_id)
  where parent_spark_id is not null;

comment on table public.sparks is
  'Person-to-person passing. The giver sees their own lineage and nobody else does; the receiver sees only the one spark addressed to them. No ranking column exists, deliberately.';

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.sparks enable row level security;

-- The giver sees what they gave.
drop policy if exists "spark giver read" on public.sparks;
create policy "spark giver read"
  on public.sparks for select
  using (auth.uid() = giver_id);

-- The receiver sees what was given to them — and nothing else.
drop policy if exists "spark receiver read" on public.sparks;
create policy "spark receiver read"
  on public.sparks for select
  using (auth.uid() = receiver_id);

-- Writes go through send_spark / catch_spark / decline_spark only. There is
-- deliberately no direct insert or update policy: status must not be
-- client-settable, and the addressee must be resolved server-side so no
-- email is ever handled by a browser.

commit;

-- ── send_spark ──────────────────────────────────────────────────────────────
-- Address by email, resolved inside the function so the address never travels
-- to or from a client. Follows add_cohort_member_by_email (174) exactly.
-- Returns 'sent', or raises a plain-language exception.
create or replace function public.send_spark(
  p_email text, p_line text, p_challenge_id uuid,
  p_challenge_title text, p_domain text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_name   text;
  v_parent uuid;
begin
  if v_uid is null then raise exception 'sign in first'; end if;
  if p_line is null or char_length(btrim(p_line)) = 0 then
    raise exception 'say why them, in your own words';
  end if;

  select id into v_target from auth.users
    where lower(email) = lower(btrim(p_email)) limit 1;
  if v_target is null then
    raise exception 'no one here with that email yet';
  end if;
  if v_target = v_uid then
    raise exception 'a spark goes to somebody else';
  end if;

  -- One live spark per pair per practice. Passing again after a decline is
  -- fine; passing twice while the first is still waiting is not.
  if exists (
    select 1 from public.sparks
    where giver_id = v_uid and receiver_id = v_target
      and coalesce(challenge_id::text, '') = coalesce(p_challenge_id::text, '')
      and status = 'sent'
  ) then
    raise exception 'you have already passed them this one — it is waiting';
  end if;

  -- The giver's display name, denormalised for the receive screen.
  select coalesce(
           nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
           split_part(email, '@', 1)
         )
    into v_name
    from auth.users where id = v_uid;

  -- Where the giver's own practice came from, if it was itself passed to them.
  select id into v_parent from public.sparks
    where receiver_id = v_uid and status = 'caught'
      and coalesce(challenge_id::text, '') = coalesce(p_challenge_id::text, '')
    order by caught_at desc limit 1;

  insert into public.sparks
    (giver_id, giver_name, receiver_id, challenge_id, challenge_title, domain,
     line, parent_spark_id)
  values
    (v_uid, v_name, v_target, p_challenge_id, p_challenge_title, p_domain,
     btrim(p_line), v_parent);

  return 'sent';
end $$;
revoke all on function public.send_spark(text,text,uuid,text,text) from public;
grant execute on function public.send_spark(text,text,uuid,text,text) to authenticated;

-- ── catch_spark / decline_spark ─────────────────────────────────────────────
-- Only the addressee may move a spark, and only out of 'sent'. Declining is
-- quiet: the giver sees it stopped there, and nothing further is ever sent.
create or replace function public.catch_spark(p_spark uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sign in first'; end if;
  update public.sparks
     set status = 'caught', caught_at = now()
   where id = p_spark and receiver_id = v_uid and status = 'sent';
  if not found then raise exception 'that spark is not waiting for you'; end if;
end $$;
revoke all on function public.catch_spark(uuid) from public;
grant execute on function public.catch_spark(uuid) to authenticated;

create or replace function public.decline_spark(p_spark uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sign in first'; end if;
  update public.sparks
     set status = 'declined'
   where id = p_spark and receiver_id = v_uid and status = 'sent';
  if not found then raise exception 'that spark is not waiting for you'; end if;
end $$;
revoke all on function public.decline_spark(uuid) from public;
grant execute on function public.decline_spark(uuid) to authenticated;

-- ── spark_lineage ───────────────────────────────────────────────────────────
-- The giver's private tree. Walks down from every spark this person gave,
-- through the sparks their receivers went on to give, and so on.
--
-- Privacy: returns a display name and a depth. It does NOT return user ids,
-- emails, the lines people wrote to each other, or anything orderable into a
-- ranking. A person who took it up and stopped appears exactly like a person
-- who passed it to five — the tree records that the spark travelled, not how
-- far. Callable only for yourself: the recursion is rooted at auth.uid().
create or replace function public.spark_lineage()
returns table (
  spark_id     uuid,
  parent_id    uuid,
  depth        int,
  person       text,
  status       text,
  caught_at    timestamptz,
  passed_on    bigint
)
language sql
security definer
set search_path = public
as $$
  with recursive mine as (
    -- everything I gave
    select s.id, s.parent_spark_id, 1 as depth, s.receiver_id, s.status, s.caught_at
      from public.sparks s
     where s.giver_id = auth.uid()
    union all
    -- everything they gave onward, and so on
    select c.id, c.parent_spark_id, m.depth + 1, c.receiver_id, c.status, c.caught_at
      from public.sparks c
      join mine m on c.parent_spark_id = m.id
     where m.depth < 8            -- a tree, not an unbounded walk
  )
  select
    m.id,
    m.parent_spark_id,
    m.depth,
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      'Someone'
    ) as person,
    m.status,
    m.caught_at,
    (select count(*) from public.sparks c
      where c.parent_spark_id = m.id and c.status = 'caught') as passed_on
  from mine m
  left join auth.users u on u.id = m.receiver_id
  order by m.depth, m.caught_at nulls last;
$$;
revoke all on function public.spark_lineage() from public;
grant execute on function public.spark_lineage() to authenticated;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should return 0 initially:
-- select count(*) from public.sparks;
-- -- Should return only your own tree, and nothing when you have given none:
-- select * from public.spark_lineage();
-- -- Should raise 'no one here with that email yet':
-- select public.send_spark('nobody@example.com', 'why them', null, null, null);
