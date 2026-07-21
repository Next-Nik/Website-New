-- 138_identity_threads.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Identity-pair threading (June 2026).
--
-- Until now a conversation was keyed on the HUMAN pair: one thread per
-- (user_a, user_b), with the hat (sender_actor_id) recorded per message.
-- That made two things impossible:
--   • an org messaging a person who happens to be its own owner
--   • you, acting as one identity, messaging another identity you own
-- because both resolve to the same human, and a thread required two DISTINCT
-- humans (CHECK user_a < user_b) plus an explicit self-thread block.
--
-- This migration re-keys threads on the IDENTITY pair. A party is either a
-- person (user, no actor) or an actor (the owner's user + the actor id). The
-- identity key is:  'a:'||actor_id   for an actor party
--                    'u:'||user_id    for a personal party
-- A thread is unique per unordered identity-key pair. Access (RLS) still keys
-- on the humans behind each party, so who-can-read is unchanged.
--
-- Consequence (intended): a message from an actor to a person is a SEPARATE
-- conversation from that person's personal DMs with the actor's owner. Entities
-- are separate. The org's correspondence is the org's.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Party hats on the thread ──────────────────────────────────────────────
alter table public.nextus_message_threads
  add column if not exists actor_a uuid references public.nextus_actors(id) on delete cascade,
  add column if not exists actor_b uuid references public.nextus_actors(id) on delete cascade;

-- ── 2. Drop the human-pair constraints ───────────────────────────────────────
-- The canonical-order check forbade self (user_a < user_b); the unique key
-- forced one thread per human pair. Both are replaced by an identity-pair
-- unique index below. The unique key was auto-named, so drop it by lookup.
alter table public.nextus_message_threads
  drop constraint if exists nextus_message_threads_canonical_order;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.nextus_message_threads'::regclass
      and contype = 'u'
  loop
    execute format('alter table public.nextus_message_threads drop constraint %I', r.conname);
  end loop;
end $$;

-- ── 3. One thread per unordered identity pair ─────────────────────────────────
-- Existing rows have actor_a/actor_b null, so their keys are 'u:'||user_x —
-- exactly the old human-pair semantics, so existing uniqueness is preserved.
create unique index if not exists nextus_threads_identity_pair_uniq
  on public.nextus_message_threads (
    least(
      coalesce('a:' || actor_a::text, 'u:' || user_a::text),
      coalesce('a:' || actor_b::text, 'u:' || user_b::text)
    ),
    greatest(
      coalesce('a:' || actor_a::text, 'u:' || user_a::text),
      coalesce('a:' || actor_b::text, 'u:' || user_b::text)
    )
  );

-- ── 4. Identity-aware thread resolver ─────────────────────────────────────────
-- Returns the thread between two identities, creating it if absent. Canonical
-- ordering is by identity key so either argument order finds the same thread.
-- SECURITY INVOKER, matching the prior helper: it is only ever called from
-- send_message (SECURITY DEFINER), under whose rights the insert proceeds.
create or replace function public.get_or_create_identity_thread(
  p_user1 uuid, p_actor1 uuid, p_user2 uuid, p_actor2 uuid
)
returns uuid as $$
declare
  key1 text := coalesce('a:' || p_actor1::text, 'u:' || p_user1::text);
  key2 text := coalesce('a:' || p_actor2::text, 'u:' || p_user2::text);
  ua uuid; aa uuid; ub uuid; ab uuid;
  tid uuid;
begin
  if key1 = key2 then
    raise exception 'Cannot create a thread between an identity and itself';
  end if;

  -- Assign the lexicographically-smaller key to side A.
  if key1 < key2 then
    ua := p_user1; aa := p_actor1; ub := p_user2; ab := p_actor2;
  else
    ua := p_user2; aa := p_actor2; ub := p_user1; ab := p_actor1;
  end if;

  select id into tid
  from public.nextus_message_threads
  where least(
          coalesce('a:' || actor_a::text, 'u:' || user_a::text),
          coalesce('a:' || actor_b::text, 'u:' || user_b::text)
        ) = least(key1, key2)
    and greatest(
          coalesce('a:' || actor_a::text, 'u:' || user_a::text),
          coalesce('a:' || actor_b::text, 'u:' || user_b::text)
        ) = greatest(key1, key2);

  if tid is null then
    insert into public.nextus_message_threads (user_a, actor_a, user_b, actor_b)
    values (ua, aa, ub, ab)
    returning id into tid;
  end if;

  return tid;
end;
$$ language plpgsql security invoker;

-- ── 5. send_message — identity-aware ──────────────────────────────────────────
-- Block is replaced by an identity self-send guard (an identity cannot message
-- itself). Unread is incremented on the recipient PARTY (a or b), matched by
-- identity, so self-threads (both parties the same human, different hats) count
-- correctly.
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
  v_filing_lane      text;
  v_send_key         text;
  v_recv_key         text;
  v_recipient_side   char(1);
  t                  record;
begin
  if v_sender_user_id is null then
    raise exception 'Authentication required to send a message';
  end if;

  if (p_recipient_user_id is null and p_recipient_actor_id is null)
     or (p_recipient_user_id is not null and p_recipient_actor_id is not null) then
    raise exception 'Exactly one of recipient_user_id or recipient_actor_id must be set';
  end if;

  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'Message body cannot be empty';
  end if;
  if length(p_body) > 10000 then
    raise exception 'Message body exceeds 10000 characters';
  end if;

  -- Sender must own the hat they are sending as.
  if p_sender_actor_id is not null then
    if not exists (
      select 1 from public.nextus_actors
      where id = p_sender_actor_id and profile_owner = v_sender_user_id
    ) then
      raise exception 'You cannot send messages as an actor you do not own';
    end if;
  end if;

  -- Resolve the human behind the recipient.
  if p_recipient_user_id is not null then
    v_recipient_owner := p_recipient_user_id;
  else
    v_recipient_owner := public.actor_owner_user_id(p_recipient_actor_id);
    if v_recipient_owner is null then
      raise exception 'This profile has not been claimed yet and cannot receive messages';
    end if;
  end if;

  -- Identity self-send guard: only a message from an identity to that SAME
  -- identity is disallowed. Acting as a different hat is a different identity.
  v_send_key := coalesce('a:' || p_sender_actor_id::text,    'u:' || v_sender_user_id::text);
  v_recv_key := coalesce('a:' || p_recipient_actor_id::text, 'u:' || p_recipient_user_id::text);
  if v_send_key = v_recv_key then
    raise exception 'Cannot send a message to the same identity';
  end if;

  -- Block enforcement: a blocked sender (by human) on the recipient hat fails
  -- silently — the blocker is never tipped off.
  select lane into v_filing_lane
  from public.nextus_inbox_filing
  where owner_user_id      = v_recipient_owner
    and (recipient_actor_id is not distinct from p_recipient_actor_id)
    and sender_user_id     = v_sender_user_id
  limit 1;

  if v_filing_lane = 'blocked' then
    return null;
  end if;

  -- Rate limits: 30/hour, 100/day per sender human.
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

  -- Thread between the two identities.
  v_thread_id := public.get_or_create_identity_thread(
    v_sender_user_id,  p_sender_actor_id,
    v_recipient_owner, p_recipient_actor_id
  );

  insert into public.nextus_messages (
    thread_id, sender_user_id, sender_actor_id,
    recipient_user_id, recipient_actor_id, body
  )
  values (
    v_thread_id, v_sender_user_id, p_sender_actor_id,
    p_recipient_user_id, p_recipient_actor_id, p_body
  )
  returning id into v_message_id;

  -- Which party (a or b) is the recipient identity? Match the identity key.
  select user_a, actor_a, user_b, actor_b into t
  from public.nextus_message_threads where id = v_thread_id;

  if v_recv_key = coalesce('a:' || t.actor_a::text, 'u:' || t.user_a::text) then
    v_recipient_side := 'a';
  else
    v_recipient_side := 'b';
  end if;

  update public.nextus_message_threads
  set last_message_at = now(),
      unread_for_user_a = case when v_recipient_side = 'a' then unread_for_user_a + 1 else unread_for_user_a end,
      unread_for_user_b = case when v_recipient_side = 'b' then unread_for_user_b + 1 else unread_for_user_b end
  where id = v_thread_id;

  return v_message_id;
end;
$$ language plpgsql security definer;

grant execute on function public.send_message(uuid, uuid, text, uuid) to authenticated;

-- ── 6. mark_message_read — decrement the recipient PARTY ──────────────────────
-- Matches the message's recipient identity to a thread party so a self-thread
-- decrements the right side even though both sides are the same human.
create or replace function public.mark_message_read(p_message_id uuid)
returns void as $$
declare
  v_user uuid := auth.uid();
  v_msg  record;
  t      record;
  v_recv_key text;
  v_side char(1);
begin
  if v_user is null then return; end if;

  select * into v_msg from public.nextus_messages where id = p_message_id;
  if not found then return; end if;
  if v_msg.read_at is not null then return; end if;

  -- Only the recipient (user-direct or actor-owner) may mark read.
  if v_msg.recipient_user_id = v_user
     or (v_msg.recipient_actor_id is not null
         and public.actor_owner_user_id(v_msg.recipient_actor_id) = v_user) then

    update public.nextus_messages set read_at = now() where id = p_message_id;

    select user_a, actor_a, user_b, actor_b into t
    from public.nextus_message_threads where id = v_msg.thread_id;

    v_recv_key := coalesce('a:' || v_msg.recipient_actor_id::text, 'u:' || v_msg.recipient_user_id::text);
    if v_recv_key = coalesce('a:' || t.actor_a::text, 'u:' || t.user_a::text) then
      v_side := 'a';
    else
      v_side := 'b';
    end if;

    update public.nextus_message_threads
    set unread_for_user_a = case when v_side = 'a' then greatest(0, unread_for_user_a - 1) else unread_for_user_a end,
        unread_for_user_b = case when v_side = 'b' then greatest(0, unread_for_user_b - 1) else unread_for_user_b end
    where id = v_msg.thread_id;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.mark_message_read(uuid) to authenticated;
