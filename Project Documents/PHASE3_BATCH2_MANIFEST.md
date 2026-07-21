# Phase 3 · Batch 2 — Challenge authoring, browse, my-challenges, constellation

Closes out the rest of the `/challenges` + `/constellation` surface area
that Batch 1 (PlanetMap + Earth Challenge) didn't reach.

Scope:
- `ChallengeAuthor.jsx` (the `/challenges/new` authoring flow, 974 lines)
- `ChallengeBrowse.jsx`, `MyChallenges.jsx`, `ConstellationPage.jsx`
- `challenge/` components: `BroadcastComposer.jsx`, `BroadcastFeed.jsx`,
  `ChallengeLineage.jsx`, `IntensityInfo.jsx`

## Result
- Gold: 3132 → 3092 (40 fixed, all within this batch)
- Legacyfont: unchanged (635) — none of these files had legacyfont hits
- esbuild: all 8 changed files pass
- Zero logic changes

## Pattern
Same underlying issue as `ChallengePage.jsx` in Batch 1:
`ChallengeAuthor.jsx`, `ChallengeBrowse.jsx`, `MyChallenges.jsx`, and
`ConstellationPage.jsx` all reference `tokens.gold` / `tokens.goldChrome`
— keys the Phase 1 `designTokens.js` bridge never defined — alongside
`tokens.bg` / `tokens.bgCard` / `tokens.dark` / `tokens.ghost` (which
*do* exist, but resolve to Field Notes light values). So each of these
pages has been silently missing its gold accents since Phase 1, sitting
on a light ground that should be dark per Master Spec §1.

Fix in all four: blanket-swapped the token-bridge references to their
Atlas equivalents (`tokens.bg`→`at.ground`, `tokens.bgCard`→`at.object`,
`tokens.dark`→`at.text`, `tokens.ghost`→`at.ghost`, `tokens.gold` /
`tokens.goldChrome`→`at.brass` / `at.verdigris`), then swept the
remaining raw `rgba(200,146,42,…)` literals to the brass family
(`rgba(217,178,74,…)`) — brass fits thematically here since these
pages are about challenges/calls, i.e. "human coordination."

The four `challenge/` components are smaller — mostly a stray
`background: '#FFFFFF'` textarea in `BroadcastComposer` (would have
looked wrong sitting inside the now-dark `ChallengePage`/`ChallengeAuthor`)
and a few hairline borders. Same brass/verdigris treatment.

## Verified clean
`node scripts/audit-design.js --law=gold` and `--law=legacyfont` both
return zero hits anywhere under `challenge`, `constellation`, or
`broadcast`/`intensity` paths.

## Still open in Atlas scope (Master Spec §1)
- Atlas search + actor directory: `Search.jsx`, `FocusIndex.jsx`, `FocusProfile.jsx`
- Actor profile / claim / propose: `OrgPublic.jsx`, `OrgManage.jsx`,
  `MemberPublic.jsx`, `Claim.jsx`, `Nominate.jsx`, `Add.jsx`
- `ConstellationRecord.jsx`, `ConstellationLedger.jsx` — currently zero
  gold hits (worth a quick visual check to confirm they're actually
  dark-themed already rather than just gold-free-and-still-light)
- `AdminConsole.jsx`'s Atlas/Seed tabs (105 gold hits total in that
  file — biggest remaining single item, mixed scope per spec §1: "chrome
  may stay Field Notes; content panels may go Atlas")
- `PlanetWheel`-adjacent civ wheel surfaces if any remain unconverted
  elsewhere (e.g. `NextUsWheel.jsx`, `IntersectionPage.jsx`)

## Verification run
```
node scripts/audit-design.js --law=gold        # 0 hits in this batch's files
node scripts/audit-design.js --law=legacyfont  # 0 hits in this batch's files
npx esbuild <each changed .jsx> --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null   # all pass
```
