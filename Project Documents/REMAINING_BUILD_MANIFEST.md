# NextUs · Remaining Build · delivery manifest

21 July 2026. Eight build packages from `NextUs_Remaining_Build_Plan_for_Cowork.md`,
built in dependency order. Changed-files-only, wrapped in `Website-New-main/`,
migrations in `sql/` numbered sequentially from 172. BP-13, BP-10, BP-17 skipped
per Nik's instruction (they were the ones needing his decisions).

**Verification (all green):** every changed JSX/JS file passes
`esbuild --bundle=false`; `node --check` clean on the CJS audit script;
`node scripts/audit-design.js` shows **zero new violations** across every law
(size · opacity · italic · svg · vh · gold · legacyfont · orphantoken). Gold 0,
legacyfont 0, svg-style 0, 100vh 0, orphan-token 0. The only two remaining italic
flags are the pre-existing `MomentsReviewQueue.jsx:108` pair (not touched here) —
the baseline was three; whitelisting the confirmed user-voice `DailySurface`
italic removed one. Every new page has both an `import` and a `<Route>` in
`App.jsx` (checked). Migrations 172–176 are sequential and non-colliding.

Run the five migrations in the Supabase SQL editor in order before deploying the
surfaces that read them.

---

## BP-4 · Doors + scale on every page
Every actor/challenge page a stranger lands on now ends in a door.
- **New** `src/app/components/Door.jsx` (+ legacy mirror `src/components/Door.jsx`) —
  picks its target by claim state: pre-claim → the domain constellation/trail;
  post-claim → the actor's own asks (`#asks` anchor) with the domain as a quiet
  secondary. Never a dead end. Rail-aware (`tone`).
- **Edited** `src/app/pages/OrgPublic.jsx` + `src/pages/OrgPublic.jsx` (both trees):
  page-local `ScaleInvitation` (honest band + "One river, done well…" — never a
  score/rank), the `#asks` anchor, and the Door placed once at the foot.
- **Edited** `src/app/pages/ChallengePage.jsx`: the exit Door.
- **Migration:** none (reads `scale`, `actor_calls`, `domains`, `profile_owner`).

## BP-8 · Horizon declaration + step-toward · migration 172
- **New** `horizonDeclaration.js` lib, `HorizonDeclare.jsx` (the ceremonial screen,
  route `/horizon/declare`), `mission-control/HorizonBanner.jsx` (declared line at
  the TOP of Mission Control, else the "Declare your horizon" affordance).
- **Edited** `MissionControl.jsx` (banner at top of `mc-body`), `DailySurface.jsx`
  + `MomentCapture.jsx` (step-toward line above the viewer's own moments / on the
  saved state), `App.jsx` (route).
- **Locks honoured:** stored verbatim, never derived/AI-rewritten, one per person.
  **Display scope:** personal-rail-only is live; communal render is gated behind
  `HORIZON_COMMUNAL_ENABLED` (default `false`) AND a per-user `communal_visible`
  opt-in — flip the flag when you've seen it.
- **Migration 172** `horizon_declarations` — owner read/write; communal read only
  where `communal_visible`.

## BP-11 · The tended thing · migration 173
- **New** `TendedThing.jsx` (Nature skin: seed→roots→sprout→leaves→thriving; SVG
  uses presentation attributes only, per the Chrome-148 law; dims/rests via
  `restStateFromLast`, never dies), `Grove.jsx` (aggregate anonymous field),
  `tendedThing.js` lib.
- **Edited** `MyChallenges.jsx`: the living thing on each card (a seed from join),
  grows on real check-in (`log_strand` path), grove for constellation challenges.
- **Migration 173** `tended_things` (owner-read) + `grove_stage_counts()`
  SECURITY DEFINER RPC (aggregate counts only, never names).

## BP-12 · Following + allied tier completion · no new migration
- Reuses the existing `nextus_user_watches` follow system + `guideTiers` derivation
  rather than forking the briefed `actor_watches` table (a second table would have
  split follow state and broken the guide's `following` derivation). **Decision
  flagged for you.**
- **Edited** `guideTiers.js`: allied now triggers on *joining* (participation), not
  only on logged check-ins — the fuller real-act derivation.
- **Edited** `FieldGuide.jsx`: tier word labels + a Watch/Follow toggle in the grid
  (shared `useWatch` lifted to the page — one query, not one per cell).
- **Edited** `OrgPublic.jsx` (both trees): a viewer-private "In your guide · {tier}"
  chip; the follow action itself is the existing `WatchButton` already on the page.

## BP-7 · The share artifact · no migration
- **New** `shareArtifact.js` (client-side canvas → PNG blob; Web Share API with a
  file, download fallback; platform URL rendered into the image), `ShareArtifactButton.jsx`.
- **Edited** `DailySurface.jsx` (per-moment), `MomentCapture.jsx` (capture
  confirmation), `MyChallenges.jsx` (challenge progress: where things stand · the
  step taken · the horizon).
- Single strip. The three-image carousel is a later enhancement (noted).

## BP-14 · Cohorts v1 (the room) · migration 174
- **New** `cohorts.js` lib, `Circles.jsx` (index + create, `/circles`),
  `CirclePage.jsx` (the room, `/circles/:id`). **Edited** `MissionControl.jsx`
  ("Circles" tile), `App.jsx` (routes).
- Members shown as their **offered elements only** (focus line, offered horizon
  snapshot, shared moments). **Hard lock:** Map / I Am / Horizon Self / Journal have
  no column and no opt-in — structurally unshareable. Charter (temperament, governance,
  steward-set cap, cadence); shrinking never ejects; "full" pauses invites; leave is
  quiet; stewarded removal is private; dormancy dims. Confidentiality absolute
  (member-only RLS via a SECURITY DEFINER `is_cohort_member` helper to avoid
  recursive policies). Flame-passing stubbed to **direct-add-by-email** (BP-9 pending).
- **Migration 174** `cohorts` / `cohort_members` / `cohort_shared_moments` + RPCs.
- **BP-15 second wave** (commitment round, quarterly seven-questions flow, witness
  verb) is **not in this build** — the brief scopes it as a separate wave.

## BP-16 · Trails + boards · migration 175
- **New** `trails.js` lib, `Trails.jsx` (`/trails`), `TrailPage.jsx` (`/trail/:id`,
  walkable + owner edit + publish), `BoardPage.jsx` (`/boards`, `/boards/:domain`).
  **Edited** `HorizonDeclare.jsx` (trail + board reachable from the declaration
  block), `App.jsx` (routes).
- Boards: **reality** (private) · **horizon** (dreamed — the Pinterest layer) ·
  **path** (earned — renders from your real moments in the domain; the DB CHECK and
  RLS forbid writing to it). Trails publish for someone with a rhyming horizon to walk.
- **Migration 175** `trails` / `trail_steps` / `boards` / `board_items`.
- v1 accepts dreamed images by **URL**; file upload to the horizon layer (BP-2
  storage) is a noted later enhancement.

## BP-18 · The pending engines · migration 176
- **New** `horizonActions.js` lib, `NorthStar.jsx` (the whole-life synthesis surface,
  `/north-star`; renamed component to avoid colliding with the existing orienteering
  `/tools/north-star`). **Edited** `MissionControl.jsx` ("North Star" tile near The
  Map), `MyChallenges.jsx` (records a `drive` ledger action on check-in), `App.jsx`.
- **Migration 176** `horizon_actions` (drive|recovery ledger — recovery honoured, not
  failure) + `north_star`.
- **Partial by design:** the write-path hook is wired on the check-in path; the
  summon / Daily / Stretch hooks and the switch of tended-thing growth + step-toward
  onto this ledger are the follow-on wiring. **COP31 second beat** is a mid-October
  decision, not a code item.

---

## Decisions taken on auto (safe defaults, flagged for review)
- **BP-8** communal horizon: personal-rail-only live, communal behind `HORIZON_COMMUNAL_ENABLED`.
- **BP-12** reused `nextus_user_watches` instead of a new `actor_watches` table.
- **BP-14** stewardship optional per charter (your stated lean); flame-passing = direct-add-by-email.
- **Italic whitelist** additions in `audit-design.js` are all confirmed user-voice
  (declared horizons, focus lines, shared moment lines) — listed with reasons.

## Deferred / follow-on (documented, not built)
BP-15 second wave · board image file-upload (BP-2 storage) · BP-18 summon/Daily/Stretch
write-hooks + ledger cutover · three-image share carousel · BP-9 flame-passing invites.
