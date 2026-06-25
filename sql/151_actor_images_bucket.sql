-- 151_actor_images_bucket.sql
-- The public storage bucket that holds actor profile images and logos.
--
-- Writes come from api/actor-image-upload.js using the service-role key, which
-- bypasses RLS, so no insert/update policy is needed. Reads are public: a
-- public bucket serves its objects over the public URL with no auth, which is
-- what the profile pages load. Uploads are resized in the browser to a few
-- tens of KB before they arrive, so the size ceiling below is only a safety net.
--
-- Idempotent: re-running updates the bucket's settings rather than erroring.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'actor-images',
  'actor-images',
  true,
  5242880,  -- 5 MB ceiling (uploads arrive far smaller after client-side resize)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
