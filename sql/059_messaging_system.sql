-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 059 — Messaging system schema
--
-- The in-platform messaging system. Hat-aware: messages carry both a sender
-- and recipient identity that can be either a person (user account) or an
-- actor (owned by a person). The same conversation threads across hat changes.
--
-- Five-lane recipient-side filing system:
--   inner_circle   — manually elevated by recipient
--   connections    — confirmed back-and-forth, or shared affiliation
--   general        — default for new senders (protective floor)
--   restricted     — hidden by default, viewable on demand
--   blocked        — message inserts from blocked senders fail
--
-- Filing is per (recipient_hat, sender_user). One person can be Inner Circle
-- for the recipient's practitioner profile but General for their personal
-- profile, because the relationships are different contexts.
--
-- Multi-hat:
--   - sender_user_id is always set (the human behind the keyboard)
--   - sender_actor_id is set when sending as a practitioner/org (the hat)
--   - recipient is EITHER user-direct OR an actor (one and only one set)
--   - threading is by participants — the same human pair keeps a thread
--     even if either side switches hats mid-conversation
--
-- Idempotent. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. nextus_message_threads ───────────────────────────────────────────────
-- A conversation between two participants. Participants are humans (user_ids),
-- not hats — the same human pair shares the same thread across hat changes.
-- The conversation's history records which hat each message was sent as.

create table if not exists public.nextus_message_threads (
  id                 uuid primary key default gen_random_uuid(),
  -- Canonicalised participant ordering: user_a < user_b lexicographically.
  -- Lets us uniquely identify a thread by the human pair.
  user_a             uuid not null references auth.users(id) on delete cascade,
  user_b             uuid not null references auth.users(id) on delete cascade,
  created_at         timestamptz not null default now(),
  last_message_at    timestamptz not null default now(),
  -- Number of unread messages, denormalised per side for fast inbox counts.
  -- Updated by triggers / RPCs.
  unread_for_user_a  integer not null default 0,
  unread_for_user_b  integer not null default 0,
  constraint nextus_message_threads_canonical_order check (user_a < user_b),
  unique (user_a, user_b)
);

create index if not exists nextus_message_threads_user_a_idx
  on public.nextus_message_threads (user_a, last_message_at desc);

create index if not exists nextus_message_threads_user_b_idx
  on public.nextus_message_threads (user_b, last_message_at desc);

alter table public.nextus_message_threads enable row level security;

drop policy if exists "threads readable to participants" on public.nextus_message_threads;
create policy "threads readable to participants" on public.nextus_message_threads
  for select using (auth.uid() = user_a or auth.uid() = user_b);

-- ─── 2. nextus_messages ──────────────────────────────────────────────────────
-- Individual messages. Each carries sender + recipient identity with hat info.

create table if not exists public.nextus_messages (
  id                  uuid primary key default gen_random_uuid(),
  thread_id           uuid not null references public.nextus_message_threads(id) on delete cascade,
  -- Sender side
  sender_user_id      uuid not null references auth.users(id) on delete cascade,
  sender_actor_id     uuid references public.nextus_actors(id) on delete set null,
  -- Recipient side: either user-direct OR actor (XOR)
  recipient_user_id   uuid references auth.users(id) on delete cascade,
  recipient_actor_id  uuid references public.nextus_actors(id) on delete cascade,
  -- Content
  body                text not null check (length(body) > 0 and length(body) <= 10000),
  -- Tracking
  read_at             timestamptz,
  created_at          timestamptz not null default now(),
  -- Soft delete by sender (recipient can't delete sender's content)
  deleted_at          timestamptz,
  -- Optional: a sender_actor_id implies sender is sending AS that actor.
  -- A recipient_actor_id implies message is addressed TO that actor.
  -- Either side may be null when the corresponding party is sending/receiving
  -- as a person rather than via an actor.
  constraint nextus_messages_recipient_xor check (
    (recipient_user_id is not null and recipient_actor_id is null) or
    (recipient_user_id is null     and recipient_actor_id is not null)
  )
);

create index if not exists nextus_messages_thread_idx
  on public.nextus_messages (thread_id, created_at desc);

create index if not exists nextus_messages_sender_idx
  on public.nextus_messages (sender_user_id, created_at desc);

create index if not exists nextus_messages_recipient_user_idx
  on public.nextus_messages (recipient_user_id, created_at desc)
  where recipient_user_id is not null;

create index if not exists nextus_messages_recipient_actor_idx
  on public.nextus_messages (recipient_actor_id, created_at desc)
  where recipient_actor_id is not null;

alter table public.nextus_messages enable row level security;

drop policy if exists "messages readable to participants" on public.nextus_messages;
create policy "messages readable to participants" on public.nextus_messages
  for select using (
    auth.uid() = sender_user_id
    or auth.uid() = recipient_user_id
    or (recipient_actor_id is not null and exists (
        select 1 from public.nextus_actors a
        where a.id = recipient_actor_id
        and a.profile_owner = auth.uid()
    ))
  );

-- Insert policy enforced via RPC (send_message) which also handles
-- thread creation, rate limiting, and block enforcement.

-- ─── 3. nextus_inbox_filing ──────────────────────────────────────────────────
-- Per-(recipient hat, sender user) lane assignment. The recipient hat is
-- either user-direct (recipient_actor_id is null, owner_user_id is the user)
-- or an actor (recipient_actor_id is set, owner_user_id is the actor's owner).

create table if not exists public.nextus_inbox_filing (
  id                  uuid primary key default gen_random_uuid(),
  -- The recipient hat:
  owner_user_id       uuid not null references auth.users(id) on delete cascade,
  recipient_actor_id  uuid references public.nextus_actors(id) on delete cascade,
  -- The sender (always identified by user_id, regardless of hat they sent as):
  sender_user_id      uuid not null references auth.users(id) on delete cascade,
  -- The lane assignment:
  lane                text not null default 'general'
                      check (lane in ('inner_circle','connections','general','restricted','blocked')),
  -- Audit trail
  set_by              uuid references auth.users(id) on delete set null,
  set_at              timestamptz not null default now(),
  reason              text,
  -- One row per (recipient hat, sender pair).
  -- recipient_actor_id may be null (the user's personal hat), so we need
  -- a partial unique constraint to handle both cases cleanly.
  unique (owner_user_id, recipient_actor_id, sender_user_id)
);

create index if not exists nextus_inbox_filing_owner_idx
  on public.nextus_inbox_filing (owner_user_id, recipient_actor_id, lane);

create index if not exists nextus_inbox_filing_sender_lookup_idx
  on public.nextus_inbox_filing (owner_user_id, sender_user_id);

alter table public.nextus_inbox_filing enable row level security;

drop policy if exists "filing readable to owner" on public.nextus_inbox_filing;
create policy "filing readable to owner" on public.nextus_inbox_filing
  for select using (auth.uid() = owner_user_id);

drop policy if exists "filing writable by owner" on public.nextus_inbox_filing;
create policy "filing writable by owner" on public.nextus_inbox_filing
  for all using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- ─── 4. nextus_inbox_settings ────────────────────────────────────────────────
-- Per-inbox configuration: custom name, per-lane email notifications.
-- One row per (owner_user_id, inbox_actor_id-or-null).

create table if not exists public.nextus_inbox_settings (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references auth.users(id) on delete cascade,
  inbox_actor_id      uuid references public.nextus_actors(id) on delete cascade,
  -- Display
  display_name        text,                                  -- user-chosen inbox name
  -- Per-lane email notification preferences
  email_inner_circle  boolean not null default true,
  email_connections   boolean not null default true,
  email_general       boolean not null default false,
  email_restricted    boolean not null default false,
  -- Updated tracking
  updated_at          timestamptz not null default now(),
  unique (owner_user_id, inbox_actor_id)
);

create index if not exists nextus_inbox_settings_owner_idx
  on public.nextus_inbox_settings (owner_user_id);

alter table public.nextus_inbox_settings enable row level security;

drop policy if exists "settings readable to owner" on public.nextus_inbox_settings;
create policy "settings readable to owner" on public.nextus_inbox_settings
  for select using (auth.uid() = owner_user_id);

drop policy if exists "settings writable by owner" on public.nextus_inbox_settings;
create policy "settings writable by owner" on public.nextus_inbox_settings
  for all using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- ─── 5. Helper function: canonical thread between two users ──────────────────
-- Returns the thread id between two users, creating one if it doesn't exist.

create or replace function public.get_or_create_thread(user1 uuid, user2 uuid)
returns uuid as $$
declare
  ua uuid;
  ub uuid;
  tid uuid;
begin
  if user1 = user2 then
    raise exception 'Cannot create thread with self';
  end if;
  if user1 < user2 then ua := user1; ub := user2;
  else                  ua := user2; ub := user1;
  end if;
  select id into tid from public.nextus_message_threads where user_a = ua and user_b = ub;
  if tid is null then
    insert into public.nextus_message_threads (user_a, user_b)
    values (ua, ub) returning id into tid;
  end if;
  return tid;
end;
$$ language plpgsql security invoker;

-- ─── 6. Helper function: who owns an actor (or null if not owned) ────────────

create or replace function public.actor_owner_user_id(actor_id uuid)
returns uuid as $$
  select profile_owner from public.nextus_actors where id = actor_id;
$$ language sql stable;

-- ─── 7. RPC: send_message ────────────────────────────────────────────────────
-- The canonical insert path. Enforces block, rate limiting, thread creation,
-- and unread-count increment. Inserts the message and returns it.
--
-- Arguments:
--   p_recipient_user_id   — if sending to a person directly
--   p_recipient_actor_id  — if sending to an actor
--   p_body                — message body
--   p_sender_actor_id     — optional: which hat the sender is sending as
--
-- Returns: the inserted message id

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
      -- Unclaimed ward — cannot receive messages until claimed.
      raise exception 'This profile has not been claimed yet and cannot receive messages';
    end if;
  end if;

  -- Self-message prevention
  if v_recipient_owner = v_sender_user_id then
    raise exception 'Cannot send a message to yourself';
  end if;

  -- Block enforcement: check the recipient's filing for this sender
  select lane into v_filing_lane
  from public.nextus_inbox_filing
  where owner_user_id      = v_recipient_owner
    and (recipient_actor_id is not distinct from p_recipient_actor_id)
    and sender_user_id     = v_sender_user_id
  limit 1;

  if v_filing_lane = 'blocked' then
    -- Silent failure: pretend success without inserting. The blocker shouldn't
    -- be tipped off that they're blocked. Return null as the message id.
    return null;
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

-- ─── 8. RPC: mark_message_read ──────────────────────────────────────────────

create or replace function public.mark_message_read(p_message_id uuid)
returns void as $$
declare
  v_user uuid := auth.uid();
  v_msg record;
begin
  if v_user is null then return; end if;

  select * into v_msg from public.nextus_messages where id = p_message_id;
  if not found then return; end if;
  if v_msg.read_at is not null then return; end if;

  -- Only the recipient (user-direct or actor-owner) can mark read
  if v_msg.recipient_user_id = v_user
     or (v_msg.recipient_actor_id is not null
         and public.actor_owner_user_id(v_msg.recipient_actor_id) = v_user) then
    update public.nextus_messages set read_at = now() where id = p_message_id;
    -- Decrement unread on thread for whichever side this user is on
    update public.nextus_message_threads
    set unread_for_user_a = greatest(0, case when user_a = v_user then unread_for_user_a - 1 else unread_for_user_a end),
        unread_for_user_b = greatest(0, case when user_b = v_user then unread_for_user_b - 1 else unread_for_user_b end)
    where id = v_msg.thread_id;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.mark_message_read(uuid) to authenticated;

-- ─── 9. RPC: set_filing_lane ────────────────────────────────────────────────
-- Move a sender to a specific lane for a recipient hat.

create or replace function public.set_filing_lane(
  p_recipient_actor_id uuid,    -- null for the user's personal inbox
  p_sender_user_id     uuid,
  p_lane               text,
  p_reason             text default null
)
returns void as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  if p_lane not in ('inner_circle','connections','general','restricted','blocked') then
    raise exception 'Invalid lane: %', p_lane;
  end if;

  -- If actor specified, ensure caller owns it
  if p_recipient_actor_id is not null then
    if not exists (
      select 1 from public.nextus_actors
      where id = p_recipient_actor_id and profile_owner = v_owner
    ) then
      raise exception 'You do not own that actor';
    end if;
  end if;

  insert into public.nextus_inbox_filing (
    owner_user_id, recipient_actor_id, sender_user_id, lane, set_by, reason
  )
  values (v_owner, p_recipient_actor_id, p_sender_user_id, p_lane, v_owner, p_reason)
  on conflict (owner_user_id, recipient_actor_id, sender_user_id)
  do update set lane = excluded.lane,
                set_at = now(),
                set_by = v_owner,
                reason = excluded.reason;
end;
$$ language plpgsql security definer;

grant execute on function public.set_filing_lane(uuid, uuid, text, text) to authenticated;

commit;

-- ─── Verification queries ────────────────────────────────────────────────────
-- After running, both should succeed:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name LIKE 'nextus_message%';
--   -- Expect: nextus_messages, nextus_message_threads, nextus_inbox_filing, nextus_inbox_settings
--
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema='public'
--     AND routine_name IN ('send_message','mark_message_read','set_filing_lane','get_or_create_thread');
--   -- Expect: four rows
