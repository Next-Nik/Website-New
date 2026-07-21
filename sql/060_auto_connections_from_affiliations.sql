-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 060 — Auto-Connections from shared affiliations
--
-- Updates send_message to compute the filing lane based on whether sender
-- and recipient share at least one Focus affiliation (citizen / resident /
-- working_here / etc. — any relationship_type to the same focus_id).
--
-- Logic on send:
--   1. If recipient has actively filed sender as 'inner_circle', 'restricted',
--      or 'blocked' — honour that (do not override).
--   2. Otherwise, if sender and recipient share at least one Focus affiliation
--      AND there's no existing filing row — file as 'connections'.
--   3. Otherwise — default to 'general' (current behaviour).
--
-- The auto-Connections logic only fires when filing is absent or 'general'.
-- It never overrides the recipient's manual choices.
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- Helper: do two users share at least one Focus affiliation?
-- "Share" means: there exists at least one focus_id where both have any
-- affiliation row. Relationship type does not need to match — being a citizen
-- of Canada and being a resident of Canada both count as Canada-affiliation.

create or replace function public.users_share_affiliation(user1 uuid, user2 uuid)
returns boolean as $$
  select exists (
    select 1
    from public.nextus_user_affiliations a1
    join public.nextus_user_affiliations a2
      on a1.focus_id = a2.focus_id
    where a1.user_id = user1
      and a2.user_id = user2
      and user1 <> user2
  );
$$ language sql stable;

-- Replace send_message with the auto-Connections-aware version.

create or replace function public.send_message(
  p_recipient_user_id  uuid default null,
  p_recipient_actor_id uuid default null,
  p_body               text default '',
  p_sender_actor_id    uuid default null
)
returns uuid as $$
declare
  v_sender_user_id   uuid := auth.uid();
  v_recipient_owner  uuid;
  v_thread_id        uuid;
  v_message_id       uuid;
  v_recent_count     integer;
  v_existing_lane    text;
  v_target_lane      text;
  v_should_autofile  boolean := false;
begin
  -- Auth check
  if v_sender_user_id is null then
    raise exception 'Authentication required to send a message';
  end if;

  -- Recipient XOR validation
  if (p_recipient_user_id is null and p_recipient_actor_id is null)
     or (p_recipient_user_id is not null and p_recipient_actor_id is not null) then
    raise exception 'Exactly one of recipient_user_id or recipient_actor_id must be set';
  end if;

  -- Body validation
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'Message body cannot be empty';
  end if;
  if length(p_body) > 10000 then
    raise exception 'Message body exceeds 10000 characters';
  end if;

  -- Sender-actor ownership check
  if p_sender_actor_id is not null then
    if not exists (
      select 1 from public.nextus_actors
      where id = p_sender_actor_id and profile_owner = v_sender_user_id
    ) then
      raise exception 'You cannot send messages as an actor you do not own';
    end if;
  end if;

  -- Resolve recipient owner
  if p_recipient_user_id is not null then
    v_recipient_owner := p_recipient_user_id;
  else
    v_recipient_owner := public.actor_owner_user_id(p_recipient_actor_id);
    if v_recipient_owner is null then
      raise exception 'This profile has not been claimed yet and cannot receive messages';
    end if;
  end if;

  -- Self-message prevention
  if v_recipient_owner = v_sender_user_id then
    raise exception 'Cannot send a message to yourself';
  end if;

  -- Look up existing filing lane for (recipient_hat, sender)
  select lane into v_existing_lane
  from public.nextus_inbox_filing
  where owner_user_id      = v_recipient_owner
    and (recipient_actor_id is not distinct from p_recipient_actor_id)
    and sender_user_id     = v_sender_user_id
  limit 1;

  -- Block enforcement: silent failure
  if v_existing_lane = 'blocked' then
    return null;
  end if;

  -- Auto-Connections logic:
  -- Only auto-promote if no filing yet, OR filing is 'general' (the default).
  -- Never override 'inner_circle' or 'restricted' — those are manual choices.
  if v_existing_lane is null or v_existing_lane = 'general' then
    if public.users_share_affiliation(v_sender_user_id, v_recipient_owner) then
      v_should_autofile := true;
      v_target_lane := 'connections';
    end if;
  end if;

  -- Rate limit: max 30 messages per sender per hour, max 100 per day
  select count(*) into v_recent_count
  from public.nextus_messages
  where sender_user_id = v_sender_user_id
    and created_at > now() - interval '1 hour';
  if v_recent_count >= 30 then
    raise exception 'Rate limit exceeded: too many messages sent in the last hour';
  end if;

  select count(*) into v_recent_count
  from public.nextus_messages
  where sender_user_id = v_sender_user_id
    and created_at > now() - interval '1 day';
  if v_recent_count >= 100 then
    raise exception 'Rate limit exceeded: too many messages sent today';
  end if;

  -- Apply auto-filing if computed
  if v_should_autofile then
    insert into public.nextus_inbox_filing (
      owner_user_id, recipient_actor_id, sender_user_id, lane, set_by, reason
    )
    values (
      v_recipient_owner, p_recipient_actor_id, v_sender_user_id, v_target_lane,
      null,             -- set_by is null because it's automatic, not the recipient
      'Auto: shared affiliation'
    )
    on conflict (owner_user_id, recipient_actor_id, sender_user_id)
    do update set lane = excluded.lane,
                  set_at = now(),
                  set_by = null,
                  reason = excluded.reason
    where nextus_inbox_filing.lane = 'general';  -- only promote from general
  end if;

  -- Get or create thread between the two humans
  v_thread_id := public.get_or_create_thread(v_sender_user_id, v_recipient_owner);

  -- Insert message
  insert into public.nextus_messages (
    thread_id, sender_user_id, sender_actor_id,
    recipient_user_id, recipient_actor_id, body
  )
  values (
    v_thread_id, v_sender_user_id, p_sender_actor_id,
    p_recipient_user_id, p_recipient_actor_id, p_body
  )
  returning id into v_message_id;

  -- Update thread's last_message_at and increment recipient's unread count
  update public.nextus_message_threads
  set last_message_at = now(),
      unread_for_user_a = case
        when user_a = v_recipient_owner then unread_for_user_a + 1
        else unread_for_user_a end,
      unread_for_user_b = case
        when user_b = v_recipient_owner then unread_for_user_b + 1
        else unread_for_user_b end
  where id = v_thread_id;

  return v_message_id;
end;
$$ language plpgsql security definer;

grant execute on function public.send_message(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.users_share_affiliation(uuid, uuid) to authenticated;

commit;

-- ─── Verification ────────────────────────────────────────────────────────────
-- After running, test the new helper directly:
--   SELECT public.users_share_affiliation('<user_id_a>', '<user_id_b>');
--   -- Returns true if they share at least one Focus affiliation.
--
-- Send a test message between two users who share an affiliation and verify
-- the recipient sees the thread in the 'connections' lane, not 'general'.
