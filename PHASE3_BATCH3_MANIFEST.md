# Phase 3 · Batch 3 — AdminConsole

Scope: `src/app/pages/AdminConsole.jsx` (4,729 lines — the biggest
single file in the retheme).

## Result
- Gold: 3092 → 2987 (105 fixed, this file now zero)
- Legacyfont: 635 → 586 (49 fixed, this file now zero)
- esbuild: passes
- Zero logic changes

## Judgement call: kept as Field Notes chrome
Master Spec §1 gives explicit builder's-judgement latitude here:
"Admin surfaces that operate on civ data (AdminConsole Atlas/Seed
tabs) — chrome may stay Field Notes; content panels may go Atlas."

AdminConsole was already entirely Field-Notes-light (`const bg =
'#FAFAF7'`, no dark sections anywhere in the file — unlike
`ChallengePage`/`ChallengeAuthor` etc. in the last two batches, which
had a broken/undefined `tokens.gold` bug and were meant to be dark).
There's no existing Atlas-styled region here to preserve or extend,
and re-theming a 4,700-line founder-only admin tool into a full dark
Atlas surface would be a large, purely cosmetic undertaking for a
surface only Nik uses. I took the spec's offered option: left the
whole file on Field Notes and just closed out the gold/legacyfont
no-backslide violations against `fn.*` (moss for the brighter gold
family, ink for the darker "GOLD_DK" family) — same mapping used for
Mission Control's single-stage panels in Phase 2 Batch 1.

If you'd rather the Seed/Atlas-data tabs specifically read as Atlas
(dark, verdigris/brass) to visually mark "you're now touching civ
data," say so and I'll do a follow-up pass — but given the scale I
wanted to check before assuming.

## What changed
- `const gold = '#A8721A'` → `fn.ink` (this constant is used all over
  the file for badges, chips, and accent text)
- All raw `#C8922A` / `#A8721A` hex and `rgba(200,146,42,…)` /
  `rgba(168,114,26,…)` (including the space-separated variant,
  `rgba(168, 114, 26, 0.85)`, used in a couple of status-badge colour
  maps) → `fn.moss` / `fn.ink` and their rgb equivalents
  (`110,127,92` / `38,48,42`)
- All 49 `'Cormorant SC'` / `'Lora'` inline `fontFamily` strings →
  `'IBM Plex Mono'` / `'Newsreader'`

## Verification run
```
node scripts/audit-design.js --law=gold        # 0 hits in AdminConsole.jsx
node scripts/audit-design.js --law=legacyfont  # 0 hits in AdminConsole.jsx
npx esbuild src/app/pages/AdminConsole.jsx --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null   # pass
```

## Running total across all Phase 2 + Phase 3 batches so far
- Gold: 3375 → 2987 (388 fixed)
- Legacyfont: 700 → 586 (114 fixed)

## Still open in Atlas scope (Master Spec §1)
- Atlas search + actor directory: `Search.jsx`, `FocusIndex.jsx`, `FocusProfile.jsx`
- Actor profile / claim / propose: `OrgPublic.jsx`, `OrgManage.jsx`,
  `MemberPublic.jsx`, `Claim.jsx`, `Nominate.jsx`, `Add.jsx`
- `ConstellationRecord.jsx`, `ConstellationLedger.jsx` — zero gold hits
  already; worth a quick visual confirm rather than more edits
