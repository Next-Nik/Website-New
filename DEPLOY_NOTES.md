# NextUs · Four-Beat Home — changed files

The new Mission Control home: the platform's purpose *is* the layout —
one loop, four beats, held at two scales.

**What we want · Horizon → Where we are · Now → What's next · Next step → How we get there · Path**

TED + Omega + Tesla: one bright ground (`#f3f0e9`) for *both* poles, the
accent alone carries scale — moss green `#4c6b45` for **My Life**, clay
`#a9743f` for **Our Planet**. The NextUs wordmark keeps its Little-Prince
scarf-gold `Us` (`#cf9a24`), constant across both poles, top-left of the
sticky nav.

## The three changed files (drop-in, mirror the repo tree)

- `src/App.jsx` — home (`/`) now renders the four-beat `MissionControl`; the
  old `/next` reshape preview is retired (redirects to `/`), and the unused
  `MissionControlNext` import is removed. **Nothing else touched.**
- `src/app/pages/MissionControl.jsx` — surgical layout rewrite. Every hook,
  handler, memo, data derivation, and all 15 Panels are preserved exactly;
  only the presentational return block and the `STAGE_CSS` were replaced. The
  wheel is the **same live-site wheel** (`WheelStage`), reused as-is inside the
  Now beat's glance.
- `src/app/components/mission-control/NowFeed.jsx` — **new.** The Now beat's
  expanded state, wired to the real `moments` table (all-time, the same source
  as the daily surface), with a real composer (`MomentCapture`: browser-side
  downscale + signed upload) so a moment can be posted straight from home.

## The Now beat — one surface, two states

The Now beat holds two states in the same space. **Glance** (default) is the
wheel + a few live counts, quiet by design. Toggle to **Feed** and the real
social feed of photos and lines takes over the same surface. Selecting a wheel
spoke opens that domain's detail below it — the same drill-down wiring the old
scroll-below carried.

The chip on each feed card is the moment's own `domain` tag — the real field
we have. The four reading-categories (Horizon · Now · Need · Doing) are a lens
over the feed shown in the composer prompt, **not** a stored field, so nothing
invents a category a person did not choose. (When a `moments.category` column
exists, swap the chip source to it — one line in `NowFeed.jsx`.)

Photo-real: the feed renders real photos and lines. There is no video field on
`moments` yet, so the feed is photo + text only — no faked video.

## Verification (run in this build)

- `npm run build` → **green**, 499 modules transformed.
- `npm run audit` → **no new violations** in either changed/new file. (The one
  remaining italic hit, `MomentsReviewQueue.jsx:108`, is pre-existing backlog
  in the baseline, untouched here.)
- Per-file esbuild parse → OK for all three.

## Deploy

Client build needs these or the app can't reach Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The moments feed reads the existing `moments` table under its current RLS —
no schema change, no migration required for this home. If the signed-in user
has no Map filled in, the personal wheel shows empty rings by design; if no
moments exist yet, the feed shows a dignified "be the first" empty state.

Default scope is **Our Planet** (Earth Challenge season) — set `DEFAULT_SCOPE`
back to `'self'` in `MissionControl.jsx` to land on My Life after the season.
