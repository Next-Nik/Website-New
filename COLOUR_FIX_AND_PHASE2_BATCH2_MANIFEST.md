# Colour fix + Phase 2 Batch 2 — Map, Horizon State, Target Stretch, legacy pages

Two things in this delivery:

## 1. The green overlay fix
Found it: `WheelStage.jsx`'s "backing pool" — the soft radial glow that
lifts the wheel off the map substrate on the civ/planet side. It's
literally called out in the file's own comment as sitting behind the
wheel, which is why it read as an overlay rather than an accent.

Root cause: this is the one Mission Control component that genuinely
serves both stages via a `data-stage` CSS attribute (light = self,
dark = civ) — everything else in that batch was correctly classified
as always-dark. When I swept "civ-stage" components to verdigris in
Phase 2 Batch 1, this file's dark-stage centre glow picked up
`rgba(88,160,138,…)` — verdigris green — instead of something
planet-appropriate. Its light-stage counterpart had the same bug in
reverse (verdigris where it should've been moss).

Fixed both:
- **Light stage (self side)**: was verdigris, now `rgba(110,127,92,0.07)`
  — moss, matching every other Field Notes "living accent."
  You didn't flag this one, but it had the same bug, so I fixed it too.
- **Dark stage (planet side)**: per your ask, moved off the green
  family entirely to a darker blue — `rgba(32,64,100,0.16)`. This isn't
  one of the locked `at.*` tokens (verdigris/brass); it's a one-off per
  your direct request. If you want that blue formalized as a named
  token for reuse elsewhere, say the word and I'll add it to
  `designTokens.js` instead of leaving it as a local literal.

If the wheel's ring/spoke lines on the planet side still read too
green for your taste (those are a separate, thinner accent — verdigris
on the actual ring/spoke strokes in `MissionWheel.jsx`), let me know
and I'll adjust those too. I left them since you specifically called
out "the overlay," not the wheel lines themselves.

## 2. Phase 2 Batch 2 — core Horizon Suite tools + remaining legacy pages
You asked for everything clean to here — this is the next real chunk
toward that. Converted:
- `src/tools/map/Map.jsx` — 206 gold + 130 legacyfont
- `src/tools/horizon-state/HorizonState.jsx` — 123 gold + 4 legacyfont
- `src/tools/target-sprint/TargetSprint.jsx` — 103 gold + 2 legacyfont
  (same broken `tokens.goldChrome` bug as the Atlas pages from earlier
  batches, fixed the same way — pointed at `fn.moss` since this one's
  Field Notes, not Atlas)
- `src/pages/Dashboard.jsx` (legacy tree) — 233 gold + 9 legacyfont
- `src/app/pages/Dashboard.jsx` (new-app tree, a separate file) — 16 gold
- `src/pages/WorkAndPodcast.jsx` — 69 gold + 3 legacyfont
- `src/pages/ContentEditor.jsx` — 42 gold + 15 legacyfont
- `src/pages/Pricing.jsx` — 31 gold

All of these are Field Notes rail (personal tools + legacy marketing
pages), already sitting on the correct light ground — so unlike the
Atlas batches, this was gold/legacyfont cleanup only, not a rail
reskin. Gold → `fn.moss` (brighter) / `fn.ink` (darker), same mapping
used throughout Phase 2.

## Result this delivery
- Gold: 2735 → 1912 (823 fixed across this batch)
- Legacyfont: 579 → 416 (163 fixed)
- esbuild: all 9 changed files pass
- Zero logic changes

## Honest scope check — "clean to here"
I want to be straight with you on this: the full audit still shows
**1912 gold + 416 legacyfont violations left**, spread across roughly
250+ more files — mostly smaller shared components (`SprintPanel.jsx`,
`ToolDrawer.jsx`, `EventForm.jsx` ×2, `SelfWheel.jsx` ×2,
`OfferingPanel.jsx` ×2, two `.module.css` files, and dozens more in
the 10–30-hit range), plus the still-unaddressed legacy-tree twins
(`src/components/OrgShared.jsx`, `src/components/FocusSearch.jsx`,
`src/components/mission-control/*`) flagged in earlier batches.

This is a big codebase and I'm working through it file-by-file with
real verification (esbuild + audit) on each one, not just running a
global find-and-replace and hoping — so it's going to take several
more rounds like this one to actually get to zero. I'll keep going in
the same order (biggest-impact files first) unless you'd rather I
prioritize differently.

## Verification run
```
node scripts/audit-design.js --law=gold        # 0 hits in every file in this batch
node scripts/audit-design.js --law=legacyfont  # 0 hits in every file in this batch
npx esbuild <each changed file> --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null   # all pass
```

## Running total across every batch so far (Phase 2 + Phase 3)
- Gold: 3375 → 1912 (1463 fixed, ~43% of the original count)
- Legacyfont: 700 → 416 (284 fixed, ~41% of the original count)
