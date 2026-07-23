# BP-2 · Photo infrastructure + moderation floor · Delivery manifest

## Files
- sql/170_moments_and_moderation.sql — moments + moment_reports tables, owner/founder RLS, additive only
- api/moment-upload.js — the one write path: auth via _auth, downscaled base64 in, 'moment-images' bucket, moments row out
- src/lib/momentCapture.js — shared client lib (both trees): captureMoment / deleteMoment / reportMoment / momentImageUrl
- src/components/MomentsReviewQueue.jsx + src/app/components/MomentsReviewQueue.jsx — founder review queue (remove / keep)
- src/pages/AdminConsole.jsx + src/app/pages/AdminConsole.jsx — Moments tab: import + TABS + render (both copies)

## Manual steps (in order, before testing)
1. Supabase dashboard → Storage → create PUBLIC bucket: moment-images
2. Supabase SQL editor → run sql/170_moments_and_moderation.sql
3. Deploy this zip to the test branch

## What exists after this
The photo substrate: any signed-in client can call captureMoment(); moments store resized (≤1600px) with thumbnails; owners soft-delete; anyone reports; the founder resolves in AdminConsole → Moments. No public gallery yet — that is BP-6 by design. BP-5 wires capture into the check-in flow.

## Storage architecture note
Ships on Supabase Storage (the platform's proven pattern — challenge-images, actor-images). The R2 signed-URL architecture from the brief is gated on open question Q2 (Supabase plan); when answered for R2, the swap is contained to api/moment-upload.js + momentImageUrl — client contract unchanged.

## Verification run
esbuild: all JSX pass · node --check: api passes · both AdminConsole copies updated · no token files touched
