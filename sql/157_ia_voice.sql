-- 157_ia_voice.sql
-- The voice of the self who already lives it.
--
-- The spoken I Am practice plays a person their OWN recording of each I Am
-- statement, then has them say it back with deepening feeling. This stores
-- those recordings.
--
-- Private by definition — these are the most intimate artifacts on the
-- platform, voiced declarations of who someone is becoming. The bucket is
-- NOT public; every read is a short-lived signed URL the owner mints for
-- themselves. Uploads come straight from the browser (the recorded Blob),
-- so RLS on storage.objects scopes every read/write to the owner's own
-- folder: the first path segment is the user's id.
--
-- ia_voice_clips is the index: one current clip per (user, domain), with the
-- exact storage path (extension varies by browser — webm on Chrome, mp4 on
-- Safari) so playback never has to guess, plus a recorded-at stamp so the
-- tool can show "recorded" / "re-record" and, later, track the voice
-- evolving as embodiment deepens.
--
-- Idempotent: safe to re-run.

-- ── The private bucket ────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ia-voice',
  'ia-voice',
  false,
  5242880,  -- 5 MB ceiling; a 10-second clip is a few tens of KB
  array['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Owner-scoped object policies (folder = the owner's user id) ────────
drop policy if exists "ia_voice_owner_read"   on storage.objects;
drop policy if exists "ia_voice_owner_insert" on storage.objects;
drop policy if exists "ia_voice_owner_update" on storage.objects;
drop policy if exists "ia_voice_owner_delete" on storage.objects;

create policy "ia_voice_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'ia-voice' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ia_voice_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ia-voice' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ia_voice_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ia-voice' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'ia-voice' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ia_voice_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ia-voice' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── The clip index ────────────────────────────────────────────────────
create table if not exists ia_voice_clips (
  user_id      uuid not null references auth.users(id) on delete cascade,
  domain       text not null,
  storage_path text not null,
  duration_ms  integer,
  updated_at   timestamptz not null default now(),
  primary key (user_id, domain)
);

alter table ia_voice_clips enable row level security;

drop policy if exists "ia_voice_clips_owner_all" on ia_voice_clips;
create policy "ia_voice_clips_owner_all" on ia_voice_clips
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
