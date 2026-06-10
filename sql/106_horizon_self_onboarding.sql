-- ─────────────────────────────────────────────────────────────────────────────
-- 106_horizon_self_onboarding.sql
--
-- The construction substrate for the NextU journey, Chapters Three and Four.
-- One row per user. Steps 1–7 (Horizon Self) and step 8 (The Horizon
-- Biography) write into this row; the daily Practice activates what it holds.
--
-- Per: Horizon_Self_Onboarding_Living_Architecture_v1_0.md, Section 7.
--
-- status:
--   in_progress           — construction underway
--   construction_complete — steps 1–7 done (journey Chapter Three complete)
--   complete              — Biography done (journey Chapter Four complete)
--
-- current_step: 1–8. Where the user resumes.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.horizon_self_onboarding (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,

  status                text not null default 'in_progress'
                          check (status in ('in_progress','construction_complete','complete')),
  current_step          integer not null default 1 check (current_step between 1 and 8),

  -- Step 1 — Arrival: the Quantum Leap
  arrival_notes         jsonb,   -- { notice, want_to_do, body_difference }

  -- Step 2 — Avatar State: the somatic library
  somatic_library       jsonb,   -- { posture, gaze, breath, voice, signature_thought, body_notes }

  -- Step 3 — Permission & Safety
  permission_safety     jsonb,   -- { unsafe, permission, who_benefits }

  -- Step 4 — The Code (the six locked categories)
  code                  jsonb,   -- { drivers, values, thoughts, feelings, actions, priorities }

  -- Step 5 — The Quantum Gap
  quantum_gap           jsonb,   -- [ { current, horizon, focus } ]

  -- Step 6 — Horizon Beliefs (per the seven domains)
  horizon_beliefs       jsonb,   -- { path: {old_belief, horizon_knows}, … }

  -- The synthesised Horizon Self statement (offered after Step 6)
  synthesised_statement text,

  -- Step 7 — The Daily Leap
  daily_leap            jsonb,   -- { action, habit, toleration }

  -- Step 8 — The Horizon Biography (journey Chapter Four)
  biography             text,
  from_here_forward     text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists horizon_self_onboarding_user_idx
  on public.horizon_self_onboarding (user_id);

-- ─── Row Level Security — standard pattern ──────────────────────────────────

alter table public.horizon_self_onboarding enable row level security;

drop policy if exists "users select own onboarding" on public.horizon_self_onboarding;
create policy "users select own onboarding"
  on public.horizon_self_onboarding
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own onboarding" on public.horizon_self_onboarding;
create policy "users insert own onboarding"
  on public.horizon_self_onboarding
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own onboarding" on public.horizon_self_onboarding;
create policy "users update own onboarding"
  on public.horizon_self_onboarding
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own onboarding" on public.horizon_self_onboarding;
create policy "users delete own onboarding"
  on public.horizon_self_onboarding
  for delete using (auth.uid() = user_id);

commit;
