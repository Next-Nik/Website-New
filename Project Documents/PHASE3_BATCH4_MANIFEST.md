# Phase 3 · Batch 4 — Atlas search, actor directory, org profiles

Closes out the rest of the Atlas list from Master Spec §1: search, the
actor directory, actor profile pages, and claim/propose flows.

Scope:
- `MemberPublic.jsx`, `FocusIndex.jsx`, `FocusProfile.jsx`, `Search.jsx`
- `Claim.jsx`, `Nominate.jsx`, `Add.jsx`
- `OrgPublic.jsx`, `OrgManage.jsx` (actor profile pages)
- `ConstellationRecord.jsx`, `ConstellationLedger.jsx` (zero gold hits
  already, but were still sitting on Field Notes light ground — moved
  to Atlas for rail consistency)
- Shared primitives: `app/components/OrgShared.jsx`,
  `app/components/FocusSearch.jsx`

## Result
- Gold: 2892 → 2735 (157 fixed, all within this batch)
- Legacyfont: 581 → 579 (2 fixed)
- esbuild: all 13 changed files pass
- Zero logic changes

## The high-leverage fix: OrgShared.jsx
`OrgShared.jsx` is the shared UI-primitives file for the whole Org
ecosystem — it exports the `gold`/`dark`/`parch` constants, the
Cormorant/Lora font presets, and shared components (`Label`, `Btn`,
`SectionCard`, `TextInput`, etc.) that `OrgPublic.jsx`, `OrgManage.jsx`,
and `FocusSearch.jsx` all import. Converting it once to `at.*` and
Fraunces/Newsreader/IBM Plex Mono cascaded automatically to every
consumer — **`OrgPublic.jsx`'s 69 hits and `OrgManage.jsx`'s 42 hits
both dropped to a residual few** just from that one file, before I'd
touched either page directly. The remainder in each was raw hex/rgba
literals that bypassed the shared constants (including a local
`gold`/`dark`/`parch` redeclaration inside a modal in `OrgPublic.jsx`
that shadowed the import for that section).

There's a **legacy twin** at `src/components/OrgShared.jsx` and
`src/components/FocusSearch.jsx` — same old/new parallel-tree pattern
as the `mission-control` folder from Phase 2. Left untouched, same as
before: flagging for a dedicated "legacy tree" batch rather than
guessing which old-style pages currently depend on it staying light.

## Pattern across all nine page files
Same three-part sweep in every file:
1. `tokens.gold`/`tokens.goldChrome` (broken — undefined on the Phase 1
   bridge) or local `const gold = '#A8721A'` style declarations →
   `at.brass` / `at.verdigris`
2. `tokens.bg`/`parch` (Field Notes ground) → `at.ground`; `tokens.dark`
   → `at.text`; card/input backgrounds (`'#FFFFFF'`) → `at.object`
3. The old ink-text opacity family `rgba(15,21,35,X)` → `at.ghost` /
   `at.meta` for the common label opacities (0.55/0.65/0.72), or the
   light-on-dark equivalent `rgba(234,241,237,X)` at the same opacity
   for less common values — since these pages are now dark, text that
   was "ink at 55%" needs to become "light at 55%," not disappear.

Two things caught and fixed after the mechanical sweep:
- A checkbox/toggle pattern in `Add.jsx` and a "represents" selector
  in the same file had one branch of a ternary hardcoded to the old
  white/cream background — fixed to `at.object` so the unselected
  state doesn't stay light.
- Modal backdrop and box-shadow colours (`OrgPublic.jsx`,
  `ConstellationRecord`/`Ledger`) — shadows/scrims stay black-based
  regardless of rail, so these got `rgba(0,0,0,X)` rather than the
  `at.ghost` text-opacity mapping.

## Verification run
```
node scripts/audit-design.js --law=gold        # 0 hits in this batch's files
node scripts/audit-design.js --law=legacyfont  # 0 hits in this batch's files
npx esbuild <each changed file> --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null   # all pass
```

## Running total across all Phase 2 + Phase 3 batches
- Gold: 3375 → 2735 (640 fixed)
- Legacyfont: 700 → 579 (121 fixed)

## Still open
- Legacy tree: `src/components/OrgShared.jsx`, `src/components/FocusSearch.jsx`,
  and the earlier-flagged `src/components/mission-control/*` — all
  still on the old parallel `src/pages/*` app, not yet assessed as a
  batch of their own
- Big legacy-tree pages themselves (`Dashboard.jsx` 233 hits,
  `Map.jsx` tool 206, `HorizonState.jsx` 123, `TargetSprint.jsx` 103,
  `WorkAndPodcast.jsx` 69, `ContentEditor.jsx` 42, `Pricing.jsx` 31,
  etc.) — these are Field Notes personal-tool surfaces per spec §1,
  still untouched since Phase 2 Batch 1 (Mission Control)
- Everything else under Horizon Suite proper: The Map, Horizon State,
  Target Stretch, Purpose Piece, Horizon Practice, Daily, Journal,
  onboarding, auth
