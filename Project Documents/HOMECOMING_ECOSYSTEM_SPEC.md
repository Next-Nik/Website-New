# Homecoming ↔ the NextUs platform — the connection

Built on v54. Both directions. No schema changes: everything reads existing
tables or Homecoming's own. Private and founder-only throughout.

## Direction 1 — Reads (arrive knowing you)

When you open Homecoming, it now reads the personal layer and pre-fills the
Placement, so you show up already known.

- **Reads** `horizon_profile` (your seven-domain scores, 0–10) and `map_results`
  (`life_ia_statement`, your whole-life "I Am").
- **Your loudest low-scoring domain becomes the pre-selected pressure**, which
  routes straight to the right guardian: low Finances → money → the Alchemist,
  low Body → the Triad, low Connection → the Companion, low Inner Game → worth.
- **Your Map's life statement becomes the drafted "home you are coming to,"** in
  your own words rather than a template.
- The Placement opens with *"NextUs already knows you — I brought your Horizon
  scores and your Map, and pencilled in what fits. Change anything that's off."*
  Recognition, pre-filled, still yours to nudge.

Mechanics: the page fetches (read-only, same account); a pure mapper
`knownFromEcosystem` (`src/lib/homecoming/bridge.js`) turns the rows into the
pre-fill; `composePlacement(answers, { targetDraft })` lets the Map statement win
over the template. The engine stays portable — the Supabase read lives in the
page. If the tables are empty, the Placement simply asks cold; failures are
silent.

## Direction 2 — Writes (the ecosystem reflects it back)

Mission Control now carries a founder-only **Homecoming** panel: a home icon in
the top nav opens *"Coming home,"* showing the thin signal — rep-days in the
last 30, the set-point direction, the target line, and the guardian in focus —
with a button into the tool.

Privacy held: only the **signal** surfaces (cadence, set-point direction, the
target line, the guardian). The felt content — states, sabotage urges, the
covenant, the reach — never leaves the private tool. The panel reuses the
portable engine's math and reads Homecoming's own tables only.

## What shipped

- `src/lib/homecoming/bridge.js` — new, the pure ecosystem mapper.
- `src/lib/homecoming/placement.js` — `composePlacement` takes a `prior` (the Map draft).
- `src/lib/homecoming/index.js` — exports `knownFromEcosystem`.
- `src/pages/Homecoming.jsx` — fetches the personal layer; Threshold pre-fills and shows provenance.
- `src/app/components/mission-control/HomecomingMissionPanel.jsx` — new, the write-back surface.
- `src/app/pages/MissionControl.jsx` — additive: import, a founder-gated home icon in the nav (`setActivePanel('homecoming')`), and the `<Panel open={activePanel === 'homecoming'}>` block.

## Verified on v54

- All engine files parse; `index.js` bundles with every module resolved.
- `Homecoming.jsx`, `HomecomingMissionPanel.jsx`, and `MissionControl.jsx` transpile clean.
- Design audit: zero violations in Homecoming files.
- Bridge smoke-tested: lowest-score domain → correct pressure and Map statement; empty data → asks cold.

## One caution
`MissionControl.jsx` is a large, actively-merged file. After any future merge,
`grep -n "Homecoming" src/app/pages/MissionControl.jsx` must return the import,
the nav trigger, and the panel block. If a merge from an older copy drops them,
re-add the three additive pieces (they are self-contained).
