# NextUs — Session Fixes, 2026-07-24

This zip has ONE top-level folder (this one) so it drags straight onto your
repo and merges instead of creating a numbered duplicate. Everything inside
mirrors the real repo path — drag the folder's *contents* onto your project
root and let it overwrite.

## What's in here

### Safari/iOS photo-blank fix (Mission Control cards)
- `src/lib/imageDownscale.js` — JPEG-only encoding (dropped WebP).
- `src/app/components/mission-control/CardPhoto.jsx` — replaced CSS
  `background-image` with real `<img>` (object-fit/object-position) for
  photos and inline `<svg>` gradients for the no-photo fallback. This is the
  actual fix for the blank-card bug (WebKit was silently failing to paint a
  `background-image` on a child of an `overflow:hidden` + `border-radius` +
  `transition:transform` parent — confirmed on Mac desktop Safari, old iPad
  Pro, and both an old and new iPhone). Matches the working pattern already
  used in `ChallengePage.jsx`.
- `src/app/pages/MissionControl.jsx` — `.mc-card-img` CSS kept the
  compositing-layer hint (`translateZ(0)` / `backface-visibility: hidden`)
  as defense-in-depth, plus the updated "Your Guide" entry-card copy.
- `public/sw.js` — cache version bumped to `nextus-v8` to guarantee a clean
  cache on next load (defensive, not the root cause).

### Field Guide (new feature, `/guide`)
- `sql/178_field_guide_v3.sql` — **run this migration by hand in the
  Supabase SQL editor if you haven't already.** Nothing else in this section
  works until it's applied.
- `api/guide-ping.js`
- `src/app/hooks/useChampions.js`
- `src/app/lib/guideTiers.js`
- `src/app/pages/FieldGuide.jsx`
- `src/app/pages/WatchedFeed.jsx`

### Shared
- `scripts/audit-design.js` — design-lint script, updated italic whitelist
  for the Field Guide page.

## One open item

The `<img>`/`<svg>` rewrite of `CardPhoto.jsx` is the correct fix for the
root cause but hasn't been confirmed live yet — the last few rounds of
"deployed, no change" are now suspected to be because earlier zips landed in
duplicate `src N` folders on your end rather than actually merging into the
real project. Once this one is dragged in properly and deployed, worth a
fresh check across the previously-affected devices (Mac Safari, old iPad
Pro, old + new iPhone).
