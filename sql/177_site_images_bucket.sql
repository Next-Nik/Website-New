-- 177_site_images_bucket.sql
--
-- The public storage bucket that holds founder-managed site imagery — the
-- photos behind the Mission Control home cards (and any future site image the
-- founder swaps in). Each card's chosen image PATH is stored as an ordinary
-- site_copy override (id like 'mc.card.north-star.image', value = the object
-- path here), so no new content table is needed — migration 156 already holds
-- the founder-write RLS for that.
--
-- Reads are public: a public bucket serves objects over their public URL with
-- no auth, which is what the cards load. Writes are founder-only, enforced on
-- storage.objects via is_founder() (defined in 156). Uploads come straight from
-- the founder's browser.
--
-- Idempotent: safe to re-run.

-- ── Bucket ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  5242880,  -- 5 MB ceiling
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── is_founder() (idempotent — identical to 156) ──────────────
create or replace function public.is_founder()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'founder', false)
$$;

-- ── Storage RLS: founder-only writes to the site-images bucket ─
drop policy if exists "site-images founder insert" on storage.objects;
create policy "site-images founder insert"
  on storage.objects
  for insert
  with check (bucket_id = 'site-images' and public.is_founder());

drop policy if exists "site-images founder update" on storage.objects;
create policy "site-images founder update"
  on storage.objects
  for update
  using      (bucket_id = 'site-images' and public.is_founder())
  with check (bucket_id = 'site-images' and public.is_founder());

drop policy if exists "site-images founder delete" on storage.objects;
create policy "site-images founder delete"
  on storage.objects
  for delete
  using (bucket_id = 'site-images' and public.is_founder());

-- Public read: the cards load images over the public URL, no auth.
drop policy if exists "site-images public read" on storage.objects;
create policy "site-images public read"
  on storage.objects
  for select
  using (bucket_id = 'site-images');
