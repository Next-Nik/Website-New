-- ============================================================================
-- 183_moment_featured.sql
--
-- Social half · item 7 · Putting a moment at the top of the day. One or two
-- moments sit above the daily surface, chosen for the work — faithfulness,
-- return after a lapse, generosity, first steps — and never for numbers.
-- The brief called this "lifting"; in the product it is simply the founder
-- asking somebody whether their moment may go at the top, and them saying yes.
--
-- Locks encoded here:
--   • Consent first, always. Nothing renders at the top until the owner has
--     answered yes. Silence is a no (featured_consent stays 'pending' and the
--     read policy ignores it), and a no is never asked twice — ask_to_feature
--     refuses to re-ask a moment that was declined.
--   • Never metric-derived. There is no response count anywhere in this
--     schema to sort on — Echo was cut for exactly this reason — and the
--     founder-side query is ordered by time and nothing else.
--   • Rotation, not accumulation. A person featured in the last 30 days is
--     not eligible again. Enforced in the function, not left to discipline.
--   • Two a day, hard. The cap is the point; scarcity is what makes it mean
--     anything.
--   • Owners cannot feature themselves. This is the sharp edge: the existing
--     moments_owner_update policy (170) permits an owner to update ANY column
--     on their own row, so RLS alone would let anyone self-feature. The
--     trigger below closes that — the featured_* columns are writable only
--     from inside the two functions here.
--
-- Numbering: 182 is milestones; this is 183, the next free.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

-- ── columns ─────────────────────────────────────────────────────────────────
alter table public.moments add column if not exists featured_asked_at timestamptz;
alter table public.moments add column if not exists featured_at       timestamptz;
alter table public.moments add column if not exists featured_by       uuid references auth.users(id) on delete set null;
alter table public.moments add column if not exists featured_virtue   text;
alter table public.moments add column if not exists featured_consent  text not null default 'none';

alter table public.moments drop constraint if exists moments_featured_consent_check;
alter table public.moments add  constraint moments_featured_consent_check
  check (featured_consent in ('none', 'pending', 'yes', 'no'));

alter table public.moments drop constraint if exists moments_featured_virtue_check;
alter table public.moments add  constraint moments_featured_virtue_check
  check (featured_virtue is null or featured_virtue in (
    'faithfulness', 'return', 'generosity', 'first_step'
  ));

-- Live-at-the-top lookup, and the owner's pending-request lookup.
create index if not exists moments_featured_live_idx on public.moments (featured_at desc)
  where featured_at is not null and featured_consent = 'yes' and deleted_at is null;
create index if not exists moments_featured_pending_idx on public.moments (user_id)
  where featured_consent = 'pending' and deleted_at is null;

comment on column public.moments.featured_consent is
  'none | pending (asked, not answered) | yes | no. Silence stays pending forever and never renders. A no is never asked again.';

-- ── the guard ───────────────────────────────────────────────────────────────
-- moments_owner_update (170) lets an owner write any column on their own row.
-- Without this, self-featuring is a one-line fetch away. The featured_*
-- columns are writable ONLY from inside ask_to_feature / answer_feature,
-- which set a session flag before touching them.
create or replace function public.moments_featured_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('nextus.featuring', true), '') = 'on' then
    return new;
  end if;
  if new.featured_asked_at is distinct from old.featured_asked_at
     or new.featured_at      is distinct from old.featured_at
     or new.featured_by      is distinct from old.featured_by
     or new.featured_virtue  is distinct from old.featured_virtue
     or new.featured_consent is distinct from old.featured_consent
  then
    raise exception 'a moment reaches the top by being asked for and agreed to, not by being set';
  end if;
  return new;
end $$;

drop trigger if exists moments_featured_guard_trg on public.moments;
create trigger moments_featured_guard_trg
  before update on public.moments
  for each row execute function public.moments_featured_guard();

-- ── read: only consented, live moments read as featured ─────────────────────
-- The daily surface reads these through the ordinary moments_public_read
-- policy (171); no new read policy is needed. This view exists so the client
-- cannot accidentally render an un-consented ask.
create or replace view public.featured_moments_today as
  select id, user_id, line, image_path, thumb_path, domain, created_at,
         featured_at, featured_virtue
    from public.moments
   where deleted_at is null
     and featured_consent = 'yes'
     and featured_at is not null
     and featured_at >= date_trunc('day', now())
   order by featured_at;

comment on view public.featured_moments_today is
  'What is at the top of Today. Consented only, capped at two by ask_to_feature, ordered by when consent landed — never by any measure of response.';

commit;

-- ── ask_to_feature ──────────────────────────────────────────────────────────
-- Founder asks. Enforces the cap, the rotation rule, and the never-ask-twice
-- rule. Returns 'asked', or raises a plain-language exception.
create or replace function public.ask_to_feature(p_moment uuid, p_virtue text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_consent text;
  v_deleted timestamptz;
  v_today   int;
begin
  if not public.is_founder() then raise exception 'only the founder asks'; end if;

  select user_id, featured_consent, deleted_at
    into v_owner, v_consent, v_deleted
    from public.moments where id = p_moment;
  if v_owner is null then raise exception 'no such moment'; end if;
  if v_deleted is not null then raise exception 'that moment is not showing anywhere'; end if;
  if v_consent = 'no' then raise exception 'they said no — that is not asked again'; end if;
  if v_consent in ('pending', 'yes') then raise exception 'already asked'; end if;

  -- Two a day, counting both the asked and the agreed.
  select count(*) into v_today from public.moments
   where featured_asked_at >= date_trunc('day', now())
     and featured_consent in ('pending', 'yes');
  if v_today >= 2 then raise exception 'a day holds two — that is the point'; end if;

  -- Rotation, not accumulation.
  if exists (
    select 1 from public.moments
     where user_id = v_owner
       and featured_at is not null
       and featured_at > now() - interval '30 days'
  ) then
    raise exception 'they were at the top within the last 30 days — rotation, not accumulation';
  end if;

  perform set_config('nextus.featuring', 'on', true);
  update public.moments
     set featured_asked_at = now(),
         featured_by       = auth.uid(),
         featured_virtue   = p_virtue,
         featured_consent  = 'pending'
   where id = p_moment;
  perform set_config('nextus.featuring', 'off', true);

  return 'asked';
end $$;
revoke all on function public.ask_to_feature(uuid,text) from public;
grant execute on function public.ask_to_feature(uuid,text) to authenticated;

-- ── answer_feature ──────────────────────────────────────────────────────────
-- The owner answers, and only the owner. Yes puts it at the top now; no
-- closes the question permanently.
create or replace function public.answer_feature(p_moment uuid, p_yes boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_consent text;
begin
  if v_uid is null then raise exception 'sign in first'; end if;
  select user_id, featured_consent into v_owner, v_consent
    from public.moments where id = p_moment;
  if v_owner is null or v_owner <> v_uid then raise exception 'that is not yours to answer'; end if;
  if v_consent <> 'pending' then raise exception 'nothing is waiting on that one'; end if;

  perform set_config('nextus.featuring', 'on', true);
  if p_yes then
    update public.moments
       set featured_consent = 'yes', featured_at = now()
     where id = p_moment;
  else
    update public.moments
       set featured_consent = 'no'
     where id = p_moment;
  end if;
  perform set_config('nextus.featuring', 'off', true);
end $$;
revoke all on function public.answer_feature(uuid,boolean) from public;
grant execute on function public.answer_feature(uuid,boolean) to authenticated;

-- A view runs with the definer's rights unless told otherwise, so this one is
-- pinned to the invoker: reading the top of the day goes through the same
-- moments_public_read policy (171) as everything else, and stays signed-in only.
alter view public.featured_moments_today set (security_invoker = on);
revoke all on public.featured_moments_today from anon;
grant select on public.featured_moments_today to authenticated;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should be empty until somebody says yes:
-- select * from public.featured_moments_today;
-- -- Should raise 'a moment reaches the top by being asked for and agreed to':
-- update public.moments set featured_consent = 'yes' where user_id = auth.uid();
-- -- Should raise 'only the founder asks' when run as an ordinary member:
-- select public.ask_to_feature('00000000-0000-0000-0000-000000000000', 'first_step');
