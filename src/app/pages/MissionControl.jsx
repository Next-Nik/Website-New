// ─────────────────────────────────────────────────────────────
// MissionControl — /beta/dashboard
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
//   │       ‹  My Life | Our Planet  ›                    │  PoleHeader (centred)
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { supabase } from '../../hooks/useSupabase'

import IdentityStrip      from '../components/mission-control/IdentityStrip'
import PoleHeader         from '../components/mission-control/PoleHeader'
import WorldMapSubstrate  from '../components/mission-control/WorldMapSubstrate'
import WheelStage         from '../components/mission-control/WheelStage'
import SideRail           from '../components/mission-control/SideRail'
import Tile               from '../components/mission-control/Tile'
import Panel              from '../components/mission-control/Panel'
import CivDomainPanel             from '../components/mission-control/CivDomainPanel'
import SelfDomainPanel            from '../components/mission-control/SelfDomainPanel'
import MyPracticeMissionPanel     from '../components/mission-control/MyPracticeMissionPanel'
import MyOrgMissionPanel          from '../components/mission-control/MyOrgMissionPanel'
import MapMissionPanel            from '../components/mission-control/MapMissionPanel'
import TargetSprintMissionPanel   from '../components/mission-control/TargetSprintMissionPanel'
import PurposePieceMissionPanel   from '../components/mission-control/PurposePieceMissionPanel'
import HorizonStateMissionPanel   from '../components/mission-control/HorizonStateMissionPanel'
import HorizonPracticeMissionPanel from '../components/mission-control/HorizonPracticeMissionPanel'
import DailyChooserPanel          from '../components/mission-control/DailyChooserPanel'
import ProfileMissionPanel        from '../components/mission-control/ProfileMissionPanel'
import SettingsMissionPanel       from '../components/mission-control/SettingsMissionPanel'
import WorldViewMissionPanel      from '../components/mission-control/WorldViewMissionPanel'
import GetToDoMissionPanel        from '../components/mission-control/GetToDoMissionPanel'
import CurriculumGatePanel        from '../components/mission-control/CurriculumGatePanel'
import AddOverlay                 from '../components/AddOverlay'
import FocusPanelContent          from '../components/FocusPanelContent'
import { useActiveFocus }         from '../hooks/useActiveFocus'
import { useCivDomainScores }     from '../hooks/useDomainIndicators'
import { resolvePurposePiece }    from '../util/purposePiece'

import HorizonStateGauge   from '../components/mission-control/HorizonStateGauge'
import MapPinGlyph         from '../components/mission-control/MapPinGlyph'
import SearchGlyph         from '../components/mission-control/SearchGlyph'
import MessagesIcon        from '../components/mission-control/MessagesIcon'
import MessagesMissionPanel from '../components/mission-control/MessagesMissionPanel'
import InterestsIcon       from '../components/mission-control/InterestsIcon'
import MyInterestsPanel    from '../components/mission-control/MyInterestsPanel'

import useMissionControlData from '../components/mission-control/useMissionControlData'
import { BG_PARCHMENT, BG_INK } from '../components/mission-control/tokens'

import { fetchDomains, STATIC_DOMAINS, TOP_LEVEL_GOAL } from '../../components/domain-explorer/data'
import { CURRENT_STATE } from '../../components/domain-explorer/currentState'
import { SELF_DOMAINS, SELF_TOP_GOAL } from '../../components/self-explorer/selfData'

// ─── Spoke order matters. These two arrays are the canonical
//     order on Mission Control. The labels are what render on the
//     wheel; the keys are what the data layer queries by.
const SELF_LABELS = ['PATH', 'SPARK', 'BODY', 'FINANCES', 'CONNECTION', 'INNER GAME', 'SIGNAL']
const SELF_KEYS   = ['path', 'spark', 'body', 'finances', 'connection', 'inner_game', 'signal']

const CIV_LABELS  = ['VISION', 'HUMAN', 'NATURE', 'ECONOMY', 'TECH', 'LEGACY', 'SOCIETY']
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

// ─── Overview Body Sections ─────────────────────────────────
// The overview is the planet-level mirror of a domain panel.
// Three sections, parallel structure to per-domain panels:
//
//   1. NextUs Horizon — the unified vision across all seven domains.
//   2. Where we are now — the honest planetary state.
//   3. What you can do here — how a visitor moves from reading to acting.
//
// OVERVIEW_STATE uses the token {SCALE_LINK} where the inline scale
// link should appear. CivDomainPanel renders this as a button that
// opens the planet-scale modal.

const OVERVIEW_HORIZON = `That's the vision, that's the aim, that is what NextUs is for. A thriving humanity on a thriving planet, every life carrying a real chance to develop fully, every domain of civilisation serving what life needs.

The seven domains are not seven separate causes. They are one picture, viewed from seven angles. Vision is what we are choosing. Human Being is who we are becoming. Nature is what holds us. Society is how we relate. Economy is how value moves. Technology is what we are building. Legacy is what survives us. When any one of them fails, the others bend under the weight.`

const OVERVIEW_STATE = `No domain currently reads above 6.2 out of 10 on our {SCALE_LINK}. Most sit in Friction. Society, Vision, Legacy, and Nature are below 4. The numbers come from indicators most people have never seen in one place — atmospheric CO₂, the Doomsday Clock, climate finance flows, biodiversity, democracy quality, refugee counts, AI incidents. They are not predictions. They are the read of where humanity stands today, on the scale of the goals we say we want.

It is not a comfortable picture. It is also not a final one. The map exists so the gap between where we are and where we are trying to go becomes something we can navigate, together, instead of carrying alone.`

const OVERVIEW_NEXT = `Pick a domain. Read its Horizon — what a thriving version actually looks like. See where we are now in that domain, and which indicators are doing the worst of the lifting. Find the actors already in motion. Place yourself: an organisation, a practice, a contribution, a question. The map is meant to be lived in, not just read.`

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

// Build the per-domain detail lookup the SelfDomainPanel reads.
// Keyed by SELF_KEYS (which match SELF_DOMAINS[i].id). Falls back
// through the same source layering as buildScoreMap, but additionally
// captures the user's own horizon_goal language and their I am / I do
// statement when present on horizon_profile.
function buildSelfDomainDetail(mapRows, mapResults) {
  const out = {}
  for (const k of SELF_KEYS) out[k] = { current: null, horizon: null, horizonGoal: null, iaStatement: null }

  // Source 1 — horizon_profile rows
  for (const row of (mapRows || [])) {
    const k = row?.domain
    if (!k || !out[k]) continue
    if (row.current_score != null) out[k].current     = row.current_score
    if (row.horizon_score != null) out[k].horizon     = row.horizon_score
    if (row.horizon_goal)          out[k].horizonGoal = row.horizon_goal
    if (row.ia_statement)          out[k].iaStatement = row.ia_statement
  }

  // Source 2 — map_results session blob fallback
  const session = mapResults?.session
  if (session && typeof session === 'object') {
    const domainData    = session.domainData    || {}
    const currentScores = session.currentScores || {}
    const horizonScores = session.horizonScores || {}
    const horizonGoals  = session.horizonGoals  || {}
    const iaStatements  = session.iaStatements  || session.ia_statements || {}
    for (const k of SELF_KEYS) {
      if (out[k].current == null) {
        if (domainData[k]?.currentScore != null)   out[k].current = domainData[k].currentScore
        else if (currentScores[k] != null)         out[k].current = currentScores[k]
      }
      if (out[k].horizon == null) {
        if (domainData[k]?.horizonScore != null)   out[k].horizon = domainData[k].horizonScore
        else if (horizonScores[k] != null)         out[k].horizon = horizonScores[k]
      }
      if (!out[k].horizonGoal) {
        if (domainData[k]?.horizonGoal)            out[k].horizonGoal = domainData[k].horizonGoal
        else if (horizonGoals[k])                  out[k].horizonGoal = horizonGoals[k]
      }
      if (!out[k].iaStatement) {
        if (domainData[k]?.iaStatement)            out[k].iaStatement = domainData[k].iaStatement
        else if (iaStatements[k])                  out[k].iaStatement = iaStatements[k]
      }
    }
  }

  return out
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
  // Delegates to the shared writer-era-aware resolver in
  // src/app/util/purposePiece.js. See that file for the full path map.
  const { archetype, domain, scale } = resolvePurposePiece(purposeData)
  if (!archetype && !domain && !scale) return null
  const parts = []
  if (archetype) parts.push(archetype.toUpperCase())
  if (domain)    parts.push(domain.toUpperCase())
  if (scale)     parts.push(scale.toUpperCase())
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
    'HUMAN':           'human',
    'NATURE':          'nature',
    'SOCIETY':         'society',
    'TECHNOLOGY':      'tech',
    'TECH':            'tech',
    'ECONOMY':         'finance',
    'FINANCE & ECONOMY':'finance',
    'FINANCE':         'finance',
    'LEGACY':          'legacy',
    'VISION':          'vision',
  }
  // First, try explicit slug fields (v10 era and beta-era).
  const slug = (purposeData.civ_domain_slug || purposeData.domain_slug || '').toLowerCase()
  if (slug && slugMap[slug]) return slugMap[slug]

  // Then ask the shared resolver for the domain — it walks every writer
  // era's path and returns the first hit. Whatever it returns, try the
  // label map, then the slug map, then a direct match against the wheel
  // keys.
  const { domain } = resolvePurposePiece(purposeData)
  if (!domain) return null
  const str = domain.toString().trim()
  if (!str) return null
  const norm = str.toUpperCase()
  if (labelMap[norm]) return labelMap[norm]
  const lower = str.toLowerCase()
  if (slugMap[lower]) return slugMap[lower]
  if (CIV_KEYS.includes(lower)) return lower
  return null
}


function ScopePlaceholder({ scope }) {
  const label = scope === 'practice' ? 'My Practice' : 'My Org'
  const body = scope === 'practice'
    ? 'Your practitioner working room is being built. The brief specifies the placement fields, the offering shape, and the inbound contribution interest the room will surface. Setup, including a URL-paste shortcut that pre-fills your placement from a page you already have on the web, lands in the next drop.'
    : 'Your organisation working room is being built. The brief specifies the six tabs from Module 6 wrapped into the Mission Control surface, plus setup with the same URL-paste shortcut. It lands in the next drop.'

  return (
    <div className="mc-scope-placeholder">
      <div className="mc-scope-placeholder-inner">
        <p className="mc-scope-placeholder-eyebrow">{label.toUpperCase()}</p>
        <h2 className="mc-scope-placeholder-title">Coming soon</h2>
        <div className="mc-scope-placeholder-rule" />
        <p className="mc-scope-placeholder-body">{body}</p>
      </div>
    </div>
  )
}

// ── Inline Next Steps launcher for the Resources panel ─────────────────────
function ResourcesNextStepsInput({ onSubmit }) {
  const [val, setVal] = React.useState('')
  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (val.trim()) onSubmit(val.trim()) }
  }
  return (
    <div>
      <div style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A', marginBottom: '10px' }}>NEXT STEPS</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder="What's on your mind right now…"
          style={{
            flex: 1, resize: 'none', border: '1px solid rgba(168,114,26,0.28)', borderRadius: '3px',
            padding: '10px 12px', fontFamily: "'Lora', Georgia, serif", fontSize: '14px',
            lineHeight: 1.55, color: '#0F1523', background: '#FAFAF7', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => { if (val.trim()) onSubmit(val.trim()) }}
          disabled={!val.trim()}
          style={{
            background: val.trim() ? '#C8922A' : 'rgba(15,21,35,0.55)', color: val.trim() ? '#FFFFFF' : 'rgba(15,21,35,0.55)',
            border: 'none', borderRadius: '3px', padding: '10px 16px', cursor: val.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
            transition: 'background 0.15s', flexShrink: 0,
          }}
        >→</button>
      </div>
      <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '6px', fontStyle: 'italic' }}>
        Press enter or → to begin
      </div>
    </div>
  )
}

export default function MissionControl() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = useMissionControlData()
  const [activePanel, setActivePanel] = useState(null)
  // Which view the Daily panel is showing: 'chooser' | 'state' | 'practice'.
  // The Daily tile always opens on the chooser — the user picks the tool.
  const [dailyView, setDailyView] = useState('chooser')
  const { focus: activeFocus, hasFocus: hasActiveFocus } = useActiveFocus()

  // Map the user's saved focus_domain_slugs (e.g. 'human-being',
  // 'finance-economy') to the civ wheel's internal keys (e.g. 'human',
  // 'finance'). The wheel uses these to brighten the matching spokes
  // when focus is set. Memoised because it feeds an SVG render prop.
  const civFocusKeys = useMemo(() => {
    const slugs = activeFocus?.focus_domain_slugs
    if (!Array.isArray(slugs) || slugs.length === 0) return null
    const slugToWheelKey = {
      'human-being':     'human',
      'society':         'society',
      'nature':          'nature',
      'technology':      'tech',
      'finance-economy': 'finance',
      'legacy':          'legacy',
      'vision':          'vision',
    }
    const keys = slugs.map(s => slugToWheelKey[s]).filter(Boolean)
    return keys.length > 0 ? keys : null
  }, [activeFocus?.focus_domain_slugs])

  // Universal Add overlay — mounted from the right-rail ADD tile. The
  // overlay component is reusable; Module 16 will mount it from other
  // surfaces (Domain, Feed, Profile, Org, Practice, Map, Invitation).
  // (Add overlay replaced by direct navigation to /add)

  // Scope state — the canonical id of the active Mission Control
  // scope. One of: 'self' | 'planet' | 'practice' | 'org'. The
  // legacy two-state `currentWheel` is derived from this so any
  // surrounding logic that still uses it keeps working in Step B;
  // Step C will eliminate it entirely.
  const [activeScope, setActiveScope] = useState('self')
  const currentWheel = activeScope === 'planet' ? 'civ' : 'personal'

  const isCiv = currentWheel === 'civ'

  // Scope-arming — handoff from the practitioner / org welcome flows.
  // Per the Scopes & Onboarding brief, Section 6.1, the welcome flows
  // land the user on /beta/dashboard?scope=practice (merge) or
  // ?scope=org (overwrite to org-only per Section 3.2). This effect
  // resolves that handoff once, on first authenticated load:
  //
  //   1. Wait for the user row to be available (we need the existing
  //      scope array to merge against).
  //   2. Decide the new array: merge 'practice' into the existing
  //      scopes for the practitioner path; overwrite to ['org'] for
  //      the org path.
  //   3. If the new array differs from what's already saved, write
  //      it to users.mission_control_scopes.
  //   4. Activate the requested scope so the user lands in the right
  //      working room.
  //   5. Strip the query param so reloads don't re-fire the handoff.
  //
  // `armingScope` carries the requested scope through the moment
  // between "we just wrote to the DB" and "userRow refresh has the
  // new array" — without it, the fallback effect below would yank
  // activeScope back to 'self' because availableScopes hasn't caught
  // up yet.
  const [armingScope, setArmingScope] = useState(null)
  const armingHandledRef = useRef(false)

  useEffect(() => {
    if (armingHandledRef.current) return
    if (!data.user || data.loading) return

    const params = new URLSearchParams(location.search)
    const requested = params.get('scope')
    if (requested !== 'practice' && requested !== 'org') return

    armingHandledRef.current = true

    const existing = Array.isArray(data.userRow?.mission_control_scopes)
      ? data.userRow.mission_control_scopes
      : ['self', 'planet']

    // Merge for practice (preserve whatever's already on the row).
    //
    // Org arming is subtler. The brief says new org signups land with
    // org-only by default (Section 3.2 — personal scales off). But it
    // also says everything is changeable from Scope Settings. We split
    // the difference by behaviour: an established user (any scope
    // beyond the legacy ['self','planet'] default) gets a merge,
    // preserving what they've already opted into. A fresh user — still
    // on the default pair — gets the overwrite the brief specifies.
    // This way an established practitioner who taps an org welcome
    // link out of curiosity doesn't lose their existing setup.
    const isLegacyDefault =
      existing.length === 2 &&
      existing.includes('self') &&
      existing.includes('planet')

    let next
    if (requested === 'practice') {
      next = existing.includes('practice') ? existing : [...existing, 'practice']
    } else if (isLegacyDefault) {
      next = ['org']
    } else {
      next = existing.includes('org') ? existing : [...existing, 'org']
    }

    setArmingScope(requested)
    setActiveScope(requested)

    // Strip the ?scope= param so a reload doesn't re-arm. Replace,
    // not push — the dashboard should not appear twice in history.
    const cleaned = new URLSearchParams(location.search)
    cleaned.delete('scope')
    const cleanedSearch = cleaned.toString()
    navigate(
      `${location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ''}${location.hash || ''}`,
      { replace: true },
    )

    // Persist if the array actually changed. Same-array writes are
    // skipped to avoid a needless round-trip.
    const sameArray =
      existing.length === next.length &&
      existing.every((id, i) => id === next[i])
    if (sameArray) return

    supabase
      .from('users')
      .update({ mission_control_scopes: next })
      .eq('id', data.user.id)
      .then(({ error }) => {
        if (error) {
          // Soft fail. The user is already in the right scope for
          // this session; on next reload the saved array will reflect
          // whatever was on the row, and Scope Settings remains the
          // canonical way to fix it.
          // eslint-disable-next-line no-console
          console.warn('[mission-control] scope arming write failed:', error)
        }
      })
  }, [data.user, data.userRow, data.loading, location, navigate])

  // The user's active Mission Control scopes from the users table.
  // Default to ['self','planet'] until the row loads — this prevents
  // a flicker between "no scopes" and "two scopes" for legitimate
  // users on the legacy default.
  //
  // While arming is in flight (the userRow may not yet reflect the
  // write), we layer the armingScope on top so the fallback effect
  // below doesn't yank activeScope back to a stale value.
  const availableScopes = useMemo(() => {
    const fromRow = data.userRow?.mission_control_scopes
    const base = (Array.isArray(fromRow) && fromRow.length > 0)
      ? fromRow
      : ['self', 'planet']
    if (!armingScope) return base
    if (base.includes(armingScope)) return base
    // Org arming on the legacy default ['self','planet'] overwrites to
    // org-only (per the brief). Any other base — including a base that
    // already contains org — gets a merge instead, preserving what the
    // user has already opted into.
    if (armingScope === 'org') {
      const isLegacyDefault =
        base.length === 2 && base.includes('self') && base.includes('planet')
      if (isLegacyDefault) return ['org']
    }
    return [...base, armingScope]
  }, [data.userRow, armingScope])

  // Once the userRow catches up with the arming write, the armingScope
  // override is no longer needed. Clearing it lets the live array take
  // over as the source of truth.
  useEffect(() => {
    if (!armingScope) return
    const fromRow = data.userRow?.mission_control_scopes
    if (!Array.isArray(fromRow)) return
    if (armingScope === 'org' ? fromRow.includes('org') : fromRow.includes(armingScope)) {
      setArmingScope(null)
    }
  }, [armingScope, data.userRow])

  // If the user's saved scope set somehow excludes the currently
  // active scope (e.g. they just deactivated My Practice while it
  // was selected), fall back to the first available scope.
  useEffect(() => {
    if (!availableScopes.includes(activeScope)) {
      setActiveScope(availableScopes[0])
    }
  }, [availableScopes, activeScope])

  function handleScopeSelect(scopeId) {
    setActiveScope(scopeId)
    // Switching TO self: return the personal wheel to its neutral overview.
    if (scopeId === 'self') {
      setSelfActiveIndex(null)
      setSelfShowOverview(true)
    }
    // Switching TO planet: return the civ wheel to its top-level overview.
    if (scopeId === 'planet') {
      setLevelPath([])
      setActiveIndex(null)
      setParentPanelOpen(false)
      setShowOverview(true)
      landedIndexRef.current = 0
    }
  }

  // Personal wheel data
  const { horizons: selfHorizons, current: selfCurrent } = useMemo(
    () => buildScoreMap(data.mapData, data.mapResults),
    [data.mapData, data.mapResults]
  )
  const selfDomainDetail = useMemo(
    () => buildSelfDomainDetail(data.mapData, data.mapResults),
    [data.mapData, data.mapResults]
  )
  // Life-level horizon goal and I am statement. The user's own words always
  // win — canonical SELF_TOP_GOAL is a fallback the panel applies only when
  // nothing user-specific is present. IA has no canonical fallback by design.
  const lifeHorizon = useMemo(() => {
    return (
      data.mapResults?.horizon_goal_user ||
      data.mapResults?.horizon_goal_system ||
      data.mapData?.life_horizon_draft ||
      null
    )
  }, [data.mapResults, data.mapData])
  const lifeIa = data.mapResults?.life_ia_statement || null
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
  // panelAnchor — set by clicks on Position nodes ("where we are now"
  // vertex dots) so the panel knows to focus on the indicator
  // breakdown rather than the goal unpacking. Reset after consumed.
  const [panelAnchor,     setPanelAnchor]     = useState(null)
  const landedIndexRef = useRef(0)

  // ── Self navigation state
  // selfActiveIndex: which domain is featured below the personal wheel.
  //   null = idle (overview shown). 0..6 = a domain selected.
  // selfShowOverview: top-level idle copy ("A Life Fully Expressed")
  //   shown when no domain has been picked yet.
  const [selfActiveIndex,  setSelfActiveIndex]  = useState(null)
  const [selfShowOverview, setSelfShowOverview] = useState(true)

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

  // ── Civ breadcrumb (May 2026)
  // Walks the levelPath against domainTree to produce a list of
  // tappable segments above the wheel. The current level is the last
  // segment, rendered in gold; prior segments are tappable to jump
  // back up. At top level we still show the root crumb so the
  // breadcrumb area doesn't appear and disappear.
  const civCrumbs = useMemo(() => {
    const crumbs = [{ label: 'Our Planet', depth: 0 }]
    let list = domainTree
    for (let i = 0; i < levelPath.length; i++) {
      const item = list[levelPath[i].index]
      if (!item) break
      crumbs.push({ label: item.name, depth: i + 1 })
      list = item.subDomains || []
    }
    return crumbs
  }, [levelPath, domainTree])

  // Jump to a specific depth in the breadcrumb. Depth 0 = top-level
  // (the seven civ domains), depth 1 = inside the first chosen
  // domain, etc. Mirrors handleCivBack but pops to an arbitrary
  // target rather than always one level.
  const handleCivCrumb = (targetDepth) => {
    if (targetDepth >= levelPath.length) return // already there or deeper
    if (targetDepth === 0) {
      setLevelPath([])
      setActiveIndex(null)
      setParentPanelOpen(false)
      setShowOverview(true)
      landedIndexRef.current = 0
      return
    }
    const prevIdx = levelPath[targetDepth].index
    setLevelPath(prev => prev.slice(0, targetDepth))
    setActiveIndex(prevIdx)
    setParentPanelOpen(false)
    setShowOverview(false)
    landedIndexRef.current = prevIdx
  }

  // ── Civ wheel callbacks
  // anchor: 'position' when fired from a Position vertex click; null otherwise.
  // Used by the panel to focus on the indicator breakdown rather than the
  // goal unpacking when the user clicks "where we are now."
  const handleCivSelect = (i, anchor = null) => {
    setActiveIndex(i)
    setShowOverview(false)
    setParentPanelOpen(false)
    setPanelAnchor(anchor)
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

  // ── Self callbacks. SELF_KEYS at index i pairs with SELF_DOMAINS at
  // the same index — both arrays are in canonical wheel-spoke order.
  const handleSelfSelect = (i) => {
    if (i == null || i < 0 || i >= SELF_DOMAINS.length) return
    setSelfActiveIndex(i)
    setSelfShowOverview(false)
  }
  const handleSelfPrev = () => {
    const len = SELF_DOMAINS.length
    if (!len) return
    setSelfActiveIndex(prev => prev === null ? 0 : (prev - 1 + len) % len)
    setSelfShowOverview(false)
  }
  const handleSelfNext = () => {
    const len = SELF_DOMAINS.length
    if (!len) return
    setSelfActiveIndex(prev => prev === null ? 0 : (prev + 1) % len)
    setSelfShowOverview(false)
  }
  // Tapping the centre of the personal wheel returns the user to their
  // life-level overview — the home base — regardless of which domain
  // they were in. Hard switch, matches the existing wheel feel.
  const handleSelfCentreClick = () => {
    setSelfActiveIndex(null)
    setSelfShowOverview(true)
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

  // Civ wheel data — fed by the indicator rollup. useCivDomainScores
  // loads headline indicators across all 7 domains and produces a
  // 0..10 score per domain. Domains with insufficient coverage return
  // null and the wheel renders no vertex for them.
  const { scores: civScores, details: civDetails } = useCivDomainScores()
  const civCurrent = useMemo(() => {
    const out = {}
    if (civScores) {
      for (const k of CIV_KEYS) {
        if (civScores[k] != null) out[k] = civScores[k]
      }
    }
    return out
  }, [civScores])
  const civHorizons = useMemo(
    () => Object.fromEntries(CIV_KEYS.map(k => [k, 10])),
    []
  )

  // Walker layer — empty by default. RENDERS NOTHING when 0.
  const personalWalkers = {}
  const civWalkers = {}

  // Identity strings.
  const rawName  = data.profile?.display_name || data.user?.email?.split('@')[0] || (data.user ? 'Your name' : 'Welcome')
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
    setActiveScope('self')
    setActivePanel(key)
  }
  const openCivPanel = (key) => {
    setActiveScope('planet')
    setActivePanel(key)
  }

  // Open the Daily panel at a given view. The tile opens the chooser;
  // deep links (e.g. SelfDomainPanel's Horizon State affordance) can
  // land directly on a tool view.
  const openDaily = (view = 'chooser') => {
    setDailyView(view)
    openPersonalPanel('daily')
  }

  // ─── Rail states ─────────────────────────────────────────────
  const hsState = data.foundationData?.streak_days
    ? `${data.foundationData.streak_days}D STREAK`
    : null

  const hpState = data.practiceData?.check_date ? 'RECENT' : null

  const mapAudited = countPlaced(selfCurrent)

  // ── NextU journey progress ────────────────────────────────
  // Step 1: Map scored (7 domains)
  // Step 2: I Am Statements (7 ia_statements on horizon_profile)
  // Step 3: Horizon Self (user_metadata.horizon_self populated)
  const iaCount = (data.mapData || []).filter(r => r.ia_statement).length
  const hasHorizonSelf = !!(data.mapResults?.life_ia_statement)
  const mapComplete = iaCount >= 7 && hasHorizonSelf
  const hasHorizonSelfMeta = !!(data.user?.user_metadata?.horizon_self)
  const nextUState = mapAudited === 0
    ? null
    : mapAudited < 7
      ? `MAP ${mapAudited} OF 7`
      : iaCount < 7
        ? `I AM ${iaCount} OF 7`
        : !hasHorizonSelfMeta
          ? 'HORIZON SELF'
          : 'COMPLETE'

  // Horizon State phase from users row (baseline | calibration | embodiment)
  const horizonStatePhase = data.userRow?.horizon_state_phase || 'baseline'
  const hsPhase2Locked = !mapComplete && horizonStatePhase !== 'baseline'
  // Phase 2+ is gated — only baseline (Phase 1) is always open.
  // The tile opens regardless; the panel shows the gate if needed.
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
        onFindFit={() => {
          if (!data.user) { navigate('/login'); return }
          openCivPanel('purpose-piece')
        }}
      />

      <PoleHeader
        active={activeScope}
        scopes={availableScopes}
        onSelect={handleScopeSelect}
      />

      <main className="mc-body">

        {(activeScope === 'self' || activeScope === 'planet') && (
        <>
        <div className="mc-grid">

          {/* LEFT RAIL — My Life */}
          <SideRail side="left">
            <Tile
              glyph={<MapPinGlyph />}
              label="NextU"
              state={nextUState}
              onClick={() => navigate('/nextu')}
              title="NextU — your personal journey"
            />
            <Tile
              glyph={<HorizonStateGauge />}
              label="Daily"
              state={hsState}
              onClick={() => openDaily('chooser')}
              title="Daily — choose your tool: Horizon State or Horizon Practice"
            />
            <Tile
              glyph="✦"
              label={<>GET TO<br/>DO</>}
              state={hpState}
              onClick={() => mapComplete
                ? openPersonalPanel('get-to-do')
                : openPersonalPanel('horizon-practice-gate')
              }
              title="Get To Do — your stretch items and calendar"
            />
            <Tile
              glyph="≡"
              label="Journal"
              state={null}
              onClick={() => navigate('/journal')}
              title="Journal — your record of becoming"
            />
            <Tile
              glyph={<MessagesIcon />}
              label="Mail"
              state={null}
              onClick={() => setActivePanel('messages')}
              title="Mail — your inboxes"
            />
          </SideRail>

          {/* CENTRE — wheel */}
          <div className="mc-centre-col">
            {/* Civ breadcrumb — appears only on planet side. Sits above
                the wheel; current segment in gold, prior segments are
                tappable to jump back up the tree. Lifted from the
                old DomainPanel breadcrumb (Cormorant SC, 17px,
                uppercase, gold separators). */}
            {isCiv && (
              <nav className="mc-civ-crumbs" aria-label="Civilisational breadcrumb">
                {civCrumbs.map((c, i) => {
                  const isCurrent = i === civCrumbs.length - 1
                  return (
                    <span key={`crumb-${i}`}>
                      {i > 0 && <span className="mc-crumb-sep">›</span>}
                      {isCurrent ? (
                        <span className="mc-crumb-current">{c.label}</span>
                      ) : (
                        <button
                          type="button"
                          className="mc-crumb-seg"
                          onClick={() => handleCivCrumb(c.depth)}
                        >
                          {c.label}
                        </button>
                      )}
                    </span>
                  )
                })}
              </nav>
            )}
            <WheelStage
              currentWheel={currentWheel}
              personalProps={{
                labels:    SELF_LABELS,
                keys:      SELF_KEYS,
                horizons:  selfHorizons,
                current:   selfCurrent,
                activeKey: selfActiveIndex !== null ? SELF_KEYS[selfActiveIndex] : null,
                walkers:   personalWalkers,
                isEmpty:   placedCount === 0,
                onSelect:  handleSelfSelect,
                onCentreClick: handleSelfCentreClick,
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
                focusKeys:     civFocusKeys,
                walkers:       civWalkers,
                // Polygon — only meaningful at the top level; at sub-
                // levels wheelKeys are sub-domain ids with no scores.
                current:       levelPath.length === 0 ? civCurrent : {},
                horizons:      levelPath.length === 0 ? civHorizons : {},
              }}
            />
          </div>

          {/* RIGHT RAIL — Our Planet */}
          <SideRail side="right">
            <Tile
              glyph="◎"
              label={<>MY<br/>FOCUS</>}
              state={null}
              active={!!hasActiveFocus}
              onClick={() => setActivePanel('focus')}
              title="My Focus — places, domains, organisations you're centring on"
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
            <Tile
              glyph={<SearchGlyph />}
              label="SEARCH"
              state={null}
              onClick={() => navigate('/search')}
              title="Search the Atlas"
            />
            <Tile
              glyph="＋"
              label="ADD"
              state={null}
              onClick={() => navigate('/add')}
              title="Add to the ecosystem"
            />
          </SideRail>

        </div>

        {/* SCROLL-BELOW — civ side gets the slim civ-domain panel.
            Self side now gets its parchment-mode counterpart, fed
            with the user's actual Map data per domain. */}
        {!isCiv && (
          <SelfDomainPanel
            currentList={SELF_DOMAINS}
            selectedItem={selfActiveIndex !== null ? SELF_DOMAINS[selfActiveIndex] : null}
            showOverview={selfShowOverview && selfActiveIndex === null}
            topLevelGoal={SELF_TOP_GOAL}
            lifeHorizon={lifeHorizon}
            lifeIa={lifeIa}
            userScores={selfDomainDetail}
            activeSprintDomainKey={sprintKey}
            onSelect={handleSelfSelect}
            onPrev={handleSelfPrev}
            onNext={handleSelfNext}
            onOpenMap={() => openPersonalPanel('map')}
            onOpenSprint={() => openPersonalPanel('target-sprint')}
            onOpenPractice={() => openDaily('practice')}
            onOpenHorizonState={() => openDaily('state')}
          />
        )}
        {isCiv && (
          <CivDomainPanel
            levelPath={levelPath}
            currentList={currentList}
            selectedItem={selectedItem}
            parentItem={parentItem}
            parentPanelOpen={parentPanelOpen}
            showOverview={showOverview && levelPath.length === 0}
            topLevelGoal={TOP_LEVEL_GOAL}
            overviewHorizon={OVERVIEW_HORIZON}
            overviewState={OVERVIEW_STATE}
            overviewNext={OVERVIEW_NEXT}
            civScores={civScores}
            civDetails={civDetails}
            currentStateData={CURRENT_STATE}
            panelAnchor={panelAnchor}
            onAnchorConsumed={() => setPanelAnchor(null)}
            onSelect={handleCivSelect}
            onDrillDown={handleCivDrillDown}
            onBack={handleCivBack}
            onPrev={handleCivPrev}
            onNext={handleCivNext}
            onContribute={handleCivContribute}
            busy={false}
          />
        )}
        </>
        )}

        {activeScope === 'practice' && (
          <MyPracticeMissionPanel userId={data.user?.id} />
        )}

        {activeScope === 'org' && (
          <MyOrgMissionPanel userId={data.user?.id} />
        )}
      </main>

      {/* ─── PANELS ──────────────────────────────────────────── */}

      <Panel
        open={activePanel === 'messages'}
        onClose={closePanel}
        eyebrow="INBOX"
        title="Messages"
        actions={[
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <MessagesMissionPanel userId={data.user?.id} />
      </Panel>

      <Panel
        open={activePanel === 'focus'}
        onClose={closePanel}
        eyebrow="YOUR ANCHOR"
        title="My Focus"
        actions={[
          { label: 'DONE', primary: true, onClick: closePanel },
        ]}
      >
        <FocusPanelContent />
        <div style={{
          borderTop: '1px solid rgba(200,146,42,0.18)',
          marginTop: '28px',
          paddingTop: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: '#A8721A', fontSize: '14px' }}>✦</span>
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '11px', letterSpacing: '0.2em', color: '#A8721A' }}>WHAT'S BEEN PULLING AT YOU</span>
          </div>
          <MyInterestsPanel userId={data.user?.id} />
        </div>
      </Panel>

      {/* ── Daily — chooser + the two tools ─────────────────
          The Daily tile lands here on the chooser: both daily
          tools clearly marked, user picks. Tool views carry a
          back link to return to the chooser. */}
      <Panel
        open={activePanel === 'daily'}
        onClose={closePanel}
        eyebrow={
          dailyView === 'state'    ? 'DAILY · HORIZON STATE' :
          dailyView === 'practice' ? 'DAILY · HORIZON PRACTICE' :
                                     'DAILY · YOUR TOOLS'
        }
        title={
          dailyView === 'state'    ? 'How are you arriving today?' :
          dailyView === 'practice' ? "Today's practice" :
                                     'Choose your daily tool'
        }
        actions={
          dailyView === 'state' ? [
            { label: 'REPORTS & LOGS →', primary: true,
              onClick: () => navigate('/tools/horizon-state') },
            { label: 'CLOSE', onClick: closePanel },
          ] :
          dailyView === 'practice' ? [
            ...(mapComplete ? [
              { label: 'OPEN HORIZON PRACTICE →', primary: true,
                onClick: () => navigate('/tools/horizon-practice') },
            ] : []),
            { label: 'CLOSE', onClick: closePanel },
          ] : [
            { label: 'CLOSE', onClick: closePanel },
          ]
        }
      >
        {dailyView === 'chooser' && (
          <DailyChooserPanel
            foundationData={data.foundationData}
            practiceData={data.practiceData}
            mapComplete={mapComplete}
            onSelectState={() => setDailyView('state')}
            onSelectPractice={() => setDailyView('practice')}
          />
        )}

        {dailyView !== 'chooser' && (
          <button
            type="button"
            onClick={() => setDailyView('chooser')}
            style={{ fontFamily: "'Cormorant SC', Georgia, serif",
              fontSize: '10.5px', letterSpacing: '0.18em',
              background: 'none', border: 'none', padding: '0 0 14px',
              color: '#A8721A', cursor: 'pointer' }}>
            ← ALL DAILY TOOLS
          </button>
        )}

        {dailyView === 'state' && (
          <>
            <HorizonStateMissionPanel
              user={data.user}
              onNavigate={navigate}
            />
            {/* Phase 2/3 gate — shown below baseline content when map not complete */}
            {!mapComplete && horizonStatePhase === 'baseline' && (
              <div style={{
                margin: '24px 0 0', padding: '18px 20px',
                borderTop: '1px solid rgba(200,146,42,0.18)',
              }}>
                <div style={{ fontFamily: "'Cormorant SC', Georgia, serif",
                  fontSize: '10px', letterSpacing: '0.18em',
                  color: 'rgba(15,21,35,0.45)', marginBottom: '8px' }}>
                  PHASES 2 & 3
                </div>
                <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13.5px',
                  color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, margin: '0 0 12px' }}>
                  Calibration and Embodiment unlock once your Map is complete
                  and your I Am statements are in place.
                </p>
                <button onClick={() => { closePanel(); navigate('/tools/map') }}
                  style={{ fontFamily: "'Cormorant SC', Georgia, serif",
                    fontSize: '11px', letterSpacing: '0.14em',
                    background: 'none', border: '1px solid rgba(200,146,42,0.30)',
                    borderRadius: '40px', padding: '7px 16px',
                    color: '#A8721A', cursor: 'pointer' }}>
                  OPEN THE MAP →
                </button>
              </div>
            )}
          </>
        )}

        {dailyView === 'practice' && (
          mapComplete ? (
            <HorizonPracticeMissionPanel
              user={data.user}
              onNavigate={navigate}
            />
          ) : (
            <CurriculumGatePanel
              toolName="Horizon Practice"
              reason="Your morning practice voices your I Am statements — the ones you declare in Chapters One and Two of your journey. The full sequence begins the moment they're declared."
              ctaLabel="Continue your journey →"
              ctaPath="/nextu"
            />
          )
        )}
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
        open={activePanel === 'resources'}
        onClose={closePanel}
        eyebrow="FOR YOUR WORK · RESOURCES"
        title="Things that fit where you are"
      >
        {/* Next Steps entry — inline input launches the tool in motion */}
        <div style={{ marginBottom: '24px' }}>
          <ResourcesNextStepsInput onSubmit={(q) => { closePanel(); navigate(`/tools/nextsteps?q=${encodeURIComponent(q)}`) }} />
        </div>

        {/* Feed — empty for now, fills as content is surfaced */}
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.15)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: '#A8721A', fontSize: '14px' }}>✦</span>
            <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(15,21,35,0.55)' }}>YOUR FEED</span>
          </div>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '14px', color: 'rgba(15,21,35,0.55)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
            Articles, conversations, practitioners, and exercises — surfaced as your work moves.
          </p>
        </div>
      </Panel>

      <Panel
        open={activePanel === 'world-view'}
        onClose={closePanel}
        eyebrow="CIVILISATIONAL · WORLD VIEW"
        title="The state of the world right now"
        actions={[
          { label: 'CLOSE', onClick: closePanel },
        ]}
        dark
      >
        <WorldViewMissionPanel />
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
        eyebrow={data.user ? 'YOU · PROFILE' : 'YOU · SIGN IN'}
        title={data.user ? 'What others see of you on NextUs' : 'Sign in to NextUs'}
        actions={data.user ? [
          { label: 'EDIT FULL PROFILE →', primary: true,
            onClick: () => navigate('/profile/edit') },
          { label: 'CLOSE', onClick: closePanel },
        ] : [
          { label: 'SIGN IN →', primary: true,
            onClick: () => navigate('/login') },
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
        eyebrow="YOUR JOURNEY · NextU"
        title="Your seven domains"
        actions={[
          { label: mapAudited === 7 ? 'REVISIT A DOMAIN' : 'OPEN THE MAP →', primary: true,
            onClick: () => navigate('/tools/map') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <MapMissionPanel
          user={data.user}
          onNavigate={navigate}
        />
      </Panel>

      {/* ── Get To Do ─────────────────────────────────────── */}
      <Panel
        open={activePanel === 'get-to-do'}
        onClose={closePanel}
        eyebrow="YOUR STRETCH · GET TO DO"
        title="What's yours to do today"
        actions={[
          { label: 'TARGET STRETCH →', primary: true,
            onClick: () => navigate('/tools/target-sprint') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        <GetToDoMissionPanel
          userId={data.user?.id}
          sprintData={data.sprintData}
        />
      </Panel>

      {/* ── Horizon Practice gate (map not yet complete) ─── */}
      <Panel
        open={activePanel === 'horizon-practice-gate'}
        onClose={closePanel}
        eyebrow="DAILY · HORIZON PRACTICE"
        title="Horizon Practice"
        actions={[{ label: 'CLOSE', onClick: closePanel }]}
      >
        <CurriculumGatePanel
          toolName="Horizon Practice"
          reason="Your morning practice voices your I Am statements — the ones you declare in Chapters One and Two of your journey. The full sequence begins the moment they're declared."
          ctaLabel="Continue your journey →"
          ctaPath="/nextu"
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
  flex-direction: column;
}

/* Civ breadcrumb — sits above the wheel on planet side. Pattern
   lifted from the legacy DomainPanel: Cormorant SC, uppercase,
   gold separators, current segment in gold. Prior segments are
   tappable buttons that pop levelPath back to that depth. */
.mc-civ-crumbs {
  font-family: 'Cormorant SC', Georgia, serif;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.72);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 14px;
  padding: 4px 12px;
  min-height: 24px;
}
.mc-crumb-seg {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  letter-spacing: inherit;
  color: rgba(255, 255, 255, 0.72);
  text-transform: inherit;
  cursor: pointer;
  transition: color 150ms ease;
}
.mc-crumb-seg:hover { color: #FFFFFF; }
.mc-crumb-sep { color: #D4A744; margin: 0 2px; }
.mc-crumb-current { color: #D4A744; }

@media (max-width: 640px) {
  .mc-civ-crumbs {
    font-size: 13px;
    letter-spacing: 0.16em;
    margin-bottom: 8px;
  }
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

/* ScopePlaceholder — shown when activeScope is 'practice' or 'org'.
   Calm, generous whitespace, no marketing tone. */
.mc-scope-placeholder {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
}
.mc-scope-placeholder-inner {
  max-width: 560px;
  text-align: left;
}
.mc-scope-placeholder-eyebrow {
  font-family: 'Cormorant SC', Georgia, serif;
  font-size: 11px;
  letter-spacing: 0.22em;
  color: #A8721A;
  margin: 0 0 10px;
}
.mc-scope-placeholder-title {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 32px;
  font-weight: 500;
  color: #0F1523;
  margin: 0 0 14px;
  letter-spacing: -0.005em;
}
.mc-scope-placeholder-rule {
  width: 40px;
  height: 1px;
  background: #A8721A;
  margin: 14px 0 18px;
}
.mc-scope-placeholder-body {
  font-family: 'Lora', Georgia, serif;
  font-size: 15.5px;
  line-height: 1.65;
  color: #555;
  margin: 0;
}
@media (max-width: 640px) {
  .mc-scope-placeholder { padding: 36px 16px; }
  .mc-scope-placeholder-title { font-size: 26px; }
}
`