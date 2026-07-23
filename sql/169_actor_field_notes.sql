-- ============================================================================
-- 169_actor_field_notes.sql
--
-- Field guide capture (Wave 2). One private one-line note per user per
-- actor. Writing the note is what records an organisation as met in the
-- user's guide at /guide (slug provisional · naming session pending).
--
-- Notes are private to their author: owner-only select / insert / update /
-- delete. No public read path — the guide is the user's own record, not a
-- social surface.
--
-- Numbering: 168 is reserved for the showcase layer, so this is 169.
--
-- Idempotent. Run manually in the Supabase SQL editor.
-- ============================================================================

begin;

create table if not exists public.actor_field_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  actor_id    uuid not null references public.nextus_actors(id) on delete cascade,
  note        text not null check (char_length(btrim(note)) > 0),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, actor_id)
);

create index if not exists actor_field_notes_user_id_idx
  on public.actor_field_notes (user_id);

alter table public.actor_field_notes enable row level security;

-- A user can read only their own notes.
drop policy if exists "users read own field notes" on public.actor_field_notes;
create policy "users read own field notes"
  on public.actor_field_notes
  for select
  using (auth.uid() = user_id);

-- A user can insert only their own notes.
drop policy if exists "users insert own field notes" on public.actor_field_notes;
create policy "users insert own field notes"
  on public.actor_field_notes
  for insert
  with check (auth.uid() = user_id);

-- A user can update only their own notes.
drop policy if exists "users update own field notes" on public.actor_field_notes;
create policy "users update own field notes"
  on public.actor_field_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A user can delete only their own notes.
drop policy if exists "users delete own field notes" on public.actor_field_notes;
create policy "users delete own field notes"
  on public.actor_field_notes
  for delete
  using (auth.uid() = user_id);

commit;

-- ─── Verification (run manually) ────────────────────────────────────────────
-- -- Should return 0 initially:
-- select count(*) from public.actor_field_notes;
--
-- -- Should fail the CHECK (whitespace-only note):
-- -- insert into public.actor_field_notes (user_id, actor_id, note)
-- --   values (auth.uid(), '<some-actor-uuid>', '   ');
