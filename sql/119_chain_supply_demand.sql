-- ─────────────────────────────────────────────────────────────────────────────
-- 119_chain_supply_demand.sql
-- Demand-side vocabulary learning — Slice 4: the unmet-need readout (June 2026).
--
-- Supply and demand on the Atlas will diverge, and the gap is the gold. There
-- will be chains people keep arriving with that no live actor answers yet. That
-- is not a bug — it is the platform detecting an unmet need in the world, and
-- it is the seeding queue writing itself. For the women priority specifically:
-- if women keep bringing a concern no seeded org addresses, this readout is the
-- list of who to go find next.
--
-- This function returns, per ACTIVE chain:
--   actor_count       — live actors whose work answers it (supply)
--   track_count       — people who arrived matching it (demand)
--   is_demand_origin  — whether the chain was promoted from a demand cluster
--
-- It is SECURITY DEFINER so the aggregate can span all users' tracks without
-- exposing any row: only counts cross the boundary, never track content. The
-- AdminConsole (founder-gated) calls it via supabase.rpc().
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create or replace function public.nextus_chain_supply_demand()
returns table (
  slug             text,
  label            text,
  domains          text[],
  actor_count      bigint,
  track_count      bigint,
  is_demand_origin boolean
)
language sql
security definer
set search_path = public
as $$
  select
    c.slug,
    c.label,
    c.domains,
    coalesce(a.cnt, 0) as actor_count,
    coalesce(t.cnt, 0) as track_count,
    exists (
      select 1
      from nextus_problem_chain_proposals p
      where p.source = 'demand'
        and p.proposed_slug = c.slug
        and p.status = 'approved'
    ) as is_demand_origin
  from nextus_problem_chains c
  left join lateral (
    select count(*) as cnt
    from nextus_actors x
    where x.status = 'live'
      and c.slug = any(x.problem_chains)
  ) a on true
  left join lateral (
    select count(*) as cnt
    from nextsteps_tracks tr
    where c.slug = any(tr.problem_chains)
  ) t on true
  where c.status = 'active'
  -- Unmet first (no actors), then by how many people are waiting.
  order by (coalesce(a.cnt, 0) = 0) desc, coalesce(t.cnt, 0) desc, c.slug;
$$;

-- Counts only — non-sensitive. The readout itself is founder-gated in the UI.
grant execute on function public.nextus_chain_supply_demand() to authenticated;

commit;

-- ── Verification ──────────────────────────────────────────────────────────────
--   select * from public.nextus_chain_supply_demand() limit 30;
--   -- the unmet queue:
--   select slug, track_count from public.nextus_chain_supply_demand()
--     where actor_count = 0 order by track_count desc;
--
-- ── Rollback ───────────────────────────────────────────────────────────────────
--   drop function if exists public.nextus_chain_supply_demand();
