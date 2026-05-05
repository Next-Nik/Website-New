// ─────────────────────────────────────────────────────────────
// BetaMissionControl — /beta/dashboard
//
// The cockpit. Logged-in user lands here. Four regions:
//   • Top strip: brand · identity · glance wheel
//   • Ticker: rotating platform-motion line
//   • Centre: horizon scene with two BUILD buttons
//   • Side rails (left/right) and bottom dock: tile workspaces
//
// This is the SHELL. Each tile opens a Panel with placeholder
// content; the real tool bodies (Horizon State check-in inline,
// Target Sprint task list, etc.) get wired in chunk 2 per the
// Welcome plan §4.
//
// To find the wire-up points, search for "PANEL TODO".
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopStrip      from '../components/mission-control/TopStrip'
import Ticker        from '../components/mission-control/Ticker'
import HorizonScene  from '../components/mission-control/HorizonScene'
import SideRail      from '../components/mission-control/SideRail'
import Dock          from '../components/mission-control/Dock'
import Tile          from '../components/mission-control/Tile'
import DockTile      from '../components/mission-control/DockTile'
import Panel         from '../components/mission-control/Panel'
import GlanceWheel   from '../components/mission-control/GlanceWheel'
import WorldWheel    from '../components/mission-control/WorldWheel'
import useMissionControlData from '../components/mission-control/useMissionControlData'
import { GOLD_DK, BG_PARCHMENT } from '../components/mission-control/tokens'

// ─── Personal dimensions for the GlanceWheel ──────────────
const SELF_DIMENSIONS = [
  { key: 'path',        label: 'Path' },
  { key: 'spark',       label: 'Spark' },
  { key: 'body',        label: 'Body' },
  { key: 'finances',    label: 'Finances' },
  { key: 'connection',  label: 'Connection' },
  { key: 'inner_game',  label: 'Inner Game' },
  { key: 'signal',      label: 'Signal' },
]

// ─── Civ domains for the WorldWheel ───────────────────────
const CIV_DOMAINS = [
  { slug: 'human-being',     label: 'Human',    color: '#2A6B9E' },
  { slug: 'society',         label: 'Society',  color: '#6B2A9E' },
  { slug: 'nature',          label: 'Nature',   color: '#2A6B3A' },
  { slug: 'technology',      label: 'Tech',     color: '#8A6B2A' },
  { slug: 'finance-economy', label: 'Finance',  color: '#6B3A2A' },
  { slug: 'legacy',          label: 'Legacy',   color: '#4A6B2A' },
  { slug: 'vision',          label: 'Vision',   color: '#2A4A6B' },
]

// ─── Static demo ticker lines.
//     Replaced by live activity feed when that pipeline is wired
//     (Welcome plan §3, "Ticker" — real data when available, demo
//     strings for now). ───────────────────────────
const DEMO_TICKER_LINES = [
  'Two new Connectors placed themselves in Society at neighbourhood scale.',
  'A Practitioner committed to a 90-day sprint on Path.',
  'Three contributions logged in Nature this week.',
  'A new Need posted in Finance & Economy.',
]

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

// Count how many dimensions actually have a current score
function countPlaced(current) {
  return Object.values(current).filter(v => v != null).length
}

// Format the placement string from purpose_piece_results.session
function formatPlacement(purposeData) {
  if (!purposeData) return null
  const archetype = purposeData?.archetype?.label || purposeData?.archetype || null
  const domain    = purposeData?.domain?.label    || purposeData?.domain    || null
  const scale     = purposeData?.scale?.label     || purposeData?.scale     || null
  const parts = [archetype, domain, scale].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

// Derive today's orientation. For now, simple heuristic:
//   • If user has an active sprint, surface that.
//   • Else if user has a recent practice, surface that.
//   • Else neutral fallback.
// Replaced by the same "today's focus" logic that /dashboard uses
// when the wire-up is clean. (Welcome plan §3.)
function todaysOrientation({ sprintData, practiceData }) {
  if (sprintData && sprintData.length > 0) {
    const s = sprintData[0]
    const domains = Array.isArray(s.domains) ? s.domains.join(' · ') : 'a sprint'
    return {
      eyebrow: 'Pulling at you today',
      line: `Your active sprint on ${domains} is the work in front of you.`,
    }
  }
  if (practiceData?.focus) {
    return {
      eyebrow: 'Pulling at you today',
      line: `${practiceData.focus} — from your most recent practice.`,
    }
  }
  return {
    eyebrow: 'Pulling at you today',
    line: 'Nothing committed yet. The Map and the Purpose Piece are the doors.',
  }
}

export default function BetaMissionControl() {
  const navigate = useNavigate()
  const data = useMissionControlData()
  const [activePanel, setActivePanel] = useState(null)

  const { horizons, current } = useMemo(
    () => buildScoreMap(data.mapData),
    [data.mapData]
  )

  const placedCount = countPlaced(current)
  const userName = data.profile?.display_name || data.user?.email?.split('@')[0] || 'friend'
  const placement = formatPlacement(data.purposeData)
  const orientation = todaysOrientation(data)

  const civPlacementSlug = data.purposeData?.domain?.slug || data.purposeData?.domain || null

  const closePanel = () => setActivePanel(null)

  // Shell — top strip, ticker, centre, rails, dock all wired up.
  return (
    <div style={{ background: BG_PARCHMENT, minHeight: '100dvh', paddingBottom: 140 }}>
      <TopStrip
        brand="NextUs"
        userName={userName}
        userPlacement={placement}
        glanceLabel="You"
        glanceSummary={`${placedCount} of 7 dimensions placed`}
        glanceWheel={
          <GlanceWheel
            dimensions={SELF_DIMENSIONS}
            horizons={horizons}
            current={current}
            size={56}
          />
        }
        onGlanceClick={() => setActivePanel('worldview')}
      />

      <Ticker
        eyebrow="On the platform"
        lines={DEMO_TICKER_LINES}
      />

      <HorizonScene
        aboveEyebrow={orientation.eyebrow}
        aboveLine={orientation.line}
        leftButton={{
          label: 'Your Life',
          context: 'Build →',
          onClick: () => setActivePanel('horizon-state'),
        }}
        rightButton={{
          label: 'The World',
          context: '← Build',
          onClick: () => setActivePanel('worldview'),
        }}
        userName={userName}
        userMeta={placement || 'Place yourself with the Purpose Piece'}
      />

      {/* Left rail — personal-side tools */}
      <SideRail side="left">
        <Tile
          glyph="HS"
          label="Horizon State"
          status={data.foundationData?.streak_days ? `${data.foundationData.streak_days}d streak` : 'Empty.'}
          statusVariant={data.foundationData?.streak_days ? 'gold' : 'empty'}
          onClick={() => setActivePanel('horizon-state')}
        />
        <Tile
          glyph="TS"
          label="Target Sprint"
          status={data.sprintData?.length ? `${data.sprintData.length} active` : 'Empty.'}
          statusVariant={data.sprintData?.length ? 'gold' : 'empty'}
          onClick={() => setActivePanel('target-sprint')}
        />
        <Tile
          glyph="HP"
          label="Horizon Practice"
          status={data.practiceData?.session_date ? 'Recent' : 'Empty.'}
          statusVariant={data.practiceData?.session_date ? 'gold' : 'empty'}
          onClick={() => setActivePanel('horizon-practice')}
        />
        <Tile
          glyph="R"
          label="Resources"
          status="Library"
          onClick={() => setActivePanel('resources')}
        />
      </SideRail>

      {/* Right rail — civ-side panels */}
      <SideRail side="right">
        <Tile
          glyph="W"
          label="World View"
          status={placement ? 'Placed' : 'Unplaced'}
          statusVariant={placement ? 'gold' : 'empty'}
          dot={!!placement}
          onClick={() => setActivePanel('worldview')}
        />
        <Tile
          glyph="WS"
          label="What's So"
          status="Indicators"
          onClick={() => setActivePanel('whats-so')}
        />
        <Tile
          glyph="M"
          label="Missions"
          status="Open feed"
          onClick={() => setActivePanel('missions')}
        />
      </SideRail>

      {/* Bottom dock — Profile, Purpose Piece, The Map, Settings */}
      <Dock>
        <DockTile
          eyebrow="Profile · You"
          name={userName}
          status="View / edit"
          primary
          onClick={() => setActivePanel('profile')}
        />
        <DockTile
          eyebrow="Tool · Placement"
          name="Purpose Piece"
          status={placement ? 'Complete' : 'Not yet placed'}
          statusVariant={placement ? 'complete' : 'default'}
          onClick={() => setActivePanel('purpose-piece')}
        />
        <DockTile
          eyebrow="Tool · Audit"
          name="The Map"
          status={placedCount === 7 ? 'Complete' : `${placedCount} of 7`}
          statusVariant={placedCount === 7 ? 'complete' : 'default'}
          onClick={() => setActivePanel('map')}
        />
        <DockTile
          eyebrow="Account"
          name="Settings"
          status="Account · privacy"
          onClick={() => setActivePanel('settings')}
        />
      </Dock>

      {/* ─────────────────────────────────────────────────────
          PANELS — placeholder content for chunk 1 shell.
          Each TODO marks the wire-up point for the real tool.
          ───────────────────────────────────────────────────── */}

      {/* PANEL TODO: HorizonState — port the multi-step nervous-system
          check-in from /tools/horizon-state. First prompt fits inline;
          if it doesn't, "continue full version →" routes to the page. */}
      <Panel
        open={activePanel === 'horizon-state'}
        onClose={closePanel}
        eyebrow="Personal · Foundation"
        title="Horizon State"
        actions={[
          { label: 'Continue full version →', primary: true, onClick: () => navigate('/tools/horizon-state') },
        ]}
      >
        <PlaceholderBody
          status={data.foundationData}
          message="Wire the inline check-in here in chunk 2."
        />
      </Panel>

      {/* PANEL TODO: TargetSprint — show next-actions across active
          sprint domains, checkable inline. */}
      <Panel
        open={activePanel === 'target-sprint'}
        onClose={closePanel}
        eyebrow="Personal · Sprint"
        title="Target Sprint"
        actions={[
          { label: 'Review the full plan →', primary: true, onClick: () => navigate('/tools/target-sprint') },
        ]}
      >
        <PlaceholderBody
          status={data.sprintData}
          message={
            data.sprintData?.length
              ? `${data.sprintData.length} active sprint(s). Wire next-actions inline in chunk 2.`
              : 'No active sprint. The full tool starts one.'
          }
        />
      </Panel>

      {/* PANEL TODO: HorizonPractice — daily practice pulse. */}
      <Panel
        open={activePanel === 'horizon-practice'}
        onClose={closePanel}
        eyebrow="Personal · Practice"
        title="Horizon Practice"
        actions={[
          { label: 'Open practice →', primary: true, onClick: () => navigate('/tools/horizon-practice') },
        ]}
      >
        <PlaceholderBody
          status={data.practiceData}
          message="Wire today's practice card here in chunk 2."
        />
      </Panel>

      {/* PANEL TODO: Resources — library of materials. */}
      <Panel
        open={activePanel === 'resources'}
        onClose={closePanel}
        eyebrow="Personal · Library"
        title="Resources"
      >
        <PlaceholderBody message="Resource library wires up in chunk 2." />
      </Panel>

      {/* PANEL TODO: WorldView — the full-size civ wheel with placement,
          engaged domains, and links to surface contribution opportunities. */}
      <Panel
        open={activePanel === 'worldview'}
        onClose={closePanel}
        eyebrow="World · Civilisational"
        title="World View"
        dark
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 28px' }}>
          <WorldWheel
            dimensions={CIV_DOMAINS}
            placement={civPlacementSlug}
            size={340}
          />
        </div>
        <PlaceholderBody
          dark
          message={
            placement
              ? `You're placed: ${placement}. Engaged-domain rendering and contribution surfaces wire up in chunk 2.`
              : 'Not yet placed. The Purpose Piece places you.'
          }
        />
      </Panel>

      {/* PANEL TODO: WhatsSo — indicator pipeline. May ship with demo
          slots per Decision 4. */}
      <Panel
        open={activePanel === 'whats-so'}
        onClose={closePanel}
        eyebrow="World · State"
        title="What's So"
        dark
      >
        <PlaceholderBody dark message="Indicator pipeline wires up when the data layer is ready (Welcome plan §5 · D4)." />
      </Panel>

      {/* PANEL TODO: Missions — feed of open contribution opportunities. */}
      <Panel
        open={activePanel === 'missions'}
        onClose={closePanel}
        eyebrow="World · Action"
        title="Missions"
        dark
      >
        <PlaceholderBody dark message="Mission feed wires up when the org-posts-a-mission backend lands (Welcome plan §6, out of scope this round)." />
      </Panel>

      {/* PANEL TODO: Profile, Purpose Piece, Map, Settings — dock panels.
          Likely each routes to its existing page rather than inlining. */}
      <Panel
        open={activePanel === 'profile'}
        onClose={closePanel}
        eyebrow="You"
        title="Profile"
        actions={[
          { label: 'Edit profile →', primary: true, onClick: () => navigate('/beta/profile/edit') },
        ]}
      >
        <PlaceholderBody status={data.profile} message="Profile summary view wires up in chunk 2." />
      </Panel>

      <Panel
        open={activePanel === 'purpose-piece'}
        onClose={closePanel}
        eyebrow="Tool · Placement"
        title="Purpose Piece"
        actions={[
          { label: placement ? 'View / re-place →' : 'Begin →', primary: true, onClick: () => navigate('/tools/purpose-piece') },
        ]}
      >
        <PlaceholderBody status={data.purposeData} message="Purpose Piece summary inline in chunk 2." />
      </Panel>

      <Panel
        open={activePanel === 'map'}
        onClose={closePanel}
        eyebrow="Tool · Audit"
        title="The Map"
        actions={[
          { label: 'Continue the audit →', primary: true, onClick: () => navigate('/tools/map') },
        ]}
      >
        <PlaceholderBody status={data.mapData} message={`${placedCount} of 7 dimensions audited. Inline domain summary in chunk 2.`} />
      </Panel>

      <Panel
        open={activePanel === 'settings'}
        onClose={closePanel}
        eyebrow="Account"
        title="Settings"
      >
        <PlaceholderBody message="Account / privacy settings wire up in chunk 2." />
      </Panel>
    </div>
  )
}

// ─── Placeholder body. Used by every panel that hasn't had its
//     real tool wired in yet. Single point of edit when chunk 2
//     replaces these. ──────────────────────────────────────────
function PlaceholderBody({ message, status, dark }) {
  const hasStatus = status != null && (Array.isArray(status) ? status.length > 0 : Object.keys(status || {}).length > 0)
  return (
    <div style={{
      padding: '24px 0',
      color: dark ? 'rgba(255,255,255,0.85)' : GOLD_DK,
      textAlign: 'center',
    }}>
      <p style={{ marginBottom: hasStatus ? 12 : 0, fontSize: 17 }}>{message}</p>
      {hasStatus && (
        <p style={{ fontSize: 13, opacity: 0.6 }}>
          (Data is loaded — open this file and replace the placeholder.)
        </p>
      )}
    </div>
  )
}
