-- ============================================================================
-- 179_field_guide_v4.sql
--
-- Field Guide v4 (July 2026) — the three things v3 left derived or missing.
--
-- Context: v3 (migration 178) shipped the life-list at /guide. It carried a
-- client-side "Nº 012" dex number and a client-side banding code, both
-- computed from alphabetical position over a capped 1000-row query. The Nº
-- is being REMOVED entirely (decision, 25 July: organisations are listed
-- alphabetically and do not need numbering — the champions ring is the
-- ordered thing, and the user orders it themselves). The banding code stays,
-- but becomes real data instead of a render-time accident.
--
--   1. nextus_actors.band_code — the birder-style code (REGE 1, TIDE 2)
--      persisted once and never recomputed. Previously derived per page
--      load from whatever subset happened to be in memory, which meant a
--      code could change when an unrelated org was added, and collided
--      silently past the 1000-row cap. Assigned on insert by trigger,
--      backfilled alphabetically so today's visible codes are preserved.
--
--   2. actor_champions.rank — champions are the one ordered thing in the
--      guide. The user arranges their own five to ten. v3 ordered by
--      created_at, which the user cannot change. Adds the column, the
--      backfill, an insert default, and the UPDATE policy that 178 never
--      granted (reordering was impossible under the old RLS set).
--
--      Rank is ORDERING, not identity: it is 1-based and ascending, but not
--      guaranteed contiguous. The insert trigger assigns max+1 and nothing
--      renumbers on delete, so removing a champion leaves a gap (1,2,4,5)
--      until the next reorder rewrites the ring. That is deliberate — a
--      renumber-on-delete trigger would rewrite other rows behind the user's
--      back — and the client sorts by rank rather than assuming its values.
--
--   3. actor_field_notes.met_via / met_where — provenance for the ruled
--      Date / Where / Via logbox in the specimen card (v3 mockup §03).
--      Nothing recorded HOW an encounter happened, so the logbox could not
--      be built. Captured at collect time going forward; historical rows
--      stay null and the logbox omits those lines rather than inventing them.
--
-- Idempotent. Run manually in the Supabase SQL editor, AFTER 178.
-- ============================================================================

begin;

-- ─── 1. Persisted banding codes ─────────────────────────────────────────────

alter table public.nextus_actors
  add column if not exists band_code text;

-- The banding root: first two letters of the first two words, else the first
-- four letters, padded with X.
--
-- Tracks bandRoot() in FieldGuide.jsx: upper-case FIRST, then strip anything
-- that isn't A–Z or whitespace, in that order — reversing the two changes the
-- answer for any character whose upper-case form is an ASCII letter.
--
-- Not a bit-exact mirror, and cannot be: JS applies full Unicode case mapping,
-- so 'ß' becomes 'SS' and 'Straße' roots to STRA, while Postgres upper() maps
-- it 1:1 and roots to STEX. The persisted band_code is authoritative wherever
-- the two disagree — the client only derives a code when the column is absent
-- — so the visible effect is limited to a one-time change of code for such
-- names when this migration runs. Names with no A–Z letters at all (Cyrillic,
-- CJK) collapse to XXXX in BOTH implementations and therefore share a root;
-- the code is a Latin-alphabet birding convention and does not carry meaning
-- for them. Worth revisiting if the Atlas leans non-Latin.
create or replace function public.actor_band_root(p_name text)
returns text
language sql
immutable
as $$
  with w as (
    select array_remove(
             regexp_split_to_array(
               regexp_replace(upper(coalesce(p_name, '')), '[^A-Z[:space:]]', ' ', 'g'),
               '\s+'
             ),
             ''
           ) as words
  )
  select rpad(
           case
             when coalesce(array_length(words, 1), 0) >= 2
               then substr(words[1], 1, 2) || substr(words[2], 1, 2)
             else substr(coalesce(words[1], 'XXXX'), 1, 4)
           end,
           4, 'X'
         )
  from w;
$$;

-- Backfill in name order, so every code visible in the UI today survives.
--
-- Counters continue from the highest already in use for that root rather than
-- restarting at 1. On a first run nothing is assigned yet and this is simply
-- 1..n; on any later run — an operator cleared one bad code and re-ran the
-- file — it appends instead of colliding with codes the trigger has since
-- handed out. Only well-formed 'ROOT n' codes are counted, so a hand-mangled
-- value can't poison the sequence.
with existing as (
  select public.actor_band_root(name) as root,
         max((substring(band_code from ' ([0-9]+)$'))::int) as max_n
    from public.nextus_actors
   where band_code ~ '^[A-Z]{4} [0-9]+$'
   group by 1
),
numbered as (
  select id,
         public.actor_band_root(name) as root,
         row_number() over (
           partition by public.actor_band_root(name)
           order by name, id
         ) as n
    from public.nextus_actors
   where band_code is null
)
update public.nextus_actors a
   set band_code = numbered.root || ' ' || (coalesce(existing.max_n, 0) + numbered.n)
  from numbered
  left join existing on existing.root = numbered.root
 where numbered.id = a.id;

-- New actors take the next free counter for their root. Codes are assigned
-- once and never reshuffled — an org's code is its own from insert onward.
create or replace function public.assign_actor_band_code()
returns trigger
language plpgsql
as $$
declare
  v_root text;
  v_next int;
begin
  if new.band_code is not null and btrim(new.band_code) <> '' then
    return new;
  end if;

  v_root := public.actor_band_root(new.name);

  -- Count only codes of the exact shape this function produces. An earlier
  -- version matched `like v_root || ' %'` and cast the second token to int,
  -- which meant one hand-edited value ('LOOM 2b', or a trailing space) made
  -- EVERY later insert sharing that root raise — surfacing as a failed
  -- add-actor call and a broken cold-invite flow, the one outcome this file
  -- says is never worth risking. A malformed code is now simply not counted.
  -- v_root is A–Z only, so it cannot carry regex metacharacters.
  select coalesce(max((substring(band_code from ' ([0-9]+)$'))::int), 0) + 1
    into v_next
    from public.nextus_actors
   where band_code ~ ('^' || v_root || ' [0-9]+$');

  new.band_code := v_root || ' ' || v_next;
  return new;
end;
$$;

drop trigger if exists trg_assign_actor_band_code on public.nextus_actors;
create trigger trg_assign_actor_band_code
  before insert on public.nextus_actors
  for each row execute function public.assign_actor_band_code();

create index if not exists nextus_actors_band_code_idx
  on public.nextus_actors (band_code);

-- ─── 2. Ordered champions ───────────────────────────────────────────────────

alter table public.actor_champions
  add column if not exists rank int;

-- Backfill to the order they were chosen in, so nobody's ring visibly moves.
with numbered as (
  select id,
         row_number() over (partition by user_id order by created_at, id) as n
  from public.actor_champions
)
update public.actor_champions c
   set rank = numbered.n
  from numbered
 where numbered.id = c.id
   and c.rank is null;

-- A new champion lands at the end of the ring, not the front.
create or replace function public.assign_champion_rank()
returns trigger
language plpgsql
as $$
begin
  if new.rank is null then
    select coalesce(max(rank), 0) + 1
      into new.rank
      from public.actor_champions
     where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_champion_rank on public.actor_champions;
create trigger trg_assign_champion_rank
  before insert on public.actor_champions
  for each row execute function public.assign_champion_rank();

create index if not exists actor_champions_user_rank_idx
  on public.actor_champions (user_id, rank);

-- 178 granted select / insert / delete but NOT update, so reordering was
-- impossible. Grant it, scoped to the owner on both sides.
drop policy if exists "users update own champions" on public.actor_champions;
create policy "users update own champions"
  on public.actor_champions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 3. Encounter provenance ────────────────────────────────────────────────
-- The logbox's Where / Via lines. Free text, written by the client at collect
-- time from the surface the user was on. Nullable and unconstrained on
-- purpose: historical rows have no provenance and must stay honest about it
-- rather than be backfilled with a guess.

alter table public.actor_field_notes
  add column if not exists met_via   text,
  add column if not exists met_where text;

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Every actor has a code:
-- select count(*) as missing from public.nextus_actors where band_code is null;
--
-- -- Codes should be distinct. The index is deliberately NOT unique: two
-- -- concurrent inserts sharing a root could in principle race to the same
-- -- counter, and a duplicate code is cosmetic — never worth failing an
-- -- add-actor call (and so breaking the cold-invite flow) over. Expect 0 rows;
-- -- if one ever appears, bump the loser by hand.
-- select band_code, count(*) from public.nextus_actors
--   group by band_code having count(*) > 1;
--
-- -- Root helper tracks bandRoot() in FieldGuide.jsx:
-- select public.actor_band_root('Regenerativa');      -- 'REGE'  (one word)
-- select public.actor_band_root('Tidewater Trust');   -- 'TITR'  (2+2 letters)
-- select public.actor_band_root('Common Ground');     -- 'COGR'
-- select public.actor_band_root('Café Noir');         -- 'CANO'
-- select public.actor_band_root('3M');                -- 'MXXX'
-- select public.actor_band_root('Пример Фонд');       -- 'XXXX'  (see note above)
-- -- NB the v3 mockup labelled Tidewater Trust "TIDE 2" by hand; the real
-- -- algorithm gives TITR. The mockup's codes were illustrative, not computed.
--
-- -- Ranks ascend per user. NOT expected to be contiguous — deletes leave
-- -- gaps by design (see note in the header); only ordering matters.
-- select user_id, count(*), min(rank), max(rank),
--        count(*) filter (where rank is null) as unranked
--   from public.actor_champions group by user_id;
--
-- -- A malformed code must not break inserts sharing its root:
-- -- update public.nextus_actors set band_code = 'LOOM 2b' where name = 'Loom';
-- -- insert into public.nextus_actors(name) values ('Loomer');  -- must succeed
--
-- -- Provenance columns exist and default null:
-- select met_via, met_where from public.actor_field_notes limit 1;
