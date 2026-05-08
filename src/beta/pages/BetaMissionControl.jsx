// ─────────────────────────────────────────────────────────────
// BetaMissionControl — /beta/dashboard
//
// Drop 2 frame. The civ-side wheel now borrows the full
// DomainExplorer behaviour set (intro spin, click-to-feature
// rotation, drill-down, centre-orb back-up) in MissionWheel's
// flat aesthetic. The right-side info panel that lived on the
// original NextUs page is now slimmed down and sits BELOW the
// wheel as CivDomainPanel.
//
// ──────────────────────────────────────────────────────────────
// LAYOUT (top to bottom on every viewport):
//
//   ┌─────────────────────────────────────────────────────┐
//   │  NextUs                          [profile] [gear]   │  IdentityStrip — brand bar
//   ├─────────────────────────────────────────────────────┤
//   │  Nik     Architect · Vision · Civilisational        │  IdentityStrip — identity bar
//   ├─────────────────────────────────────────────────────┤
//   │       ‹  Your Life | The Planet  ›                  │  PoleHeader (centred)
//   ├──────┬───────────────────────────────────────┬──────┤
//   │ Map  │                                       │ Plac │
//   │ HS   │       MissionWheel over Dymaxion      │ WV   │
//   │ TS   │                                       │ PS   │
//   │ HP   │                                       │      │
//   │ Res  │                                       │      │
//   ├──────┴───────────────────────────────────────┴──────┤
//   │   On planet side: ‹ stepper › + CivDomainPanel      │
//   └─────────────────────────────────────────────────────┘
//
// Removed in this drop:
//   • The two ActionCards under <div className="mc-actions"> —
//     both pointed at tools that aren't ready, and prompts for
//     those tools land in tile/panel surfaces instead.
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import IdentityStrip      from '../components/mission-control/IdentityStrip'
import PoleHeader         from '../components/mission-control/PoleHeader'
import WorldMapSubstrate  from '../components/mission-control/WorldMapSubstrate'
import WheelStage         from '../components/mission-control/WheelStage'
import SideRail           from '../components/mission-control/SideRail'
import Tile               from '../components/mission-control/Tile'
import Panel              from '../components/mission-control/Panel'
import CivDomainPanel             from '../components/mission-control/CivDomainPanel'
import MapMissionPanel            from '../components/mission-control/MapMissionPanel'
import TargetSprintMissionPanel   from '../components/mission-control/TargetSprintMissionPanel'
import HorizonPracticeMissionPanel from '../components/mission-control/HorizonPracticeMissionPanel'
import PurposePieceMissionPanel   from '../components/mission-control/PurposePieceMissionPanel'
import HorizonStateMissionPanel   from '../components/mission-control/HorizonStateMissionPanel'
import ProfileMissionPanel        from '../components/mission-control/ProfileMissionPanel'
import SettingsMissionPanel       from '../components/mission-control/SettingsMissionPanel'

import HorizonStateGauge   from '../components/mission-control/HorizonStateGauge'
import MapPinGlyph         from '../components/mission-control/MapPinGlyph'
import PurposePieceGlyph   from '../components/mission-control/PurposePieceGlyph'
import TargetSprintGlyph   from '../components/mission-control/TargetSprintGlyph'

import useMissionControlData from '../components/mission-control/useMissionControlData'
import { BG_PARCHMENT, BG_INK } from '../components/mission-control/tokens'

import { fetchDomains, STATIC_DOMAINS, TOP_LEVEL_GOAL } from '../../components/domain-explorer/data'

// ─── Spoke order matters. These two arrays are the canonical
//     order on Mission Control. The labels are what render on the
//     wheel; the keys are what the data layer queries by.
const SELF_LABELS = ['PATH', 'SPARK', 'BODY', 'FINANCES', 'CONNECTION', 'INNER GAME', 'SIGNAL']
const SELF_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

const CIV_LABELS  = ['VISION', 'HUMAN', 'NATURE', 'FINANCE', 'TECH', 'LEGACY', 'SOCIETY']
const CIV_KEYS    = ['vision', 'human', 'nature', 'finance', 'tech', 'legacy', 'society']

// Map domain id (as it comes from data.js / Supabase) to the civ
// wheel key. Used to reorder the fetched domain tree so it lines up
// with the canonical CIV_KEYS spoke order.
const DOMAIN_ID_TO_KEY = {
  'vision':         'vision',
  'human-being':    'human',
  'nature':         'nature',
  'finance-economy':'finance',
  'technology':     'tech',
  'legacy':         'legacy',
  'society':        'society',
}

// Reorder a fetched/static top-level domain list into CIV_KEYS order.
function orderTopLevel(domains) {
  if (!Array.isArray(domains) || !domains.length) return []
  const byKey = {}
  for (const d of domains) {
    const key = DOMAIN_ID_TO_KEY[d.id] || d.id
    byKey[key] = d
  }
  // Return in canonical wheel order; fall back to original order if a key is missing
  const ordered = CIV_KEYS.map(k => byKey[k]).filter(Boolean)
  return ordered.length === CIV_KEYS.length ? ordered : domains
}

// Body for the top-level overview that the slimmed CivDomainPanel renders.
const OVERVIEW_BODY = `The Overview Effect is what astronauts report when they first see Earth from space — a sudden, irreversible recognition of the whole. The boundaries dissolve. The fragmentation that seemed inevitable from inside it becomes obviously contingent from outside it.

From that vantage point, a question becomes possible that is very hard to ask from inside the noise: what are we actually building toward?

Seven domains. Horizon goals at every level. A shared destination — so that the people already doing the work can find each other, aim at something worth building, and compound their effort rather than scatter it.`

// ─── Helpers (preserved from prior version) ──────────────────

// Helper: derive map score lookups from the horizon_profile rows.
function buildScoreMap(mapRows, mapResults) {
  const horizons = {}
  const current = {}
  // Source 1 — horizon_profile rows. Column is `domain`, not `domain_key`.
  // (An earlier version of this helper read `row.domain_key`, which silently
  // skipped every row.)
  for (const row of (mapRows || [])) {
    const k = row?.domain
    if (!k) continue
    if (row.horizon_score != null) horizons[k] = row.horizon_score
    if (row.current_score != null) current[k]  = row.current_score
  }
  // Source 2 — fall back to the latest map_results session blob. The data
  // hook returns the FULL row, and per-domain scores live at
  //   mapResults.session.domainData[domainId].currentScore / .horizonScore
  // Older sessions used `mapResults.session.currentScores[domainId]` and
  // `mapResults.session.horizonScores[domainId]` mirrors. Walk both.
  const session = mapResults?.session
  if (session && typeof session === 'object') {
    const domainData = session.domainData || {}
    const currentScores = session.currentScores || {}
    const horizonScores = session.horizonScores || {}
    for (const k of SELF_KEYS) {
      if (current[k] == null) {
        if (domainData[k]?.currentScore != null) current[k] = domainData[k].currentScore
        else if (currentScores[k] != null)        current[k] = currentScores[k]
      }
      if (horizons[k] == null) {
        if (domainData[k]?.horizonScore != null) horizons[k] = domainData[k].horizonScore
        else if (horizonScores[k] != null)        horizons[k] = horizonScores[k]
      }
    }
  }
  return { horizons, current }
}

function countPlaced(current) {
  return SELF_KEYS.reduce((n, k) => n + (current[k] != null ? 1 : 0), 0)
}

function activeSprintKey(sprintData) {
  if (!Array.isArray(sprintData) || !sprintData.length) return null
  const s = sprintData[0]
  if (!s) return null
  const domain = Array.isArray(s.domains) ? s.domains[0] : null
  if (!domain) return null
  return SELF_KEYS.includes(domain) ? domain : null
}

function formatPlacement(purposeData) {
  if (!purposeData) return null
  // Walk all source-of-truth fields. The row has gone through three
  // writer eras and any of them may carry the data:
  //   v10+   top-level archetype/domain/scale string columns
  //   v9-ish profile column with archetype/domain/scale fields
  //   pre-v9 session.tentative.{archetype.archetype, domain.domain, scale.scale}
  // Some rows also have session.archetype etc. directly. Try every path
  // in order; first hit wins.
  const arch =
    purposeData.archetype ||
    purposeData.profile?.archetype ||
    purposeData.session?.archetype ||
    purposeData.session?.tentative?.archetype?.archetype ||
    purposeData.session?.p4Profile?.archetype ||
    null
  const dom =
    purposeData.civ_domain ||
    purposeData.domain ||
    purposeData.profile?.domain ||
    purposeData.session?.domain ||
    purposeData.session?.tentative?.domain?.domain ||
    purposeData.session?.p4Profile?.domain ||
    null
  const scl =
    purposeData.scale ||
    purposeData.profile?.scale ||
    purposeData.session?.scale ||
    purposeData.session?.tentative?.scale?.scale ||
    purposeData.session?.p4Profile?.scale ||
    null
  if (!arch && !dom && !scl) return null
  const parts = []
  if (arch) parts.push(arch.toUpperCase())
  if (dom)  parts.push(dom.toUpperCase())
  if (scl)  parts.push(scl.toUpperCase())
  return parts.join(' · ')
}

// Civ placement key — the civ-wheel spoke that gets the placement
// marker. Purpose Piece may store the civ domain as a label or a
// key. Map all known shapes onto the civ wheel keys.
function civPlacementKey(purposeData) {
  if (!purposeData) return null
  const slugMap = {
    'human-being':       'human',
    'nature':            'nature',
    'society':           'society',
    'technology':        'tech',
    'finance-economy':   'finance',
    'legacy':            'legacy',
    'vision':            'vision',
  }
  const labelMap = {
    'HUMAN BEING':     'human',
    'NATURE':          'nature',
    'SOCIETY':         'society',
    'TECHNOLOGY':      'tech',
    'FINANCE & ECONOMY':'finance',
    'LEGACY':          'legacy',
    'VISION':          'vision',
  }
  // Try slug fields (v10 era and beta-era). Then walk all source-of-truth
  // fields for the domain label string and try slug + label maps.
  const slug = (purposeData.civ_domain_slug || purposeData.domain_slug || '').toLowerCase()
  if (slug && slugMap[slug]) return slugMap[slug]

  const candidates = [
    purposeData.civ_domain,
    purposeData.domain,
    purposeData.profile?.domain,
    purposeData.session?.domain,
    purposeData.session?.tentative?.domain?.domain,
    purposeData.session?.p4Profile?.domain,
  ]
  for (const raw of candidates) {
    if (!raw) continue
    const str = raw.toString().trim()
    if (!str) continue
    const norm = str.toUpperCase()
    if (labelMap[norm]) return labelMap[norm]
    const lower = str.toLowerCase()
    if (slugMap[lower]) return slugMap[lower]
    if (CIV_KEYS.includes(lower)) return lower
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

  // ── Civ wheel domain tree
  const [domainTree, setDomainTree] = useState(() => orderTopLevel(STATIC_DOMAINS))

  useEffect(() => {
    let cancelled = false
    fetchDomains().then(d => {
      if (cancelled) return
      setDomainTree(orderTopLevel(d))
    })
    return () => { cancelled = true }
  }, [])

  // ── Civ navigation state
  // levelPath: array of { index } steps from top of tree.
  //   length 0 = top level (the seven civ domains)
  //   length 1 = inside a top-level domain (its sub-domains shown)
  //   etc.
  // activeIndex: which spoke at the current level is featured
  //   (rotated to top). null = idle.
  // parentPanelOpen: at sub-levels, when true show the parent
  //   domain's frame in CivDomainPanel rather than the active sub.
  // showOverview: at the top level only, when true show the
  //   Overview Effect framing in CivDomainPanel.
  const [levelPath,       setLevelPath]       = useState([])
  const [activeIndex,     setActiveIndex]     = useState(null)
  const [parentPanelOpen, setParentPanelOpen] = useState(false)
  const [showOverview,    setShowOverview]    = useState(true)
  const [bloomCiv,        setBloomCiv]        = useState(false)
  const landedIndexRef = useRef(0)

  // Trigger civ wheel bloom the first time we flip to civ
  useEffect(() => {
    if (isCiv && !bloomCiv) {
      const t = setTimeout(() => setBloomCiv(true), 30)
      return () => clearTimeout(t)
    }
  }, [isCiv, bloomCiv])

  // Walk levelPath into the tree to get the current list + parent item.
  function getCurrentList() {
    if (levelPath.length === 0) return domainTree
    let list = domainTree
    let item = null
    for (let i = 0; i < levelPath.length; i++) {
      item = list[levelPath[i].index]
      if (!item) return []
      list = item.subDomains || []
    }
    return list
  }
  function getParentItem() {
    if (levelPath.length === 0) return null
    let list = domainTree
    let item = null
    for (let i = 0; i < levelPath.length; i++) {
      item = list[levelPath[i].index]
      if (!item) return null
      list = item.subDomains || []
    }
    return item
  }

  const currentList = getCurrentList()
  const parentItem  = getParentItem()
  const selectedItem = activeIndex !== null ? (currentList[activeIndex] || null) : null

  // What labels and keys to feed the wheel at the current level.
  // At the top level, use canonical CIV_LABELS / CIV_KEYS so
  // placement marker etc. continue to work. At sub-levels, derive
  // labels from the sub-domain names; keys = sub-domain ids so
  // they're stable but we don't carry placementKey logic deeper.
  const wheelLabels = useMemo(() => {
    if (levelPath.length === 0) return CIV_LABELS
    return currentList.map(d => (d?.name || '').toUpperCase())
  }, [levelPath, currentList])

  const wheelKeys = useMemo(() => {
    if (levelPath.length === 0) return CIV_KEYS
    return currentList.map(d => d?.id || '')
  }, [levelPath, currentList])

  const centreLabel = useMemo(() => {
    if (levelPath.length === 0) return 'OUR PLANET'
    return parentItem?.name?.toUpperCase() || 'BACK'
  }, [levelPath, parentItem])

  // ── Civ wheel callbacks
  const handleCivSelect = (i) => {
    setActiveIndex(i)
    setShowOverview(false)
    setParentPanelOpen(false)
  }
  const handleCivLand = (i) => {
    landedIndexRef.current = i
    setActiveIndex(i)
    // overview / parent panel stays open during the land — the
    // featured node highlights but the panel content doesn't
    // switch until the user explicitly clicks.
  }
  const handleCivDrillDown = (i, landAtSubIndex) => {
    const idx = (i !== undefined && i !== null) ? i : activeIndex
    if (idx === null || idx === undefined) return
    const item = currentList[idx]
    if (!item?.subDomains?.length) return
    setLevelPath(prev => [...prev, { index: idx }])
    // If a specific sub-index was provided, feature it at the new
    // level (so the wheel lands on it). Otherwise show the parent
    // panel for the user to pick.
    if (typeof landAtSubIndex === 'number' && landAtSubIndex >= 0 && landAtSubIndex < item.subDomains.length) {
      setActiveIndex(landAtSubIndex)
      setParentPanelOpen(false)
      landedIndexRef.current = landAtSubIndex
    } else {
      setActiveIndex(null)
      setParentPanelOpen(true)
      landedIndexRef.current = 0
    }
    setShowOverview(false)
  }
  const handleCivCentreClick = () => {
    if (levelPath.length === 0) {
      setShowOverview(prev => !prev)
    } else {
      setActiveIndex(null)
      setParentPanelOpen(true)
    }
  }
  const handleCivBack = () => {
    if (levelPath.length === 0) {
      setActiveIndex(null)
      setParentPanelOpen(false)
      setShowOverview(true)
      return
    }
    const prevLevelIdx = levelPath[levelPath.length - 1].index
    setLevelPath(prev => prev.slice(0, -1))
    setActiveIndex(prevLevelIdx)
    setParentPanelOpen(false)
    landedIndexRef.current = prevLevelIdx
  }
  const handleCivPrev = () => {
    const len = currentList.length
    if (!len) return
    setActiveIndex(prev => prev === null ? landedIndexRef.current : (prev - 1 + len) % len)
    setShowOverview(false)
    setParentPanelOpen(false)
  }
  const handleCivNext = () => {
    const len = currentList.length
    if (!len) return
    setActiveIndex(prev => prev === null ? landedIndexRef.current : (prev + 1) % len)
    setShowOverview(false)
    setParentPanelOpen(false)
  }
  const handleCivContribute = () => {
    const rootDomainId = levelPath.length > 0
      ? domainTree[levelPath[0].index]?.id
      : selectedItem?.id
    navigate(`/nextus/actors${rootDomainId ? `?domain=${rootDomainId}` : ''}`)
  }

  // Keyboard arrows on the civ side step domains (left/right).
  // Active only when we're on the civ wheel and not inside an
  // open Panel. Self side is unchanged — no keyboard handler.
  useEffect(() => {
    if (!isCiv) return
    function onKey(e) {
      if (activePanel) return
      // Don't hijack arrows when the user is typing in an input.
      const target = e.target
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleCivNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleCivPrev()
      } else if (e.key === 'Escape') {
        if (activeIndex !== null) {
          setActiveIndex(null)
          setParentPanelOpen(levelPath.length > 0)
          if (levelPath.length === 0) setShowOverview(true)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCiv, activePanel, currentList.length, activeIndex, levelPath.length])

  // Civ wheel data — until indicator pipeline produces a 0–10 score
  // per civ domain, civ_current is empty {} and the polygon is
  // simply not rendered at all (per Drop 2 spec).
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

  // Civ placement marker (only meaningful at the top level)
  const civPlacement = levelPath.length === 0 ? civPlacementKey(data.purposeData) : null

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

  // ─── Rail states ─────────────────────────────────────────────
  const hsState = data.foundationData?.streak_days
    ? `${data.foundationData.streak_days}D STREAK`
    : null

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

  const hpState = data.practiceData?.check_date ? 'RECENT' : null

  const mapAudited = countPlaced(selfCurrent)
  const mapState = mapAudited === 0
    ? null
    : mapAudited === 7
      ? 'COMPLETE'
      : `${mapAudited} OF 7`

  const placementState = isUnplaced ? null : placement.split(' · ')[0]
  const worldViewState = null
  const planetSprintState = null

  return (
    <div
      id="mc-stage-root"
      className="mc-stage-root"
    >
      <style>{STAGE_CSS}</style>

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
                labels:        wheelLabels,
                keys:          wheelKeys,
                domains:       currentList,
                activeIndex:   activeIndex,
                centreLabel:   centreLabel,
                bloom:         bloomCiv,
                onSelect:      handleCivSelect,
                onLand:        handleCivLand,
                onDrillDown:   handleCivDrillDown,
                onCentreClick: handleCivCentreClick,
                placementKey:  civPlacement,
                walkers:       civWalkers,
              }}
            />
          </div>

          {/* RIGHT RAIL — The Planet */}
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

        {/* SCROLL-BELOW — civ side gets the slim domain panel.
            Self side gets nothing for now; both action cards have
            been removed (the prompts live in tile/panel surfaces
            instead). */}
        {isCiv && (
          <CivDomainPanel
            levelPath={levelPath}
            currentList={currentList}
            selectedItem={selectedItem}
            parentItem={parentItem}
            parentPanelOpen={parentPanelOpen}
            showOverview={showOverview && levelPath.length === 0}
            topLevelGoal={TOP_LEVEL_GOAL}
            overviewBody={OVERVIEW_BODY}
            onSelect={handleCivSelect}
            onDrillDown={handleCivDrillDown}
            onBack={handleCivBack}
            onPrev={handleCivPrev}
            onNext={handleCivNext}
            onContribute={handleCivContribute}
            busy={false}
          />
        )}
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
        <HorizonStateMissionPanel
          user={data.user}
          onNavigate={navigate}
        />
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
        <TargetSprintMissionPanel
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
          { label: 'OPEN PRACTICE →', primary: true,
            onClick: () => navigate('/tools/horizon-practice') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <HorizonPracticeMissionPanel
          user={data.user}
          onNavigate={navigate}
        />
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
          { label: 'EDIT FULL PROFILE →', primary: true,
            onClick: () => navigate('/beta/profile/edit') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <ProfileMissionPanel
          user={data.user}
          onNavigate={navigate}
        />
      </Panel>

      <Panel
        open={activePanel === 'purpose-piece'}
        onClose={closePanel}
        eyebrow="YOUR FIT · PURPOSE PIECE"
        title={!isUnplaced ? placement.split(' · ').map(s => s.toLowerCase()).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' · ') : 'Find where you fit.'}
        actions={[
          { label: !isUnplaced ? 'REVISIT YOUR FIT →' : 'BEGIN PURPOSE PIECE →', primary: true,
            onClick: () => navigate('/tools/purpose-piece') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <PurposePieceMissionPanel
          purposeData={data.purposeData}
          onNavigate={navigate}
        />
      </Panel>

      <Panel
        open={activePanel === 'map'}
        onClose={closePanel}
        eyebrow="FOUNDATION · THE MAP"
        title="Your seven domains"
        actions={[
          { label: placedCount === 7 ? 'REVISIT A DOMAIN' : 'OPEN THE MAP →', primary: true,
            onClick: () => navigate('/tools/map') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <MapMissionPanel
          user={data.user}
          onNavigate={navigate}
        />
      </Panel>

      <Panel
        open={activePanel === 'settings'}
        onClose={closePanel}
        eyebrow="SYSTEM · SETTINGS"
        title="Account &amp; preferences"
        actions={[
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <SettingsMissionPanel
          user={data.user}
          onNavigate={navigate}
        />
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

.mc-body {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
}

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
}

@media (max-width: 380px) {
  .mc-grid {
    grid-template-columns: 56px 1fr 56px;
    gap: 6px;
    padding: 12px 8px 8px;
  }
}
`