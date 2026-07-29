# Homecoming — the five up-level builds

All five items from the blind-user pass, built on v53. Engine-and-page only; no
new migration (everything stores in the existing `guards` field or `homecoming_entries`).

## 1. The heavy-day door (safety first)
A real surface, not a footnote. Every screen now carries a calm **"Not okay right
now?"** link that opens a dedicated door: the daily rep is explicitly *not* the
answer in that moment, three concrete hand-offs (program person, safe friend,
professional), and a crisis line, then a line that the rep will keep. Reachable
from anywhere, including mid-onboarding and from inside Scene One.
`SAFETY` in `session.js`; `SafetyDoor` in the page.

## 2. State-adaptive one-move path
When you name **Collapsed** at Land, the tool offers the **short way home**: just
the breath, and today's rep is done — no six-move mountain. It still records a
full return. A shut-down day gets a door it can actually walk through.

## 3. The league in Reassign (seven guardians)
`posts.js` grew from four to the **seven guardians**: Alchemist, Triad, Witness,
Sovereign, Gentle Titan, Heart Star, Companion — each with its vow, its steady
and gripping tells, a domain, and a colour. Reassign now **opens on the guardian
the Placement flagged** (`startPost`), and a "show me another guardian" link
cycles the league. The Placement's pressure answer routes straight to the right
guardian.

## 4. Urge-surfing in Scene One
Scene One now **names your reach** in your own words (from the Placement: the
edge-off pull, the disappearing pull, friction, busyness) and adds the wave: an
urge crests and falls, peaks in minutes, and all you do is let it move through.
A quiet link escalates to the heavy-day door if it is bigger than an urge.

## 5. Accessibility pass
Aria-labels on the resting-charge scale (1–10) and the breath control; the save
chip is a polite live region; `aria-current` on the active tab; the breath orb is
`aria-hidden` and its word is announced. State and guardian meaning is carried by
text, never colour alone.

## Verified on v53
- All seven engine files parse; `index.js` bundles with every module resolved.
- `Homecoming.jsx` transpiles clean.
- Design audit: zero violations in Homecoming files.
- Engine smoke-tested: composer routes `people → Companion`, detects the shut-down
  baseline, names the reach, and the safety door carries its steps and crisis line.

## One flag before any non-founder use
The crisis line names US **988** with an "elsewhere, your local line" fallback.
Before this is ever seen by anyone outside the US (you are in Mexico City),
localise the crisis resources. It is one small data edit in `SAFETY`.
