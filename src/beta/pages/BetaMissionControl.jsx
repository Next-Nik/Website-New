// ─────────────────────────────────────────────────────────────
// BetaMissionControl — /beta/dashboard
//
// v4 swap. The wheel IS the cockpit. Users steer between Your Life
// (personal seven-domain wheel) and The Planet (civilisational
// seven-domain wheel) via a switcher pill at the bottom of the
// stage. Switching to The Planet flips the whole stage to dark via
// the data-stage="dark" attribute on the root.
//
// Surface layout:
//   • TopStrip                 — brand · identity · MISSION CONTROL
//   • Ticker                   — single rotating activity line
//                                (empty state: "Quiet right now.")
//   • SideRail (left)          — Horizon State · Target Sprint ·
//                                Horizon Practice · Resources
//   • WheelStage               — the wheel cockpit + switcher
//   • SideRail (right)         — World View · What's So · Missions
//   • ActionCard × 2           — next move on each side
//   • Dock                     — Profile · Purpose Piece · The Map · Settings
//
// Data layer (untouched from v3 build):
//   useMissionControlData() returns user, profile, mapData,
//   purposeData, sprintData, practiceData, foundationData.
//
// Empty-state philosophy (locked, see Working_With_Nik §5):
//   • Personal wheel — when no current scores have flowed yet,
//     the polygon is replaced with a small dashed centre marker.
//   • Civ wheel — same dashed empty state, until the indicator
//     pipeline is wired into a 0–10 score per domain.
//   • Walker layer — RENDERS NOTHING when count is zero. No demo
//     numbers. Wire-up point marked below.
//   • Ticker — empty state line: "Quiet right now."
//
// Wire-up points marked with WIRE: comments. Each one names what
// the source will be when it is built.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import TopStrip      from '../components/mission-control/TopStrip'
import Ticker        from '../components/mission-control/Ticker'
import WheelStage    from '../components/mission-control/WheelStage'
import ActionCard    from '../components/mission-control/ActionCard'
import SideRail      from '../components/mission-control/SideRail'
import Tile          from '../components/mission-control/Tile'
import Dock          from '../components/mission-control/Dock'
import DockTile      from '../components/mission-control/DockTile'
import Panel         from '../components/mission-control/Panel'

import useMissionControlData from '../components/mission-control/useMissionControlData'
import { BG_PARCHMENT, BG_INK } from '../components/mission-control/tokens'

// ─── Spoke order matters. These two arrays are the canonical
//     order on Mission Control. The labels are what render on the
//     wheel; the keys are what the data layer queries by.
const SELF_LABELS = ['PATH', 'SPARK', 'BODY', 'FINANCES', 'CONNECTION', 'INNER GAME', 'SIGNAL']
const SELF_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

const CIV_LABELS  = ['VISION', 'HUMAN', 'NATURE', 'FINANCE', 'TECH', 'LEGACY', 'SOCIETY']
const CIV_KEYS    = ['vision', 'human', 'nature', 'finance', 'tech', 'legacy', 'society']

// Helper: derive map score lookups from the horizon_profile rows
function buildScoreMap(mapRows) {
  const horizons = {}
  const current = {}
  if (!Array.isArray(mapRows)) return { horizons, current }
  for (const row of mapRows) {
    if (row?.domain) {
      horizons[row.domain] = row.horizon_score ?? row.horizon_goal ?? null
      current[row.domain] = row.current_score ?? null
    }
  }
  return { horizons, current }
}

function countPlaced(current) {
  return Object.values(current).filter(v => v != null).length
}

// Format placement caption from purpose_piece_results.session
function formatPlacement(purposeData) {
  if (!purposeData) return null
  const archetype = purposeData?.archetype?.label || purposeData?.archetype || null
  const domain    = purposeData?.domain?.label    || purposeData?.domain    || null
  const scale     = purposeData?.scale?.label     || purposeData?.scale     || null
  const parts = [archetype, domain, scale].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ').toUpperCase() : null
}

// Active sprint key — the personal-wheel spoke that gets the glow.
// Reads the first active sprint and returns its primary domain.
function activeSprintKey(sprintData) {
  if (!Array.isArray(sprintData) || sprintData.length === 0) return null
  const s = sprintData[0]
  if (!Array.isArray(s.domains) || s.domains.length === 0) return null
  const first = s.domains[0]
  // Domain keys in the sprint table use the same slugs as SELF_KEYS
  return SELF_KEYS.includes(first) ? first : null
}

// Civ placement key — the civ-wheel spoke that gets the placement marker.
function civPlacementKey(purposeData) {
  if (!purposeData) return null
  const slug = purposeData?.domain?.slug || purposeData?.domain || null
  if (!slug) return null
  // Map placement domain slugs (e.g. "human-being") to civ wheel keys
  const slugToKey = {
    'human-being':     'human',
    'society':         'society',
    'nature':          'nature',
    'technology':      'tech',
    'finance-economy': 'finance',
    'legacy':          'legacy',
    'vision':          'vision',
  }
  return slugToKey[slug] || (CIV_KEYS.includes(slug) ? slug : null)
}

export default function BetaMissionControl() {
  const navigate = useNavigate()
  const data = useMissionControlData()
  const [activePanel, setActivePanel] = useState(null)
  const [currentWheel, setCurrentWheel] = useState('personal')

  // Personal wheel data
  const { horizons: selfHorizons, current: selfCurrent } = useMemo(
    () => buildScoreMap(data.mapData),
    [data.mapData]
  )
  const placedCount = countPlaced(selfCurrent)
  const sprintKey = activeSprintKey(data.sprintData)

  // Civ wheel data — until the indicator pipeline produces a 0–10
  // score per civ domain, civ_current is empty {} which renders the
  // dashed empty polygon. Horizons are uniform 10 by spec.
  // WIRE: replace the empty civ_current object with a query against
  // the score weights table once headline indicators are flowing.
  const civCurrent = {}
  const civHorizons = useMemo(
    () => Object.fromEntries(CIV_KEYS.map(k => [k, 10])),
    []
  )

  // Walker layer — empty by default. RENDERS NOTHING when 0.
  // WIRE: replace with a contributor_profiles_beta count query
  // grouped by sprint domain (personal) and placement domain (civ)
  // once the contributor density layer is built.
  const personalWalkers = {}
  const civWalkers = {}

  // Identity strings
  const userName  = data.profile?.display_name || data.user?.email?.split('@')[0] || 'Your name'
  const placement = formatPlacement(data.purposeData) || 'PURPOSE PIECE NOT YET PLACED'

  // Civ placement marker
  const civPlacement = civPlacementKey(data.purposeData)

  // Stage dark-mode flip
  useEffect(() => {
    const stage = document.getElementById('mc-stage-root')
    if (!stage) return
    if (currentWheel === 'civ') {
      stage.setAttribute('data-stage', 'dark')
    } else {
      stage.removeAttribute('data-stage')
    }
  }, [currentWheel])

  const closePanel = () => setActivePanel(null)

  // ─── Action card content ─────────────────────────────────────
  // Personal: derive from sprintData if a sprint exists, otherwise
  // fall through to the neutral "nothing committed yet" copy.
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

  // Civ: missions feed is not yet built. Empty state always for now.
  // WIRE: replace with a query against the missions/quests table once
  // the org-posts-a-mission backend ships.
  const civAction = {
    empty: true,
    eyebrow: 'THE PLANET · NEXT MOVE',
    context: placement === 'PURPOSE PIECE NOT YET PLACED'
      ? 'PLACE YOURSELF FIRST'
      : 'NO MISSIONS IN YOUR RANGE YET',
    title: placement === 'PURPOSE PIECE NOT YET PLACED'
      ? 'Place yourself, then the planet shows up.'
      : 'No missions in your range yet.',
    body: placement === 'PURPOSE PIECE NOT YET PLACED'
      ? 'The Purpose Piece sets your archetype, domain, and scale. The mission feed surfaces here once you place yourself.'
      : 'Missions and quests appear here as orgs in your area post them. Browse broader if nothing is here yet.',
    primaryLabel: placement === 'PURPOSE PIECE NOT YET PLACED' ? 'PLACE YOURSELF' : 'BROWSE BROADER',
    onPrimary:    () => navigate(
      placement === 'PURPOSE PIECE NOT YET PLACED' ? '/tools/purpose-piece' : '/beta/contribution'
    ),
    tertiaryLabel: 'LATER',
    onTertiary:    closePanel,
  }

  // ─── Rail states ─────────────────────────────────────────────
  // Each rail tile gets a small state line. Until launch, most
  // states fall back to "—" because no real activity exists yet.
  const hsState = data.foundationData?.streak_days
    ? `${data.foundationData.streak_days}D STREAK`
    : 'UNTOUCHED'
  const hsPulse = !data.foundationData?.last_session_at
  const tsState = Array.isArray(data.sprintData) && data.sprintData.length > 0
    ? `${data.sprintData.length} ACTIVE`
    : 'NONE'
  const hpState = data.practiceData?.session_date ? 'RECENT' : 'NONE'

  // Ticker — empty list until the activity feed is wired.
  // WIRE: replace [] with a query against the future
  // nextus_activity_feed table, scoped to the user's slice.
  const tickerLines = []

  return (
    <div
      id="mc-stage-root"
      className="mc-stage-root"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr auto',
        background: BG_PARCHMENT,
        transition: 'background 0.6s ease',
        color: '#0F1523',
      }}
    >
      <style>{STAGE_CSS}</style>

      <TopStrip userName={userName} placement={placement} />

      <Ticker
        eyebrow="RECENTLY ACROSS YOUR SLICE"
        lines={tickerLines}
      />

      <div className="mc-centre">
        <div className="mc-scene">
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

        <div className="mc-actions">
          <ActionCard {...personalAction} dark={false} />
          <ActionCard {...civAction}      dark={currentWheel === 'civ'} />
        </div>
      </div>

      {/* LEFT RAIL — personal-side tools */}
      <SideRail side="left">
        <Tile
          glyph="◐"
          label={<>HORIZON<br/>STATE</>}
          state={hsState}
          pulse={hsPulse}
          onClick={() => setActivePanel('horizon-state')}
          title="Horizon State — daily check-in"
        />
        <Tile
          glyph="▲"
          label={<>TARGET<br/>SPRINT</>}
          state={tsState}
          onClick={() => setActivePanel('target-sprint')}
          title="Target Sprint"
        />
        <Tile
          glyph="✦"
          label={<>HORIZON<br/>PRACTICE</>}
          state={hpState}
          onClick={() => setActivePanel('horizon-practice')}
          title="Horizon Practice"
        />
        <Tile
          glyph="≡"
          label="RESOURCES"
          state="—"
          onClick={() => setActivePanel('resources')}
          title="Resources for self"
        />
      </SideRail>

      {/* RIGHT RAIL — planet surfaces */}
      <SideRail side="right">
        <Tile
          glyph="◯"
          label={<>WORLD<br/>VIEW</>}
          state={civPlacement ? 'PLACED' : 'UNPLACED'}
          onClick={() => setActivePanel('world-view')}
          title="World View — current state of all seven civ domains"
        />
        <Tile
          glyph="◊"
          label={<>WHAT'S<br/>SO</>}
          state={civPlacement ? 'YOUR VECTOR' : '—'}
          onClick={() => setActivePanel('whats-so')}
          title="What's So — drill-in indicator data at your vector"
        />
        <Tile
          glyph="⇶"
          label={<>MISSIONS<br/>&amp; QUESTS</>}
          state="EMPTY"
          onClick={() => setActivePanel('missions')}
          title="Missions & Quests — feed of contributions in your range"
        />
      </SideRail>

      {/* BOTTOM UTILITY RAIL */}
      <Dock>
        <DockTile
          label="YOU"
          name="Profile"
          onClick={() => setActivePanel('profile')}
        />
        <DockTile
          label="PLACEMENT"
          name="Purpose Piece"
          onClick={() => setActivePanel('purpose-piece')}
        />
        <DockTile
          label="FOUNDATION"
          name="The Map"
          onClick={() => setActivePanel('map')}
        />
        <DockTile
          label="SYSTEM"
          name="Settings"
          onClick={() => setActivePanel('settings')}
        />
      </Dock>

      {/* ─── PANELS ──────────────────────────────────────────── */}

      <Panel
        open={activePanel === 'horizon-state'}
        onClose={closePanel}
        eyebrow="DAILY · HORIZON STATE"
        title="How are you arriving today?"
        actions={[
          { label: 'OPEN HORIZON STATE', primary: true,
            onClick: () => navigate('/tools/horizon-state') },
          { label: 'LATER', onClick: closePanel },
        ]}
      >
        <p>A short check-in with your nervous system. Two minutes. No right answer. The point is noticing where you're starting from before the day takes hold.</p>
        <div className="mc-panel-build-edge">
          Building in progress. The full check-in flow opens at /tools/horizon-state.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'target-sprint'}
        onClose={closePanel}
        eyebrow="90-DAY COMMITMENT · TARGET SPRINT"
        title="Your active sprint"
        actions={[
          { label: 'OPEN TARGET SPRINT', primary: true,
            onClick: () => navigate('/tools/target-sprint') },
          { label: 'LATER', onClick: closePanel },
        ]}
      >
        <p>Three things a week. Notes after each. The point is to feel out the actual shape of what's pulling at you.</p>
        <div className="mc-panel-build-edge">
          Building in progress. The full sprint detail, conversation log, and reflection prompts open at /tools/target-sprint.
        </div>
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
        <p>Practices are short daily things — five minutes, ten minutes — that hold the work between sprint days. The I Am statements you wrote in The Map anchor the practice from underneath.</p>
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
        <p>The seven civilisational domains — Vision, Human, Nature, Finance, Tech, Legacy, Society — with current global state and Horizon Future for each. The wheel you saw on Mission Control, opened up.</p>
        <div className="mc-panel-build-edge">
          Building in progress. The full World View — interactive civ wheel, drill-down per domain, indicator detail with sources — renders here as the data sourcing layer fills in.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'whats-so'}
        onClose={closePanel}
        eyebrow="YOUR VECTOR · WHAT'S SO"
        title={civPlacement ? `Your vector, right now` : 'Place yourself, then drill in.'}
        dark
      >
        <p>{civPlacement
          ? `The honest picture at your specific Purpose Piece vector. Not curated. Not optimistic. What the indicators actually say about your placement in the civ board.`
          : `What's So drills into the indicator data at your vector — your archetype, domain, and scale. Until you've placed yourself with the Purpose Piece, there's no vector to drill into.`
        }</p>
        <div className="mc-panel-build-edge">
          Building in progress. Full indicator detail at your vector renders here once the data sourcing layer is wired across all seven civ domains.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'missions'}
        onClose={closePanel}
        eyebrow="FEED · MISSIONS & QUESTS"
        title="No missions in your range yet."
        dark
      >
        <p>Missions and quests are specific contributions you can take on, posted by orgs in your area or surfaced by the platform based on your vector. They appear here as orgs join NextUs and post them.</p>
        <div className="mc-panel-build-edge">
          Building in progress. Full mission feed, accept-mission flow, and contribution log render here once orgs start posting.
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
        <p>Your public face on the platform. Your I Am statements, your placement, what you're working on, how others can reach you. You control what's visible.</p>
        <div className="mc-panel-build-edge">
          Building in progress. Full profile editor, visibility controls per field, and public preview wire up at /beta/profile/edit.
        </div>
      </Panel>

      <Panel
        open={activePanel === 'purpose-piece'}
        onClose={closePanel}
        eyebrow="PLACEMENT · PURPOSE PIECE"
        title={placement !== 'PURPOSE PIECE NOT YET PLACED' ? placement.split(' · ').map(s => s.toLowerCase()).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' · ') : 'Place yourself in the larger picture'}
        actions={[
          { label: placement !== 'PURPOSE PIECE NOT YET PLACED' ? 'REVISIT YOUR PLACEMENT' : 'BEGIN', primary: true,
            onClick: () => navigate('/tools/purpose-piece') },
          { label: 'LATER', onClick: closePanel },
        ]}
      >
        <p>Where you've placed yourself in the larger picture. Archetype, civilisational domain, scale. About an hour to do well; you can revisit and adjust as the work moves.</p>
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
        <p>The Map is where you wrote your I Am statements and set your Horizon scores across the seven personal domains. Real work — typically a week or more if done well, one domain at a time. You revisit it when something shifts.</p>
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
.mc-stage-root[data-stage="dark"] {
  background: ${BG_INK} !important;
  color: #FFFFFF;
}

.mc-centre {
  display: grid;
  grid-template-rows: 1fr auto;
  padding: 32px 40px 28px;
  align-items: center;
  gap: 28px;
}

.mc-scene {
  position: relative;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mc-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  max-width: 1080px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}

@media (max-width: 1280px) {
  .mc-centre { padding-left: 80px; padding-right: 80px; }
}
@media (max-width: 1024px) {
  .mc-centre { padding: 24px 24px; }
}
@media (max-width: 880px) {
  .mc-centre { padding: 20px 16px 24px; }
  .mc-scene { min-height: 320px; }
  .mc-actions { grid-template-columns: 1fr; gap: 16px; }
}
`
