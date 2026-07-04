# Phase 2 · Batch 1 — Mission Control

Scope: the live Mission Control system — `src/app/pages/MissionControl.jsx`
and all 30 files in `src/app/components/mission-control/`.

## Result
- Gold: 3375 → 3228 (147 fixed, all within this batch's scope)
- Legacyfont: 700 → 645 (55 fixed, all within this batch's scope)
- Batch scope itself: **zero** gold/legacyfont violations remaining
- esbuild: all 31 changed files pass
- Zero logic changes — colour/font literals only

## Judgement calls (per §7 fidelity check)
- **Rail assignment**: components explicitly named in `tokens.js`'s header
  comment as "Civ stage" (ActionCard, CivDomainPanel, Dock, DockTile,
  IdentityStrip, IdentitySwitcher, MissionWheel's `dark` branch, Panel,
  PoleHeader, Ticker, Tile, TopStrip, WheelStage, WorldViewMissionPanel)
  converted gold → `at.verdigris` (rgb 88,160,138) for the "living accent"
  role. Everything else in the folder is Self-stage → `fn.moss`
  (rgb 110,127,92).
- **`MissionWheel.jsx`** renders both stages from one component via a
  `dark` prop. Every gold occurrence — including several that were
  static (not yet stage-aware) — is now a `dark ? verdigris : moss`
  ternary, so the wheel correctly re-skins when it's mounted for the
  civ stage.
- **`WorldViewMissionPanel.jsx`** was importing the FN-mapped `GOLD`
  bridge constants from `tokens.js` even though it's a dark/Atlas
  panel (`TEXT_WHITE_*`). Switched it to import `at` directly from
  `designTokens.js` and rebuilt its score-colour band as
  verdigris (7+) → brass (4–6) → muted brass (2–3) → red (crisis),
  which also happens to match the spec's verdigris→brass progress-track
  language in §2.6.
- **Darker gold role** (`#A8721A` / `rgba(168,114,26,…)`, tokens.js's
  `GOLD_DK`) → `fn.ink` on Self-stage, matching the existing bridge
  mapping, rather than a second moss shade.
- **`MissionControl.jsx` page**: two small inline sections (Next Steps
  launcher, Focus/Resources panel eyebrows) were Self-stage — same
  ink/moss split as above.
- **`BeaconStrip.jsx`**: gold itself is untouched (whitelisted beacon
  component per spec §4.2) — only its 35 legacyfont hits were converted.

## Left for a later batch
- `src/components/mission-control/` — a **separate, older** folder
  (ComposeMessage, IndicatorReliabilityPanel, MessagesMissionPanel,
  MyInterestsPanel) still wired to the legacy `src/pages/*` app
  (Dashboard.jsx etc.), not the new Mission Control. Still has gold +
  legacyfont hits. This belongs with the legacy-tree batch, not here,
  since it's a different rendering path entirely.
- Everything else in Field Notes scope per Master Spec §1: Horizon
  Suite tools (`src/tools/map`, `horizon-state`, `target-sprint`,
  `purpose-piece`, `horizon-practice`), Daily/Journal/Onboarding/Auth,
  and the large legacy pages (`Dashboard.jsx`, `WorkAndPodcast.jsx`,
  etc.). These are big single files (200+ gold hits each in a few
  cases) — recommend they're their own batches so each stays reviewable.

## Verification run
```
node scripts/audit-design.js --law=gold        # 0 hits in this batch's files
node scripts/audit-design.js --law=legacyfont  # 0 hits in this batch's files
npx esbuild <each changed .jsx> --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null   # all pass
```
