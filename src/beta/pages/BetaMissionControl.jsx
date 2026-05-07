// ─────────────────────────────────────────────────────────────
// BetaMissionControl — /beta/dashboard
//
// Drop 1 frame rebuild. Mobile-canonical layout. Desktop adapts up.
//
// ──────────────────────────────────────────────────────────────
// LAYOUT (top to bottom on every viewport):
//
//   ┌─────────────────────────────────────────────────────┐
//   │  NextUs                          [profile] [gear]   │  IdentityStrip — brand bar
//   ├─────────────────────────────────────────────────────┤
//   │  Nik     Architect · Vision · Civilisational        │  IdentityStrip — identity bar
//   ├─────────────────────────────────────────────────────┤
//   │  Your Life                          The Planet      │  PoleHeader (toggle)
//   ├──────┬───────────────────────────────────────┬──────┤
//   │ Map  │                                       │ Plac │
//   │ HS   │       MissionWheel over Dymaxion      │ WV   │
//   │ TS   │                                       │ PS   │
//   │ HP   │                                       │      │
//   │ Res  │                                       │      │
//   ├──────┴───────────────────────────────────────┴──────┤
//   │       Personal action  ·  Planet action             │  ActionCards (scroll target)
//   └─────────────────────────────────────────────────────┘
//
// Substrate: Dymaxion projection SVG behind the wheel (and
// continuing into the action card region), themeable via CSS.
//
// Dark-stage flip: tapping any right-rail tile or the "The Planet"
// pole header sets currentWheel='civ' which triggers the data-stage
// attribute flip on the root.
//
// Removed in this drop:
//   • TopStrip → IdentityStrip
//   • Switcher pill → PoleHeader
//   • Ticker → gone (was empty chrome)
//   • Dock + DockTile → Profile + Settings moved to brand-bar icons
//   • Sentinel state lines → Tile renders state line only when meaningful
//
// Wheel internals stay as-is for Drop 1. Drop 2 adds the
// featured-node interaction model.
// ──────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import IdentityStrip      from '../components/mission-control/IdentityStrip'
import PoleHeader         from '../components/mission-control/PoleHeader'
import WorldMapSubstrate  from '../components/mission-control/WorldMapSubstrate'
import WheelStage         from '../components/mission-control/WheelStage'
import ActionCard         from '../components/mission-control/ActionCard'
import SideRail           from '../components/mission-control/SideRail'
import Tile               from '../components/mission-control/Tile'
import Panel              from '../components/mission-control/Panel'

import HorizonStateGauge   from '../components/mission-control/HorizonStateGauge'
import MapPinGlyph         from '../components/mission-control/MapPinGlyph'
import PurposePieceGlyph   from '../components/mission-control/PurposePieceGlyph'
import TargetSprintGlyph   from '../components/mission-control/TargetSprintGlyph'
import TargetSprintSlider  from '../components/mission-control/TargetSprintSlider'

import useMissionControlData from '../components/mission-control/useMissionControlData'
import { BG_PARCHMENT, BG_INK } from '../components/mission-control/tokens'

// Horizon State daily ritual — embedded in the slider panel
import {
  BaselineCard,
  useHorizonStateData,
  writeSummary as writeHorizonStateSummary,
} from '../../tools/horizon-state/HorizonState'

// ─── Spoke order matters. These two arrays are the canonical
//     order on Mission Control. The labels are what render on the
//     wheel; the keys are what the data layer queries by.
const SELF_LABELS = ['PATH', 'SPARK', 'BODY', 'FINANCES', 'CONNECTION', 'INNER GAME', 'SIGNAL']
const SELF_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

const CIV_LABELS  = ['VISION', 'HUMAN', 'NATURE', 'FINANCE', 'TECH', 'LEGACY', 'SOCIETY']
const CIV_KEYS    = ['vision', 'human', 'nature', 'finance', 'tech', 'legacy', 'society']

// Helper: derive map score lookups from the horizon_profile rows.
// Falls back to map_results.session.{currentScores,horizonScores}
// for users whose Map predates horizon_profile being populated.
function buildScoreMap(mapRows, mapResults) {
  const horizons = {}
  const current = {}

  if (Array.isArray(mapRows)) {
    for (const row of mapRows) {
      if (row?.domain) {
        horizons[row.domain] = row.horizon_score ?? row.horizon_goal ?? null
        current[row.domain] = row.current_score ?? null
      }
    }
  }

  // Fallback: pull anything missing from the Map session blob.
  const sessCurrent = mapResults?.session?.currentScores
  const sessHorizon = mapResults?.session?.horizonScores
  for (const k of SELF_KEYS) {
    if (current[k] == null && sessCurrent && sessCurrent[k] != null) {
      current[k] = sessCurrent[k]
    }
    if (horizons[k] == null && sessHorizon && sessHorizon[k] != null) {
      horizons[k] = sessHorizon[k]
    }
  }

  return { horizons, current }
}

function countPlaced(current) {
  return Object.values(current).filter(v => v != null).length
}

// Resolve placement from a purpose_piece_results row. The writer has
// gone through three eras; we walk all sources of truth in order of
// recency until one produces a value.
//
//   1. Top-level columns:         row.archetype, row.domain, row.scale (v10+)
//   2. Resolved profile column:   row.profile.{archetype,domain,scale}
//   3. Session flat fields:       row.session.{archetype,domain,scale} (v10 sessions)
//   4. Session tentative nested:  row.session.tentative.{archetype.archetype,
//                                 domain.domain, scale.scale} (pre-v10)
//   5. Session p4Profile fallback: row.session.p4Profile.{archetype,domain,scale}
//
// purposeData here is the FULL ROW (the hook now passes the row,
// not just .session). When called with anything falsy, returns null.
function resolvePlacementFields(purposeData) {
  if (!purposeData) return { archetype: null, domain: null, scale: null }

  const session = purposeData.session || null
  const profile = purposeData.profile || session?.p4Profile || null

  // Each field tries the chain independently so a row that has,
  // say, a top-level archetype but only a session.tentative domain
  // still fully resolves.
  const archetype =
    purposeData.archetype ||
    profile?.archetype ||
    session?.archetype ||
    session?.tentative?.archetype?.archetype ||
    null

  const domain =
    purposeData.domain ||
    profile?.domain ||
    session?.domain ||
    session?.tentative?.domain?.domain ||
    null

  const scale =
    purposeData.scale ||
    profile?.scale ||
    session?.scale ||
    session?.tentative?.scale?.scale ||
    null

  return { archetype, domain, scale }
}

// Format placement caption — "ARCHETYPE · DOMAIN · SCALE".
function formatPlacement(purposeData) {
  const { archetype, domain, scale } = resolvePlacementFields(purposeData)
  const parts = [archetype, domain, scale].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ').toUpperCase() : null
}

// Active sprint key — the personal-wheel spoke that gets the glow.
function activeSprintKey(sprintData) {
  if (!Array.isArray(sprintData) || sprintData.length === 0) return null
  const s = sprintData[0]
  if (!Array.isArray(s.domains) || s.domains.length === 0) return null
  const first = s.domains[0]
  return SELF_KEYS.includes(first) ? first : null
}

// Civ placement key — the civ-wheel spoke that gets the placement marker.
// Domain may arrive as a slug ('human-being'), a label ('Human Being'),
// or a key ('human'). Map all known shapes onto the civ wheel keys.
function civPlacementKey(purposeData) {
  if (!purposeData) return null

  // Try the slug first if the writer left one on the row.
  const session = purposeData.session || null
  const slug =
    purposeData.domain_id ||
    purposeData.profile?.domain_id ||
    session?.domain_id ||
    session?.tentative?.domain?.domain_id ||
    session?.tentative?.domain?.slug ||
    null

  // Otherwise fall back to whatever the resolver gave us as the
  // domain string (could be a label or a key).
  const { domain } = resolvePlacementFields(purposeData)

  const slugMap = {
    'human-being':     'human',
    'society':         'society',
    'nature':          'nature',
    'technology':      'tech',
    'finance-economy': 'finance',
    'legacy':          'legacy',
    'vision':          'vision',
  }

  const labelMap = {
    'human being':       'human',
    'human':             'human',
    'society':           'society',
    'nature':            'nature',
    'technology':        'tech',
    'tech':              'tech',
    'finance & economy': 'finance',
    'finance and economy': 'finance',
    'finance':           'finance',
    'legacy':            'legacy',
    'vision':            'vision',
  }

  if (slug && slugMap[slug]) return slugMap[slug]
  if (slug && CIV_KEYS.includes(slug)) return slug

  if (domain) {
    const norm = String(domain).toLowerCase().trim()
    if (labelMap[norm]) return labelMap[norm]
    if (CIV_KEYS.includes(norm)) return norm
  }

  return null
}

export default function BetaMissionControl() {
  const navigate = useNavigate()
  const data = useMissionControlData()
  const [activePanel, setActivePanel] = useState(null)
  const [currentWheel, setCurrentWheel] = useState('personal')

  const isCiv = currentWheel === 'civ'

  // Personal wheel data
  const { horizons: selfHorizons, current: selfCurrent } = useMemo(
    () => buildScoreMap(data.mapData, data.mapResults),
    [data.mapData, data.mapResults]
  )
  const placedCount = countPlaced(selfCurrent)
  const sprintKey = activeSprintKey(data.sprintData)

  // Civ wheel data — until indicator pipeline produces a 0–10 score
  // per civ domain, civ_current is empty {} (renders dashed empty
  // polygon). Horizons are uniform 10 by spec.
  // WIRE: replace civCurrent with a query against the score weights
  // table once headline indicators flow.
  const civCurrent = {}
  const civHorizons = useMemo(
    () => Object.fromEntries(CIV_KEYS.map(k => [k, 10])),
    []
  )

  // Walker layer — empty by default. RENDERS NOTHING when 0.
  const personalWalkers = {}
  const civWalkers = {}

  // Identity strings.
  const rawName  = data.profile?.display_name || data.user?.email?.split('@')[0] || 'Your name'
  const userName = rawName

  // Placement: internal sentinel for control flow + display variant.
  const placement = formatPlacement(data.purposeData) || 'PURPOSE PIECE NOT YET PLACED'
  const isUnplaced = placement === 'PURPOSE PIECE NOT YET PLACED'
  const displayPlacement = isUnplaced ? null : placement

  // Civ placement marker
  const civPlacement = civPlacementKey(data.purposeData)

  // Stage dark-mode flip
  useEffect(() => {
    const stage = document.getElementById('mc-stage-root')
    if (!stage) return
    if (isCiv) {
      stage.setAttribute('data-stage', 'dark')
    } else {
      stage.removeAttribute('data-stage')
    }
  }, [isCiv])

  const closePanel = () => setActivePanel(null)

  // Tapping a right-rail tile flips to civ AND opens the panel.
  // Tapping a left-rail tile flips to personal AND opens the panel.
  const openPersonalPanel = (key) => {
    setCurrentWheel('personal')
    setActivePanel(key)
  }
  const openCivPanel = (key) => {
    setCurrentWheel('civ')
    setActivePanel(key)
  }

  // ─── Action card content ─────────────────────────────────────
  // NOTE: The smarter "next move" state machine lands in Drop 3.
  // For Drop 1, the existing fallback copy holds.
  const personalAction = (() => {
    const s = Array.isArray(data.sprintData) && data.sprintData[0]
    if (s) {
      const domain = Array.isArray(s.domains) && s.domains[0]
      const domainLabel = domain ? domain.replace('_', ' ').toUpperCase() : 'A SPRINT'
      return {
        empty: false,
        eyebrow: 'YOUR LIFE · NEXT MOVE',
        context: `${domainLabel} SPRINT · ACTIVE`,
        title: 'Open your active sprint.',
        body:  'Your sprint is the work in front of you. Open it for next actions and the conversation log.',
        primaryLabel:  'OPEN SPRINT',
        onPrimary:     () => navigate('/tools/target-sprint'),
        tertiaryLabel: 'LATER',
        onTertiary:    closePanel,
      }
    }
    return {
      empty: true,
      eyebrow: 'YOUR LIFE · NEXT MOVE',
      context: 'NOTHING COMMITTED YET',
      title: 'The Map and the Purpose Piece are the doors.',
      body:  'When a sprint is active or a practice is running, the next move surfaces here.',
      primaryLabel:  'OPEN THE MAP',
      onPrimary:     () => navigate('/tools/map'),
      tertiaryLabel: 'PURPOSE PIECE',
      onTertiary:    () => navigate('/tools/purpose-piece'),
    }
  })()

  const civAction = {
    empty: true,
    eyebrow: 'THE PLANET · NEXT MOVE',
    context: isUnplaced
      ? 'PLACEMENT FIRST'
      : 'NO QUESTS IN YOUR RANGE YET',
    title: isUnplaced
      ? 'Find where you fit.'
      : 'No quests in your range yet.',
    body: isUnplaced
      ? 'In building the future of the planet. The Purpose Piece sets your archetype, domain, and scale. The quests feed surfaces here once you find your fit.'
      : 'Quests appear here as orgs in your area post them. Browse broader if nothing is here yet.',
    primaryLabel: isUnplaced ? 'FIND YOUR FIT' : 'BROWSE BROADER',
    onPrimary:    () => navigate(
      isUnplaced ? '/tools/purpose-piece' : '/beta/contribution'
    ),
    tertiaryLabel: 'LATER',
    onTertiary:    closePanel,
  }

  // ─── Rail states ─────────────────────────────────────────────
  // State lines now render only when meaningful. Empty → null.

  const hsState = data.foundationData?.streak_days
    ? `${data.foundationData.streak_days}D STREAK`
    : null

  // Target Sprint — week of 13, surfaces the time axis from the
  // bullseye logo's grid.
  const tsState = (() => {
    if (!Array.isArray(data.sprintData) || data.sprintData.length === 0) return null
    const sprint = data.sprintData[0]
    if (!sprint?.created_at) return 'ACTIVE'
    const start = new Date(sprint.created_at)
    const now = new Date()
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24))
    const week = Math.max(1, Math.min(13, Math.floor(days / 7) + 1))
    return `WEEK ${week} / 13`
  })()

  const hpState = data.practiceData?.session_date ? 'RECENT' : null

  // Map: only show count when audit has actually started.
  // Count from the resolved selfCurrent so map_results fallback
  // is reflected in the rail state line.
  const mapAudited = countPlaced(selfCurrent)
  const mapState = mapAudited === 0
    ? null
    : mapAudited === 7
      ? 'COMPLETE'
      : `${mapAudited} OF 7`

  // Placement: shows archetype as state line when placed.
  const placementState = isUnplaced ? null : placement.split(' · ')[0]

  // World View / Planet Sprint: no real state until civ data flows.
  const worldViewState = null
  const planetSprintState = null

  return (
    <div
      id="mc-stage-root"
      className="mc-stage-root"
    >
      <style>{STAGE_CSS}</style>

      {/* Substrate sits at the top of the stage so it bleeds up
          behind the identity band and the PoleHeader, then runs
          full-height down through the wheel and action cards.
          The brand bar sits above it (z-index 10 via the identity
          strip's stacking context) with its own opaque parchment
          background; everything else is either transparent or
          translucent. */}
      <WorldMapSubstrate />

      <IdentityStrip
        userName={userName}
        placement={displayPlacement}
        onProfile={() => setActivePanel('profile')}
        onSettings={() => setActivePanel('settings')}
        onFindFit={() => openCivPanel('purpose-piece')}
      />

      <PoleHeader
        active={isCiv ? 'civ' : 'self'}
        onSelectSelf={() => setCurrentWheel('personal')}
        onSelectCiv={() => setCurrentWheel('civ')}
      />

      {/* ─── BODY: rails + wheel + scroll-below ──────────────── */}

      <main className="mc-body">

        <div className="mc-grid">

          {/* LEFT RAIL — Your Life */}
          <SideRail side="left">
            <Tile
              glyph={<MapPinGlyph />}
              label={<>THE<br/>MAP</>}
              state={mapState}
              onClick={() => openPersonalPanel('map')}
              title="The Map — your seven domains"
            />
            <Tile
              glyph={<HorizonStateGauge />}
              label={<>HORIZON<br/>STATE</>}
              state={hsState}
              onClick={() => openPersonalPanel('horizon-state')}
              title="Horizon State — daily check-in"
            />
            <Tile
              glyph={<TargetSprintGlyph />}
              label={<>TARGET<br/>SPRINT</>}
              state={tsState}
              onClick={() => openPersonalPanel('target-sprint')}
              title="Target Sprint — 90-day commitment"
            />
            <Tile
              glyph="✦"
              label={<>HORIZON<br/>PRACTICE</>}
              state={hpState}
              onClick={() => openPersonalPanel('horizon-practice')}
              title="Horizon Practice"
            />
            <Tile
              glyph="≡"
              label="RESOURCES"
              state={null}
              onClick={() => openPersonalPanel('resources')}
              title="Resources for self"
            />
          </SideRail>

          {/* CENTRE — wheel */}
          <div className="mc-centre-col">
            <WheelStage
              currentWheel={currentWheel}
              onSwitchWheel={setCurrentWheel}
              personalProps={{
                labels:    SELF_LABELS,
                keys:      SELF_KEYS,
                horizons:  selfHorizons,
                current:   selfCurrent,
                activeKey: sprintKey,
                walkers:   personalWalkers,
                isEmpty:   placedCount === 0,
              }}
              civProps={{
                labels:        CIV_LABELS,
                keys:          CIV_KEYS,
                horizons:      civHorizons,
                current:       civCurrent,
                placementKey:  civPlacement,
                walkers:       civWalkers,
                isEmpty:       Object.keys(civCurrent).length === 0,
              }}
            />
          </div>

          {/* RIGHT RAIL — The Planet (3 tiles, working titles)
              Top:    Placement (Purpose Piece grown up)
              Middle: World View (planetary explore)
              Bottom: Planet Sprint (Target Sprint civ-side, accepts org-posted quests) */}
          <SideRail side="right">
            <Tile
              glyph={<PurposePieceGlyph />}
              label="PLACEMENT"
              state={placementState}
              onClick={() => openCivPanel('purpose-piece')}
              title="Placement — where you fit"
            />
            <Tile
              glyph="◯"
              label={<>WORLD<br/>VIEW</>}
              state={worldViewState}
              onClick={() => openCivPanel('world-view')}
              title="World View — explore the planetary state"
            />
            <Tile
              glyph="⇶"
              label={<>PLANET<br/>SPRINT</>}
              state={planetSprintState}
              onClick={() => openCivPanel('missions')}
              title="Planet Sprint — quests offered by orgs"
            />
          </SideRail>

        </div>

        {/* SCROLL-BELOW: action cards */}
        <div className="mc-actions">
          <ActionCard {...personalAction} dark={false} />
          <ActionCard {...civAction}      dark={isCiv} />
        </div>
      </main>

      {/* ─── PANELS ──────────────────────────────────────────── */}

      <Panel
        open={activePanel === 'horizon-state'}
        onClose={closePanel}
        eyebrow="DAILY · HORIZON STATE"
        title="How are you arriving today?"
        actions={[
          { label: 'REPORTS & LOGS →', primary: true,
            onClick: () => navigate('/tools/horizon-state') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <HorizonStateSlider user={data.user} />
      </Panel>

      <Panel
        open={activePanel === 'target-sprint'}
        onClose={closePanel}
        eyebrow="90-DAY COMMITMENT · TARGET SPRINT"
        title="Today's bearing"
        actions={[
          { label: 'FULL SPRINT VIEW →', primary: true,
            onClick: () => navigate('/tools/target-sprint') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <TargetSprintSlider
          user={data.user}
          sprintData={data.sprintData}
          onNavigate={navigate}
        />
      </Panel>

      <Panel
        open={activePanel === 'horizon-practice'}
        onClose={closePanel}
        eyebrow="DAILY ANCHORS · HORIZON PRACTICE"
        title="What you're tending to today"
        actions={[
          { label: 'OPEN PRACTICE', primary: true,
            onClick: () => navigate('/tools/horizon-practice') },
          { label: 'LATER', onClick: closePanel },
        ]}
      >
        <p>Practices are short daily things, five minutes or ten, that hold the work between sprint days. The I Am statements you wrote in The Map anchor the practice from underneath.</p>
        <div className="mc-panel-build-edge">
          Building in progress. Full practice library and daily check-in flow open at /tools/horizon-practice.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'resources'}
        onClose={closePanel}
        eyebrow="FOR YOUR WORK · RESOURCES"
        title="Things that fit where you are"
      >
        <p>Surfaced from across NextUs based on your active sprint and current practice. Articles, conversations, practitioners, books, exercises. Updated as your work moves.</p>
        <div className="mc-panel-build-edge">
          Building in progress. Resource library wires up when the surface is wired.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'world-view'}
        onClose={closePanel}
        eyebrow="CIVILISATIONAL · WORLD VIEW"
        title="The state of the world right now"
        dark
      >
        <p>The seven civilisational domains, with current global state and Horizon Future for each. Click any domain or subdomain to see what's happening there: actors, contributions, gap signals, horizon goals being worked on.</p>
        <div className="mc-panel-build-edge">
          Building in progress. The full World View, with interactive civ wheel, drill-down per domain, and indicator detail with sources, renders here as the data sourcing layer fills in.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'missions'}
        onClose={closePanel}
        eyebrow="OUTWARD AIM · PLANET SPRINT"
        title="Quests in your range"
        dark
      >
        <p>Planet Sprint is Target Sprint pointed outward. Same architecture, civilisational target. Quests are sprints offered by orgs and other actors, ready to accept. Time-frames vary: a doc edit by Tuesday, a community garden build over six weeks, a multi-month policy push.</p>
        <div className="mc-panel-build-edge">
          Building in progress. Quest feed, accept-quest flow, and contribution log render here once orgs start posting.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'profile'}
        onClose={closePanel}
        eyebrow="YOU · PROFILE"
        title="What others see of you on NextUs"
        actions={[
          { label: 'EDIT PROFILE', primary: true,
            onClick: () => navigate('/beta/profile/edit') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <p>Your public face on the platform. Your I Am statements, your fit, what you're working on, how others can reach you. You control what's visible.</p>
        <div className="mc-panel-build-edge">
          Building in progress. Full profile editor, visibility controls per field, and public preview wire up at /beta/profile/edit.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'purpose-piece'}
        onClose={closePanel}
        eyebrow="YOUR FIT · PURPOSE PIECE"
        title={!isUnplaced ? placement.split(' · ').map(s => s.toLowerCase()).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' · ') : 'Find where you fit.'}
        actions={[
          { label: !isUnplaced ? 'REVISIT YOUR FIT' : 'BEGIN', primary: true,
            onClick: () => navigate('/tools/purpose-piece') },
          { label: 'LATER', onClick: closePanel },
        ]}
        dark
      >
        <p>Where you fit in building the future of the planet. Archetype, civilisational domain, scale. About an hour to do well; you can revisit and adjust as the work moves.</p>
        <div className="mc-panel-build-edge">
          Building in progress. Full Purpose Piece editor, archetype browser, and scale-shift flow open at /tools/purpose-piece.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'map'}
        onClose={closePanel}
        eyebrow="FOUNDATION · THE MAP"
        title="Your seven domains"
        actions={[
          { label: placedCount === 7 ? 'REVISIT A DOMAIN' : 'CONTINUE THE AUDIT', primary: true,
            onClick: () => navigate('/tools/map') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <p>The Map is where you wrote your I Am statements and set your Horizon scores across the seven personal domains. Real work, typically a week or more if done well, one domain at a time. You revisit it when something shifts.</p>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          {placedCount} of 7 domains audited.
        </p>
        <div className="mc-panel-build-edge">
          Building in progress. Full Map flow, domain detail editor, and I Am statement revision open at /tools/map.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'settings'}
        onClose={closePanel}
        eyebrow="SYSTEM · SETTINGS"
        title="Account & preferences"
      >
        <p>Your account, your privacy, your notifications, your data. Quiet controls.</p>
        <div className="mc-panel-build-edge">
          Building in progress. Full settings panel wires up when the surface is wired.
        </div>
      </Panel>
    </div>
  )
}

const STAGE_CSS = `
.mc-stage-root {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${BG_PARCHMENT};
  transition: background 0.6s ease;
  color: #0F1523;
}
.mc-stage-root[data-stage="dark"] {
  background: ${BG_INK};
  color: #FFFFFF;
}

/* ─── BODY: contains rails + wheel above the substrate ────── */

.mc-body {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ─── GRID: rails + wheel ──────────────────────────────────── */

.mc-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 90px 1fr 90px;
  gap: 16px;
  padding: 28px 24px 16px;
  align-items: start;
}

.mc-centre-col {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 380px;
  padding: 0 24px;
}

/* ─── ACTION CARDS — scroll-below ──────────────────────────── */

.mc-actions {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 16px 24px 32px;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

/* ─── BREAKPOINTS ──────────────────────────────────────────── */

@media (min-width: 1024px) {
  .mc-grid {
    grid-template-columns: 110px 1fr 110px;
    gap: 24px;
    padding: 36px 40px 20px;
  }
  .mc-centre-col {
    min-height: 480px;
    padding: 0 40px;
  }
  .mc-actions {
    padding: 24px 40px 40px;
    gap: 32px;
  }
}

@media (max-width: 640px) {
  .mc-grid {
    grid-template-columns: 64px 1fr 64px;
    gap: 8px;
    padding: 16px 12px 12px;
  }
  .mc-centre-col {
    min-height: 320px;
    padding: 0 6px;
  }
  .mc-actions {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 12px 16px 28px;
  }
}

/* Even tighter on the smallest phones */
@media (max-width: 380px) {
  .mc-grid {
    grid-template-columns: 56px 1fr 56px;
    gap: 6px;
    padding: 12px 8px 8px;
  }
}
`

// ─── HorizonStateSlider ───────────────────────────────────────
//
// Wrapper that fetches Horizon State data inside the panel and
// renders the shared BaselineCard in compact mode. Hook fires only
// when the panel opens.

function HorizonStateSlider({ user }) {
  const { audioUrl, audioLoading, audioError, sessions, lifeIaStatement, reload } = useHorizonStateData(user)

  async function handleAfterComplete(afterData, beforeData, updatedSessions) {
    await writeHorizonStateSummary(user, updatedSessions, afterData, beforeData)
    reload()
  }

  return (
    <BaselineCard
      compact
      user={user}
      audioUrl={audioUrl}
      audioLoading={audioLoading}
      audioError={audioError}
      sessions={sessions}
      lifeIaStatement={lifeIaStatement}
      onAfterComplete={handleAfterComplete}
    />
  )
}
