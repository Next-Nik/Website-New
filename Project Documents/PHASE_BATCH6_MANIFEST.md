# Phase 2 + 3 · Batch 6 — mass sweep of remaining mid-size components

58 files this round — the long tail of 10–30-hit files across both
rails, plus a syntax bug found along the way.

## Result
- Gold: 1912 → 951 (961 fixed)
- Legacyfont: 416 → 232 (184 fixed)
- esbuild: all 58 changed files pass
- Zero logic changes (one bug fix, see below — also zero logic, pure
  syntax repair)

## What's in this batch
**Atlas rail** (Org ecosystem — cascaded from fixing both `OrgShared.jsx`
copies): `OrgDomainsTab.jsx` ×2, `manage/CredentialsTab.jsx` ×2,
`manage/TestimonialsTab.jsx` ×2, legacy `FocusSearch.jsx`, legacy
`OrgShared.jsx` itself (the app copy was fixed in Batch 4; this is its
legacy-tree twin, finally closed out), and `app/pages/Map.jsx` — a
genuinely different file from `tools/map/Map.jsx` (Horizon Suite's
"The Map"): this one is the **geographic actor map** ("Module 5"),
part of the Atlas actor directory. Full rail reskin (ground/text/cards)
same as `OrgPublic.jsx` in Batch 4. Left its Leaflet map-popup HTML
strings on a light background — map popups over map tiles conventionally
stay light regardless of app theme, same reasoning as the QR code
exception in `ChallengePage.jsx` — but did fix their font-family strings
since the legacyfont law applies regardless.

**Field Notes rail** (everything else — 48 files): the long tail of
personal-tool and marketing-site components — `SprintPanel`,
`ToolDrawer`, `FlameCheckIn`, `DarkSection`, `BilateralCardEditor` ×2,
`ScalePanel`, `ProfileEdit`, `Watch`, `EventForm` ×2,
`PracticeContribute`, `Practices`, `Heptagon`, `OfferingPanel` ×2,
`SelfWheel` ×2, `NeedCard` ×2, `TestimonialsPanel`, `DomainsPanel`,
`CivilisationalFramePanel`, `ArchetypeReferencePanel`,
`DailySessionPanel`, `ToolCompassPanel`, `ProtocolPanel`,
`NorthStarPortal`, `PurposePiece`, `RosterSection` ×2, `BottomTabs`,
`ActiveFocusPrompt` ×2, `Wheel`, `PathView`, `Tools`, `GlossaryPanel`,
`InvitationIndex`, `WelcomeOverlay`, `FocusPanelContent` ×2, `Legal`,
`FAQ`, `About`, `CrisisResources`, `HorizonScaleModal`, `PracticeDetail`,
`MarketingTools`. All were still on light ground already, so — same as
the earlier Field Notes batches — this was gold/legacyfont cleanup,
not a rail reskin.

Rail calls worth a mention: `CivilisationalFramePanel.jsx` and
`RosterSection.jsx` sound Atlas-ish by name but are both still sitting
on light Field Notes ground with no dark counterpart — left them as
Field Notes rather than guessing at a reskin. Say the word if either
should actually move to The Atlas.

## Bug found and fixed: `src/components/BilateralCardEditor.jsx`
Pre-existing syntax error, unrelated to the retheme — a `designTokens`
import had gotten nested inside another multi-line import block:
```js
import {
import { body, sc } from '../../lib/designTokens'
  ARTEFACT_TYPES,
  ...
} from '../hooks/useBilateral'
```
This is invalid JS; esbuild caught it immediately when I went to sweep
the file. Un-nested the two imports. Worth checking whether this file
was actually loading in production — if it's on a route that's been
silently broken, this fix will surface that.

## Verification run
```
node scripts/audit-design.js --law=gold        # 0 hits in all 58 files
node scripts/audit-design.js --law=legacyfont  # 0 hits in all 58 files
npx esbuild <each changed file> --loader:.jsx=jsx --jsx=automatic --bundle=false --format=esm --outfile=/dev/null   # all pass
```

## Running total across every batch so far
- Gold: 3375 → 951 (2424 fixed, ~72% done)
- Legacyfont: 700 → 232 (468 fixed, ~67% done)

## What's left
Full breakdown available on request, but roughly: a mid-size tail of
components each with a handful of hits (the biggest remaining single
file is under 15 hits as of this batch), plus two CSS module files
(`domain-explorer/DomainPanel.module.css`,
`self-explorer/SelfPanel.module.css`, `self-explorer/SelfExplorer.module.css`)
which need a slightly different approach since they're plain CSS, not
JSX. I'll pick those up next round.
