-- ============================================================================
-- 184_pulse_events.sql
--
-- Social half · item 2 · The pulse threaded through the daily surface. The
-- ticker of true sentences already exists (nextus_platform_activity, 109) but
-- only three of its seven event types are ever written, and none of them come
-- from the daily loop. This widens the CHECK so a check-in, a posted moment,
-- and a caught spark can appear as motion on /today.
--
-- Locks encoded here:
--   • The privacy law of 109 is untouched. This table still has NO user_id
--     column and never will. The three new event types are all written
--     WITHOUT naming the acting person — a check-in is "Someone kept a
--     practice in Nature", never "Maria checked in". The subject is the
--     public thing (the challenge, the domain), never the human.
--   • subject_type gains 'challenge' and 'spark' so the new lines have
--     somewhere honest to point.
--   • Nothing is backfilled. The pulse starts from now; a fabricated past
--     would break the data-integrity law on its first day.
--
-- Numbering: renumbered from 180, which three parallel drops claimed at once
-- (Care Protocol, NextSteps phases, this). 183 was the highest uncontested
-- number in the tree; this is 184. See the tombstone left at 180.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

-- ── event_type: add the three daily-loop events ─────────────────────────────
alter table public.nextus_platform_activity
  drop constraint if exists nextus_platform_activity_event_type_check;

alter table public.nextus_platform_activity
  add constraint nextus_platform_activity_event_type_check
  check (event_type in (
    'actor_added',      -- a new actor went live on the Atlas
    'practice_added',   -- a practice was contributed
    'tune_in',          -- someone tuned in (always anonymous)
    'need_posted',      -- an actor posted a need
    'event_published',  -- an event went up
    'step_forward',     -- someone stepped forward on a need (anonymous)
    'listing_added',    -- a NextMarket listing went live
    'check_in',         -- someone kept a practice today (anonymous)
    'moment_posted',    -- a moment landed on the daily surface (anonymous)
    'spark_caught'      -- a passed spark was taken up (anonymous both ends)
  ));

-- ── subject_type: the new events point at a challenge or a spark ────────────
alter table public.nextus_platform_activity
  drop constraint if exists nextus_platform_activity_subject_type_check;

alter table public.nextus_platform_activity
  add constraint nextus_platform_activity_subject_type_check
  check (subject_type is null or subject_type in (
    'actor','practice','domain','subdomain','field','focus',
    'event','need','listing','challenge','spark'
  ));

-- The daily surface reads a short recent window, newest first.
create index if not exists nextus_platform_activity_recent_idx
  on public.nextus_platform_activity (created_at desc);

comment on table public.nextus_platform_activity is
  'The public pulse. Structurally cannot name the acting person — there is no user_id column, by design. Check-ins, moments and caught sparks appear as anonymous motion; only already-public subjects (a live actor, a contributed practice) are ever named.';

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should succeed:
-- insert into public.nextus_platform_activity (event_type, subject_type, domain)
--   values ('check_in', 'challenge', 'nature');
-- -- Should fail with a check violation:
-- insert into public.nextus_platform_activity (event_type) values ('nonsense');
