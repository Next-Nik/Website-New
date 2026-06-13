-- ─────────────────────────────────────────────────────────────────────────────
-- 123_issue_view_and_reconsideration.sql
-- Best Practices — Slice 5: the public Issue View + reconsideration.
--
-- The front door a visitor sees for an issue (a problem-chain): the best
-- practice, the viable alternatives, and the not-viable — all three, because an
-- invisible "no" gets re-proposed forever. Eliminated options are kept and
-- shown, politely but clearly, with the backed-up reason.
--
-- DIGNITY enforced in the data, not just the UI: the not-viable band returns the
-- practice and the reason, and NO actors — never a ranking-by-shame. The CASE in
-- `assembled` zeroes tiers and actors for ruled_out, so even a careless client
-- cannot surface who does it.
--
-- Reconsideration: a person can argue a ruled-out practice deserves another look,
-- but the bar is a substantive case, reviewed, never a debate. A practice with
-- reconsideration_open = false is settled (flat earth) and the submission is
-- refused outright. Submissions land for founder review; they never auto-reopen.
--
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The Issue View (public, security-definer, dignity-enforced) ────────────

create or replace function public.nextus_issue_view(p_chain text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with chain as (
    select slug, label, description
    from nextus_problem_chains
    where slug = p_chain
  ),
  prac as (
    select p.*
    from nextus_practices p
    where p.standing in ('best','alternative','ruled_out')
      and p_chain = any(p.problem_chains)
  ),
  prac_tiers as (
    select t.practice_id,
      jsonb_agg(jsonb_build_object(
        'position', t.position, 'label', t.label, 'looks_like', t.looks_like,
        'resource_level', t.resource_level, 'scale', t.scale
      ) order by t.position) as tiers
    from nextus_practice_tiers t
    join prac p on p.id = t.practice_id and p.standing in ('best','alternative')
    group by t.practice_id
  ),
  prac_actors as (
    select e.practice_id,
      jsonb_agg(distinct jsonb_build_object('name', a.name, 'slug', a.slug)) as actors
    from nextus_practice_embodiments e
    join prac p on p.id = e.practice_id and p.standing in ('best','alternative')
    join nextus_actors a on a.id = e.actor_id and a.status = 'live'
    where e.confirmed = true
    group by e.practice_id
  ),
  assembled as (
    select
      p.id, p.name, p.slug, p.statement, p.standing,
      p.standing_rationale, p.reconsideration_open,
      -- DIGNITY: tiers and actors only for the adoptable bands; never ruled_out.
      case when p.standing in ('best','alternative') then coalesce(pt.tiers, '[]'::jsonb) else '[]'::jsonb end as tiers,
      case when p.standing in ('best','alternative') then coalesce(pa.actors, '[]'::jsonb) else '[]'::jsonb end as actors
    from prac p
    left join prac_tiers  pt on pt.practice_id = p.id
    left join prac_actors pa on pa.practice_id = p.id
  )
  select jsonb_build_object(
    'chain',       (select to_jsonb(c) from chain c),
    'best',        coalesce((select jsonb_agg(to_jsonb(a)) from assembled a where a.standing = 'best'),        '[]'::jsonb),
    'alternative', coalesce((select jsonb_agg(to_jsonb(a)) from assembled a where a.standing = 'alternative'), '[]'::jsonb),
    'ruled_out',   coalesce((select jsonb_agg(to_jsonb(a)) from assembled a where a.standing = 'ruled_out'),   '[]'::jsonb)
  );
$$;

grant execute on function public.nextus_issue_view(text) to anon, authenticated;


-- ── 2. Reconsideration submissions ────────────────────────────────────────────
-- A logged substantive case for reopening a ruled-out practice. Pending until a
-- founder reviews. Never auto-reopens anything. Service-role write (via the
-- gated endpoint, which refuses settled practices).

create table if not exists public.nextus_practice_reconsiderations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  practice_id  uuid not null references public.nextus_practices (id) on delete cascade,
  submitted_by uuid references auth.users (id) on delete set null,
  basis        text not null,
  status       text not null default 'pending' check (status in ('pending','accepted','rejected')),
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz
);

create index if not exists idx_practice_reconsiderations_practice on public.nextus_practice_reconsiderations (practice_id);
create index if not exists idx_practice_reconsiderations_status   on public.nextus_practice_reconsiderations (status);

alter table public.nextus_practice_reconsiderations enable row level security;

commit;

-- ── Verification ──────────────────────────────────────────────────────────────
--   select public.nextus_issue_view('loneliness');
--   select status, count(*) from public.nextus_practice_reconsiderations group by status;
--
-- ── Rollback ───────────────────────────────────────────────────────────────────
--   drop function if exists public.nextus_issue_view(text);
--   drop table if exists public.nextus_practice_reconsiderations;
