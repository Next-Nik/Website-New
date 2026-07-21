-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 050 — Roster / spoon allocator (Phase v2.5c)
--
-- Layer 3 of the bounded-attention architecture: influence / spoons.
-- 100 spoons total across 4 tiers (Deep 5×10, Sustained 10×5, Regular 20×2,
-- Light 30×1). Saturation cost 170 > budget 100 by design — the user must
-- choose the shape of their attention.
--
-- Server-enforced constraints:
--   1. Tier-slot cap (deep ≤ 5, sustained ≤ 10, regular ≤ 20, light ≤ 30)
--   2. Spoon-budget cap (sum of slot costs ≤ 100)
--
-- See: NextUs_Phase_2_5c_Spoon_Allocator_Spec.md for the architecture.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── nextus_user_roster_slots ──────────────────────────────────────────────
create table if not exists public.nextus_user_roster_slots (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  entity_type       text not null check (entity_type in ('focus','actor','person')),
  entity_id         uuid not null,
  tier              text not null check (tier in ('deep','sustained','regular','light')),
  allocated_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists nextus_user_roster_slots_user_idx
  on public.nextus_user_roster_slots (user_id);

create index if not exists nextus_user_roster_slots_user_tier_idx
  on public.nextus_user_roster_slots (user_id, tier);

alter table public.nextus_user_roster_slots enable row level security;

drop policy if exists "users read own roster" on public.nextus_user_roster_slots;
create policy "users read own roster"
  on public.nextus_user_roster_slots
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own roster" on public.nextus_user_roster_slots;
create policy "users insert own roster"
  on public.nextus_user_roster_slots
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own roster" on public.nextus_user_roster_slots;
create policy "users update own roster"
  on public.nextus_user_roster_slots
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own roster" on public.nextus_user_roster_slots;
create policy "users delete own roster"
  on public.nextus_user_roster_slots
  for delete using (auth.uid() = user_id);

-- ─── Trigger 1 — tier cap enforcement ──────────────────────────────────────
-- Refuses an insert or tier-update that would push a tier over its cap.
create or replace function public.enforce_roster_tier_caps()
returns trigger
language plpgsql
as $$
declare
  tier_cap integer;
  tier_count integer;
begin
  tier_cap := case NEW.tier
    when 'deep'      then 5
    when 'sustained' then 10
    when 'regular'   then 20
    when 'light'     then 30
  end;

  select count(*) into tier_count
  from public.nextus_user_roster_slots
  where user_id = NEW.user_id
    and tier = NEW.tier
    and (TG_OP = 'INSERT' or id <> NEW.id);

  if tier_count >= tier_cap then
    raise exception 'ROSTER_TIER_FULL'
      using hint = 'The ' || NEW.tier || ' tier is full (' || tier_cap || ' slots). Remove or downgrade an existing slot before adding here.';
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists nextus_user_roster_slots_tier_cap_trigger
  on public.nextus_user_roster_slots;

create trigger nextus_user_roster_slots_tier_cap_trigger
  before insert or update on public.nextus_user_roster_slots
  for each row
  execute function public.enforce_roster_tier_caps();

-- ─── Trigger 2 — budget enforcement ────────────────────────────────────────
-- Refuses an insert or tier-upgrade that would push total spoons over 100.
-- Tier-downgrades and removes are always allowed (free up the budget).
create or replace function public.enforce_roster_budget()
returns trigger
language plpgsql
as $$
declare
  current_spent integer;
  new_slot_cost integer;
  old_slot_cost integer;
  net_change integer;
begin
  new_slot_cost := case NEW.tier
    when 'deep'      then 10
    when 'sustained' then 5
    when 'regular'   then 2
    when 'light'     then 1
  end;

  if TG_OP = 'UPDATE' then
    old_slot_cost := case OLD.tier
      when 'deep'      then 10
      when 'sustained' then 5
      when 'regular'   then 2
      when 'light'     then 1
    end;
    net_change := new_slot_cost - old_slot_cost;
  else
    net_change := new_slot_cost;
  end if;

  if net_change <= 0 then
    return NEW;
  end if;

  select coalesce(sum(
    case tier
      when 'deep'      then 10
      when 'sustained' then 5
      when 'regular'   then 2
      when 'light'     then 1
    end
  ), 0) into current_spent
  from public.nextus_user_roster_slots
  where user_id = NEW.user_id
    and (TG_OP = 'INSERT' or id <> NEW.id);

  if current_spent + new_slot_cost > 100 then
    raise exception 'ROSTER_BUDGET_EXCEEDED'
      using hint = 'You only have ' || (100 - current_spent) || ' spoons left. Free some by downgrading or removing existing slots.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists nextus_user_roster_slots_budget_trigger
  on public.nextus_user_roster_slots;

create trigger nextus_user_roster_slots_budget_trigger
  before insert or update on public.nextus_user_roster_slots
  for each row
  execute function public.enforce_roster_budget();

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Insert one deep slot for a test user, then 5 more — the 6th should fail:
-- -- (use a real user_id and real entity_ids)
--
-- -- Insert 10 deep slots: by slot 6 ROSTER_TIER_FULL fires.
-- -- Insert 10 deep slots' worth of budget across tiers: 100 spoons fills,
-- -- 101 fires ROSTER_BUDGET_EXCEEDED.
