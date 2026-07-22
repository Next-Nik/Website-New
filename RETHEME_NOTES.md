# NextUs · Retheme — the four-beat system, everywhere

Rolling the four-beat home's visual language across the whole app: one bright
warm ground (`#f3f0e9`), accent-only poles (moss `#4c6b45` My Life / clay
`#a9743f` Our Planet), the scarf-gold `Us` wordmark (`#cf9a24`) constant.
Full retheme — the dark Atlas theme is being retired page by page, in tiers.

Build green (499 modules), design audit clean (the one remaining italic hit is
pre-existing baseline backlog, untouched here).

## This drop — Foundation + Tier: Public & marketing

**Foundation (drives every page):**
- `src/global.css` — the shared `:root` palette repointed to the four-beat
  system: bright ground, deep moss, warm clay, `--gold`, plus shared
  `--surface / --surface-2 / --line / --muted / --shadow`. `.site-nav` restyled
  bright; `.nav-wordmark` added (gold `Us`).
- `src/lib/designTokens.js` — the `fn` palette mirrored to the same values (+
  `fn.gold`, `fn.surface2`), so every JS-styled page on the Field Notes rail
  shifts warm automatically.
- `src/components/Nav.jsx` — the shared nav (on ~85 pages) now shows the text
  wordmark with the gold `Us` instead of the logo image; sign-in warmed to moss.

**Tier · Public & marketing (full retheme):**
- `src/pages/MarketingHome.jsx` — signed-out front door. Legacy sage/verdigris/
  brass palette remapped to the four-beat system; primary CTA is now the moss
  accent; the seven civ-domain identity hues are preserved as-is.
- `src/pages/Login.jsx` — bright ground, wordmark header.
- `src/pages/About.jsx`, `src/pages/WorkAndPodcast.jsx` (Work with Nik +
  Podcast), `src/app/pages/NextMarket.jsx` — palette remapped to the system.

**Also included** (from the prior drop, so this is one coherent deploy):
- `src/App.jsx`, `src/app/pages/MissionControl.jsx`,
  `src/app/components/mission-control/NowFeed.jsx` — the four-beat home itself.

## How the retheme is structured

The colour migration is a precise legacy-token → new-token remap (old moss
`110,127,92` → `76,107,69`; old ink `38,48,42` → `38,36,32`; grounds → `#f3f0e9`;
verdigris/brass accents → moss), not a blind find-replace — locked domain hues
and the one intentional dark contrast band are left alone.

## Remaining tiers (next passes)

2. **Core daily loop** — Daily, Map, NextU journey, Journal, Search, Profile.
3. **Planet / dark Atlas pages** — Domain, Nominate, OrgPublic, Add, Focus,
   Constellation, Earth, Challenge (these still render on `at.*` dark; each needs
   a real light-rebuild, not just a token swap, since text is currently light).
4. **Utility / admin long-tail** — Settings, Events, Circles, Trails, Checkout,
   Admin.

## Deploy

Drop-in, mirrors the repo tree. Client needs `VITE_SUPABASE_URL` +
`VITE_SUPABASE_ANON_KEY`. No schema/migration change.
