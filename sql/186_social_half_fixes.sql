-- ============================================================================
-- 186_social_half_fixes.sql
--
-- Three holes found reviewing the social-half drop against the current tree.
-- All three are in 183_moment_featured.sql; this file replaces the affected
-- objects in place rather than editing 183, so it is unambiguous whether you
-- have applied the fix regardless of whether 183 already ran.
--
--   1. THE GUARD ONLY WATCHED UPDATES. 183 added a `before update` trigger to
--      stop an owner setting their own featured_* columns, because
--      moments_owner_update (170) permits writing any column on your own row.
--      But moments_owner_insert has the same shape and no trigger — so a
--      hand-rolled insert could create a moment that arrives already
--      featured. The normal capture path goes through /api/moment-upload
--      under the service role and never sets these, so nothing in the app hit
--      it; the hole was reachable from a console, which is enough. Now
--      guarded on insert as well.
--
--   2. THE TWO-A-DAY CAP COULD BE EXCEEDED. ask_to_feature counted asks made
--      today. An ask made yesterday and consented today lands at the top
--      today without ever being counted against today's two — so three could
--      show. The cap now counts what is actually live today as well as what
--      has been asked today.
--
--   3. CONSENT HAD NO SHELF LIFE. A request left unanswered stayed answerable
--      forever, which is what made (2) possible and also quietly contradicts
--      the standing rule that silence is a no. An ask is now answerable on
--      the day it was made and no longer; after that it lapses, unanswered,
--      and is never raised again.
--
-- Nothing here changes what the person sees when they say yes.
--
-- Numbering: 185_sparks is the highest live file after the 180/181
-- renumbering; this is 186.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

-- ── 1 · the guard, on insert as well as update ──────────────────────────────
-- A moment is created plain. The featured_* columns are writable only from
-- inside ask_to_feature / answer_feature, which set a transaction-local flag.
create or replace function public.moments_featured_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('nextus.featuring', true), '') = 'on' then
    return new;
  end if;
  if new.featured_asked_at is not null
     or new.featured_at     is not null
     or new.featured_by     is not null
     or new.featured_virtue is not null
     or coalesce(new.featured_consent, 'none') <> 'none'
  then
    raise exception 'a moment reaches the top by being asked for and agreed to, not by arriving that way';
  end if;
  return new;
end $$;

drop trigger if exists moments_featured_insert_guard_trg on public.moments;
create trigger moments_featured_insert_guard_trg
  before insert on public.moments
  for each row execute function public.moments_featured_insert_guard();

commit;

-- ── 2 + 3 · the cap counts what is live, and an ask lapses with the day ─────
create or replace function public.ask_to_feature(p_moment uuid, p_virtue text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_consent text;
  v_deleted timestamptz;
  v_asked   timestamptz;
  v_today   int;
begin
  if not public.is_founder() then raise exception 'only the founder asks'; end if;

  select user_id, featured_consent, deleted_at, featured_asked_at
    into v_owner, v_consent, v_deleted, v_asked
    from public.moments where id = p_moment;
  if v_owner is null then raise exception 'no such moment'; end if;
  if v_deleted is not null then raise exception 'that moment is not showing anywhere'; end if;
  if v_consent = 'no' then raise exception 'they said no — that is not asked again'; end if;
  if v_consent = 'yes' then raise exception 'already up there'; end if;
  -- A live request may not be asked twice. One that lapsed unanswered on an
  -- earlier day may be raised once more.
  if v_consent = 'pending' and v_asked >= date_trunc('day', now()) then
    raise exception 'already asked';
  end if;

  -- Two a day, hard: count what is at the top today AND what has been asked
  -- today. Counting only the asks let a consent from yesterday's request slip
  -- in as a third.
  select count(*) into v_today from public.moments
   where (featured_consent = 'yes'     and featured_at       >= date_trunc('day', now()))
      or (featured_consent = 'pending' and featured_asked_at >= date_trunc('day', now()));
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

-- An ask is answerable on the day it was made. After that it has lapsed —
-- silence is a no, and this is that rule with a clock on it.
create or replace function public.answer_feature(p_moment uuid, p_yes boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_consent text; v_asked timestamptz;
begin
  if v_uid is null then raise exception 'sign in first'; end if;
  select user_id, featured_consent, featured_asked_at
    into v_owner, v_consent, v_asked
    from public.moments where id = p_moment;
  if v_owner is null or v_owner <> v_uid then raise exception 'that is not yours to answer'; end if;
  if v_consent <> 'pending' then raise exception 'nothing is waiting on that one'; end if;
  if v_asked is null or v_asked < date_trunc('day', now()) then
    raise exception 'that one was for yesterday — it has passed';
  end if;

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

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should raise 'a moment reaches the top ... not by arriving that way':
-- insert into public.moments (user_id, line, featured_consent)
--   values (auth.uid(), 'test', 'yes');
-- -- Should still succeed (a plain moment):
-- insert into public.moments (user_id, line) values (auth.uid(), 'test');
-- -- Should never exceed two:
-- select count(*) from public.featured_moments_today;
