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
import { useActingAs } from '../context/ActingAsContext'

import IdentityStrip      from '../components/mission-control/IdentityStrip'
import BeaconStrip       from '../components/mission-control/BeaconStrip'
import PoleHeader         from '../components/mission-control/PoleHeader'
import FirstLightPrompt   from '../components/FirstLightPrompt'
import HorizonBanner       from '../components/mission-control/HorizonBanner'
import WorldMapSubstrate  from '../components/mission-control/WorldMapSubstrate'
import WheelStage         from '../components/mission-control/WheelStage'
import NowFeed            from '../components/mission-control/NowFeed'
import SideRail           from '../components/mission-control/SideRail'
import Tile               from '../components/mission-control/Tile'
import Panel              from '../components/mission-control/Panel'
import CivDomainPanel             from '../components/mission-control/CivDomainPanel'
import CivDomainHeader            from '../components/mission-control/CivDomainHeader'
import SelfDomainPanel            from '../components/mission-control/SelfDomainPanel'
import MyPracticeMissionPanel     from '../components/mission-control/MyPracticeMissionPanel'
import OrgRoomOverlay             from '../components/OrgRoomOverlay'
import MapMissionPanel            from '../components/mission-control/MapMissionPanel'
import TargetSprintMissionPanel   from '../components/mission-control/TargetSprintMissionPanel'
import PurposePieceMissionPanel   from '../components/mission-control/PurposePieceMissionPanel'
import DailySessionPanel          from '../components/daily/DailySessionPanel'
import ProfileMissionPanel        from '../components/mission-control/ProfileMissionPanel'
import SettingsMissionPanel       from '../components/mission-control/SettingsMissionPanel'
import WorldViewMissionPanel      from '../components/mission-control/WorldViewMissionPanel'
import GetToDoMissionPanel        from '../components/mission-control/GetToDoMissionPanel'
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

// Total stretch items across the active sprint — mirrors the
// flatten in GetToDoMissionPanel (every milestone + every task).
// Drives the Get To Do tile badge.
function getToDoCount(sprintData) {
  if (!Array.isArray(sprintData) || !sprintData.length) return 0
  const s = sprintData[0]
  const domains = Array.isArray(s?.domains) ? s.domains : []
  const domData = s?.domain_data || {}
  let n = 0
  for (const domId of domains) {
    const dd = domData[domId] || {}
    n += (dd.milestones?.length || 0) + (dd.tasks?.length || 0)
  }
  return n
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
    ? 'Your practitioner working room is being built. It will hold your placement, your offerings, and the contribution interest coming your way — with a URL-paste setup that pre-fills your placement from a page you already have on the web.'
    : 'Your organisation working room is being built. It will bring your organisation\'s profile, offers, and asks into Mission Control, with the same URL-paste setup shortcut.'

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
      <div style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.2em', color: '#262420', marginBottom: '10px' }}>NEXT STEPS</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder="What's on your mind right now…"
          style={{
            flex: 1, resize: 'none', border: '1px solid rgba(76,107,69,0.28)', borderRadius: '3px',
            padding: '10px 12px', fontFamily: "'Newsreader', Georgia, serif", fontSize: '14px',
            lineHeight: 1.55, color: '#0F1523', background: '#FAFAF7', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => { if (val.trim()) onSubmit(val.trim()) }}
          disabled={!val.trim()}
          style={{
            background: val.trim() ? '#4c6b45' : 'rgba(15,21,35,0.55)', color: val.trim() ? '#FFFFFF' : 'rgba(15,21,35,0.55)',
            border: 'none', borderRadius: '3px', padding: '10px 16px', cursor: val.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase',
            transition: 'background 0.15s', flexShrink: 0,
          }}
        >→</button>
      </div>
      <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '6px' }}>
        Press enter or → to begin
      </div>
    </div>
  )
}

export default function MissionControl() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = useMissionControlData()
  const { actingAsActor } = useActingAs()
  const [activePanel, setActivePanel] = useState(null)
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
  //
  // Earth Challenge season: the platform lands on Our Planet by
  // default. To revert after Climate Week, set DEFAULT_SCOPE back
  // to 'self' — the identity-change effect below already skips its
  // initial run, so no other change is needed.
  const DEFAULT_SCOPE = 'planet'
  const [activeScope, setActiveScope] = useState(DEFAULT_SCOPE)
  const [orgOpen, setOrgOpen] = useState(false)
  // The Now beat holds two states in one surface: a quiet 'glance'
  // (wheel + live counts) and, when leaned into, the 'feed'.
  const [nowView, setNowView] = useState('glance')
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

  // Acting as an actor (org / practitioner / project) puts you on the
  // civ rail, where actors operate — the Self rail belongs to the human.
  // Returning to You drops you back to My Life. Keyed on identity only,
  // so manual tab clicks are never overridden. Deferred while a welcome
  // handoff is arming a scope, so it doesn't fight that flow.
  //
  // Skips its initial run (prevActorIdRef seeded with the mount-time
  // identity) so the DEFAULT_SCOPE landing above is respected; it only
  // fires on a genuine identity switch mid-session.
  const prevActorIdRef = useRef(actingAsActor.id)
  useEffect(() => {
    if (prevActorIdRef.current === actingAsActor.id) return
    if (armingScope) return
    if (new URLSearchParams(location.search).get('scope')) return
    prevActorIdRef.current = actingAsActor.id
    setActiveScope(actingAsActor.id === 'personal' ? 'self' : 'planet')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingAsActor.id, armingScope])

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

  // My Org is no longer a top scope — it opens from the right-rail
  // My Org tile (OrgRoomOverlay). Keep it out of the switcher
  // (My Life / My Practice / Our Planet) even if the saved row or an
  // in-flight arm includes it.
  const topScopes = useMemo(
    () => availableScopes.filter(s => s !== 'org'),
    [availableScopes],
  )

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
    if (!topScopes.includes(activeScope)) {
      setActiveScope(topScopes[0])
    }
  }, [topScopes, activeScope])

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

  // Acting as an actor (org / practitioner / project): the personal map is
  // not theirs to see. Suppress the scores entirely — they are never passed
  // into the wheel — and show the actor's mark in the empty well instead.
  const actingAsActorNow = actingAsActor.id !== 'personal'
  const personalOffState = actingAsActorNow ? {
    eyebrow:     `Acting as ${actingAsActor.name}`,
    caption:     'Your personal map is private',
    markUrl:     actingAsActor.imageUrl || null,
    markInitial: (actingAsActor.name || '?').trim().charAt(0).toUpperCase(),
  } : null
  const personalCurrentSafe  = actingAsActorNow ? {} : selfCurrent
  const personalHorizonsSafe = actingAsActorNow ? {} : selfHorizons
  const personalIsEmpty      = actingAsActorNow ? true : (placedCount === 0)

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

  // Open the Daily front door — three entrances, every tool as a module.
  const openDaily = () => navigate('/daily')

  // ─── Rail states ─────────────────────────────────────────────
  const hsState = data.foundationData?.streak_days
    ? `${data.foundationData.streak_days}D STREAK`
    : null

  const toDoCount = getToDoCount(data.sprintData)

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

  // ─── Now-glance live counts ──────────────────────────────────
  // Self side reads the person's real Map / streak / to-do / IA
  // progress. Planet side reads the civ indicator rollup. Every
  // number here is sourced, never invented; a stat with no real
  // value is simply not shown.
  const streakDays = data.foundationData?.streak_days || 0
  const civPlacedCount = Object.keys(civCurrent).length
  const civAvgPct = civPlacedCount > 0
    ? Math.round(
        (Object.values(civCurrent).reduce((a, b) => a + b, 0) / civPlacedCount) * 10
      )
    : null

  const glanceStats = isCiv
    ? [
        { big: String(civPlacedCount), small: ' / 7', lbl: 'Domains tracked' },
        ...(civAvgPct != null ? [{ big: String(civAvgPct), small: '%', lbl: 'Toward the goal' }] : []),
      ]
    : [
        { big: String(mapAudited), small: ' / 7', lbl: 'Domains mapped' },
        ...(streakDays > 0 ? [{ big: String(streakDays), small: ' day', lbl: 'Streak' }] : []),
        { big: String(toDoCount), lbl: 'Open next steps' },
        { big: String(iaCount), small: ' / 7', lbl: 'I am statements' },
      ]

  // ─── Beat cards ──────────────────────────────────────────────
  // Each card wraps a real tool: its onClick fires the same handler
  // the old rail tiles fired. Pole-aware — My Life vs Our Planet.
  const horizonCards = isCiv
    ? [
        { kicker: 'World View', title: 'The world we want', blurb: 'A shared picture of the future worth building.', cta: 'Open World View', img: 'mc-im3', onClick: () => openCivPanel('world-view') },
        { kicker: 'My Focus', title: 'What you’re here for', blurb: 'The domain of the planet you’re choosing to move.', cta: 'Set your focus', img: 'mc-im2', onClick: () => { setActiveScope('planet'); setActivePanel('focus') } },
      ]
    : [
        { kicker: 'North Star', title: 'Your guiding aim', blurb: 'The one direction the whole loop points towards.', cta: 'Set your star', img: 'mc-im1', onClick: () => navigate('/north-star') },
        { kicker: 'NextU', title: 'Who you’re becoming', blurb: 'Your seven domains, growing towards the horizon.', cta: 'Open NextU', img: 'mc-im5', onClick: () => navigate('/nextu') },
      ]

  const nextCards = isCiv
    ? [
        { kicker: 'Planet Sprint', title: 'Join a sprint', blurb: 'A focused push on a real-world goal.', cta: 'Find a sprint', img: 'mc-im8', onClick: () => openCivPanel('missions') },
        { kicker: 'My Org', title: 'Your organisation', blurb: 'Rally a team behind the work.', cta: 'Open My Org', img: 'mc-im4', onClick: () => setOrgOpen(true) },
        { kicker: 'Add Org', title: 'Start something', blurb: 'Bring a new organisation onto the map.', cta: 'Add an org', img: 'mc-im2', onClick: () => navigate('/add') },
      ]
    : [
        { kicker: 'Get To Do', title: 'Your next step', blurb: 'One clear action, drawn from your horizon.', cta: 'See what’s next', img: 'mc-im6', onClick: () => openPersonalPanel('get-to-do') },
        { kicker: 'Circles', title: 'Move with people', blurb: 'The people walking the same way as you.', cta: 'Open Circles', img: 'mc-im5', onClick: () => navigate('/circles') },
      ]

  const pathCards = isCiv
    ? [
        { kicker: 'Your Guide', title: 'Find the way', blurb: 'Guidance for the route from here to there.', cta: 'Open your guide', img: 'mc-im3', onClick: () => navigate('/guide') },
        { kicker: 'Search', title: 'Find anything', blurb: 'People, orgs, missions, moments across the planet.', cta: 'Search', img: 'mc-im4', onClick: () => navigate('/search') },
      ]
    : [
        { kicker: 'Daily', title: 'Your loop, closing', blurb: 'Each step bends the path back to your horizon.', cta: 'Open your day', img: 'mc-im7', onClick: openDaily },
        { kicker: 'Journal', title: 'The record of becoming', blurb: 'Where the path is written down, day by day.', cta: 'Open Journal', img: 'mc-im5', onClick: () => navigate('/journal') },
      ]

  return (
    <div
      id="mc-stage-root"
      className="mc-stage-root"
    >
      <style>{STAGE_CSS}</style>

      <BeaconStrip userId={data.user?.id} />

      {/* ─── STICKY NAV — gold NextUs wordmark, pole toggle, beats ─── */}
      <nav className="mc-nav">
        <div className="mc-nav-inner">
          <button
            type="button"
            className="mc-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="NextUs · home"
          >
            Next<span>Us</span>
          </button>

          <div className="mc-pole" role="tablist" aria-label="Scale">
            <button
              type="button"
              role="tab"
              aria-selected={!isCiv}
              className={!isCiv ? 'on' : ''}
              onClick={() => handleScopeSelect('self')}
            >
              My Life
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isCiv}
              className={isCiv ? 'on' : ''}
              onClick={() => handleScopeSelect('planet')}
            >
              Our Planet
            </button>
          </div>

          <div className="mc-nav-spacer" />

          <div className="mc-nav-links">
            <a href="#beat-horizon">Horizon</a>
            <a href="#beat-now">Now</a>
            <a href="#beat-next">Next step</a>
            <a href="#beat-path">Path</a>
          </div>

          <button
            type="button"
            className="mc-icon-btn"
            onClick={() => setActivePanel('messages')}
            aria-label="Mail"
            title="Mail"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </button>
          <button
            type="button"
            className="mc-avatar"
            onClick={() => setActivePanel('profile')}
            aria-label={userName}
            title={userName}
          />
        </div>
      </nav>

      <main className="mc-wrap">


        {/* ─── BEAT 1 · HORIZON — What we want ─────────────────── */}
        <section className="mc-beat" id="beat-horizon">
          <div className="mc-eyebrow"><span className="mc-dot" /> What we want <span className="mc-n">· Horizon</span></div>
          <h2 className="mc-beat-h">{isCiv ? 'The future we’re reaching for.' : 'The future you’re reaching for.'}</h2>
          <p className="mc-lede">{isCiv
            ? 'Name it together, hold it in view, and let the work line up behind it.'
            : 'Name it, hold it in view, and let everything else line up behind it.'}</p>

          {/* The declared horizon's home (BP-8) — verbatim once declared. */}
          <HorizonBanner userId={data.user?.id} />
          <FirstLightPrompt style={{ margin: '18px 0 0', maxWidth: 720 }} />

          <div className="mc-cards">
            {horizonCards.map((c, i) => (
              <button key={c.kicker + i} type="button" className="mc-card" onClick={c.onClick}>
                <span className={`mc-card-img ${c.img}`} />
                <span className="mc-card-body">
                  <span className="mc-card-kicker">{c.kicker}</span>
                  <span className="mc-card-h">{c.title}</span>
                  <span className="mc-card-p">{c.blurb}</span>
                  <span className="mc-card-go">{c.cta}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ─── BEAT 2 · NOW — Where we are (one surface, two states) ─── */}
        <section className="mc-beat" id="beat-now">
          <div className="mc-ribbon-head">
            <div>
              <div className="mc-eyebrow"><span className="mc-dot" /> Where we are <span className="mc-n">· Now</span></div>
              <h2 className="mc-beat-h">{isCiv ? 'Where the planet stands.' : 'Right now, at a glance.'}</h2>
            </div>
          </div>

          <div className="mc-now-shell">
            <div className="mc-now-bar">
              <span className="mc-state-word">{isCiv ? 'Planet state' : 'Your state'}</span>
              <div className="mc-now-toggle" role="tablist" aria-label="Now view">
                <button type="button" role="tab" aria-selected={nowView === 'glance'} className={nowView === 'glance' ? 'on' : ''} onClick={() => setNowView('glance')}>Glance</button>
                <button type="button" role="tab" aria-selected={nowView === 'feed'} className={nowView === 'feed' ? 'on' : ''} onClick={() => setNowView('feed')}>Feed</button>
              </div>
            </div>

            {/* COLLAPSED — the wheel (reused as-is) + live counts */}
            {nowView === 'glance' && (activeScope === 'self' || activeScope === 'planet') && (
              <div className="mc-now-view">
                <div className="mc-glance">
                  <div className="mc-wheel-wrap">
                    <div className={`mc-instrument${isCiv ? ' mc-instrument--dark' : ''}`} data-stage={isCiv ? 'dark' : undefined}>
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
                      {isCiv && (
                        <CivDomainHeader
                          levelPath={levelPath}
                          showOverview={showOverview}
                          parentPanelOpen={parentPanelOpen}
                          parentItem={parentItem}
                          selectedItem={selectedItem}
                        />
                      )}
                      <WheelStage
                        currentWheel={currentWheel}
                        personalProps={{
                          labels:    SELF_LABELS,
                          keys:      SELF_KEYS,
                          horizons:  personalHorizonsSafe,
                          current:   personalCurrentSafe,
                          activeKey: (!actingAsActorNow && selfActiveIndex !== null) ? SELF_KEYS[selfActiveIndex] : null,
                          walkers:   personalWalkers,
                          isEmpty:   personalIsEmpty,
                          offState:  personalOffState,
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
                          current:       levelPath.length === 0 ? civCurrent : {},
                          horizons:      levelPath.length === 0 ? civHorizons : {},
                        }}
                      />
                    </div>
                  </div>

                  {glanceStats.length > 0 && (
                    <div className="mc-stats">
                      {glanceStats.map((s, i) => (
                        <div key={s.lbl + i} className="mc-stat">
                          <div className="mc-stat-big">{s.big}{s.small && <small>{s.small}</small>}</div>
                          <div className="mc-stat-lbl">{s.lbl}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selecting a spoke opens its detail below the wheel —
                    the same wiring the old scroll-below carried. */}
                {!isCiv && !actingAsActorNow && (
                  <div className="mc-glance-detail">
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
                      onOpenPractice={() => navigate('/tools/horizon-practice')}
                      onOpenHorizonState={openDaily}
                    />
                  </div>
                )}
                {isCiv && (
                  <div className="mc-glance-detail mc-glance-detail--dark" data-stage="dark">
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
                  </div>
                )}
              </div>
            )}

            {/* EXPANDED — the real moments feed takes over the same space */}
            {nowView === 'feed' && (
              <div className="mc-now-view">
                <NowFeed userId={data.user?.id} onCompose={() => navigate('/add')} />
              </div>
            )}
          </div>
          <p className="mc-mode-note">Glance is quiet by default. Lean in and the feed takes over the same space.</p>
        </section>

        {/* ─── BEAT 3 · NEXT STEP — What's next ─────────────────── */}
        <section className="mc-beat" id="beat-next">
          <div className="mc-ribbon-head">
            <div>
              <div className="mc-eyebrow"><span className="mc-dot" /> What’s next <span className="mc-n">· Next step</span></div>
              <h2 className="mc-beat-h">{isCiv ? 'The next move together.' : 'The one thing to do next.'}</h2>
            </div>
          </div>
          <div className="mc-cards">
            {nextCards.map((c, i) => (
              <button key={c.kicker + i} type="button" className="mc-card" onClick={c.onClick}>
                <span className={`mc-card-img ${c.img}`} />
                <span className="mc-card-body">
                  <span className="mc-card-kicker">{c.kicker}</span>
                  <span className="mc-card-h">{c.title}</span>
                  <span className="mc-card-p">{c.blurb}</span>
                  <span className="mc-card-go">{c.cta}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ─── BEAT 4 · PATH — How we get there ─────────────────── */}
        <section className="mc-beat" id="beat-path">
          <div className="mc-ribbon-head">
            <div>
              <div className="mc-eyebrow"><span className="mc-dot" /> How we get there <span className="mc-n">· Path</span></div>
              <h2 className="mc-beat-h">{isCiv ? 'The route we take together.' : 'The way forward, kept in sight.'}</h2>
            </div>
          </div>
          <div className="mc-cards">
            {pathCards.map((c, i) => (
              <button key={c.kicker + i} type="button" className="mc-card" onClick={c.onClick}>
                <span className={`mc-card-img ${c.img}`} />
                <span className="mc-card-body">
                  <span className="mc-card-kicker">{c.kicker}</span>
                  <span className="mc-card-h">{c.title}</span>
                  <span className="mc-card-p">{c.blurb}</span>
                  <span className="mc-card-go">{c.cta}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {activeScope === 'practice' && (
          <MyPracticeMissionPanel userId={data.user?.id} />
        )}

      </main>

      <footer className="mc-foot">
        <div className="mc-wrap">NextUs · What we want · Where we are · What’s next · How we get there</div>
      </footer>

      {/* ─── MY ORG — opens from the right-rail tile, fades up in place ─ */}
      <OrgRoomOverlay open={orgOpen} onClose={() => setOrgOpen(false)} userId={data.user?.id} />

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
          borderTop: '1px solid rgba(76,107,69,0.18)',
          marginTop: '28px',
          paddingTop: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: '#262420', fontSize: '14px' }}>✦</span>
            <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.2em', color: '#262420' }}>WHAT'S BEEN PULLING AT YOU</span>
          </div>
          <MyInterestsPanel userId={data.user?.id} />
        </div>
      </Panel>

      {/* ── Daily — the session: Arrive → Deck → Embark → Seal.
          The slider sandwich wraps the whole morning; the deck
          inside it offers every daily tool in any order. The
          component owns its own headers and buttons; the Panel
          provides only chrome and close. */}
      <Panel
        open={activePanel === 'daily'}
        onClose={closePanel}
        eyebrow="DAILY"
        actions={[
          { label: 'REPORTS & LOGS →',
            onClick: () => navigate('/tools/horizon-state') },
          { label: 'CLOSE', onClick: closePanel },
        ]}
      >
        {activePanel === 'daily' && (
          <DailySessionPanel
            user={data.user}
            sprintData={data.sprintData}
            practiceData={data.practiceData}
            mapComplete={mapComplete}
            onNavigate={(path) => { closePanel(); navigate(path) }}
            onOpenGetToDo={() => { closePanel(); openPersonalPanel('get-to-do') }}
          />
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
        <div style={{ borderTop: '1px solid rgba(76,107,69,0.15)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: '#262420', fontSize: '14px' }}>✦</span>
            <span style={{ fontFamily: "'IBM Plex Mono', Georgia, serif", fontSize: '13px', letterSpacing: '0.2em', color: 'rgba(15,21,35,0.55)' }}>YOUR FEED</span>
          </div>
          <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '14px', color: 'rgba(15,21,35,0.55)', margin: 0, lineHeight: 1.6 }}>
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
      >
        <WorldViewMissionPanel />
      </Panel>

      <Panel
        open={activePanel === 'missions'}
        onClose={closePanel}
        eyebrow="OUTWARD AIM · PLANET SPRINT"
        title="Quests in your range"
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
        title={data.user ? 'You on NextUs' : 'Sign in to NextUs'}
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
        eyebrow="MY LIFE · GET TO DO"
        title="Get To Do"
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
/* ─────────────────────────────────────────────────────────────
   NextUs · Mission Control home — the four-beat loop.
   TED + Omega + Tesla: one bright ground for both poles, the
   accent alone carries scale. My Life = moss; Our Planet = clay.
   The gold NextUs wordmark is constant across both.
   ───────────────────────────────────────────────────────────── */

.mc-stage-root {
  /* Shared bright ground (Omega-bright) for BOTH poles. */
  --mc-gold:#cf9a24;
  --mc-bg:#f3f0e9;
  --mc-surface:#ffffff;
  --mc-surface-2:#eae5da;
  --mc-ink:#262420;
  --mc-muted:rgba(38,36,32,.58);
  --mc-line:rgba(38,36,32,.11);
  --mc-shadow:0 1px 2px rgba(38,36,32,.06), 0 10px 32px rgba(38,36,32,.08);
  /* My Life accent (moss green) */
  --mc-accent:#4c6b45;
  --mc-accent-ink:#ffffff;
  --mc-accent-soft:#e7ede0;

  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--mc-bg);
  color: var(--mc-ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  transition: background .5s ease, color .5s ease;
}

/* Our Planet: same bright ground, earthy clay accent only.
   data-stage="dark" is the existing scope flag (set on planet);
   here it swaps the ACCENT, it does not darken the ground. */
.mc-stage-root[data-stage="dark"] {
  --mc-accent:#a9743f;
  --mc-accent-ink:#ffffff;
  --mc-accent-soft:#e6d8bf;
  background: var(--mc-bg);
  color: var(--mc-ink);
}

.mc-wrap {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 28px;
}

/* ── sticky nav ─────────────────────────────────────────────── */
.mc-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--mc-bg) 88%, transparent);
  -webkit-backdrop-filter: saturate(140%) blur(14px);
  backdrop-filter: saturate(140%) blur(14px);
  border-bottom: 1px solid var(--mc-line);
}
.mc-nav-inner {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 66px;
}
.mc-brand {
  font-weight: 800;
  letter-spacing: -.02em;
  font-size: 19px;
  color: var(--mc-ink);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}
.mc-brand span { color: var(--mc-gold); }
.mc-nav-spacer { flex: 1; }
.mc-nav-links { display: flex; gap: 22px; }
.mc-nav-links a {
  color: var(--mc-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .01em;
}
.mc-nav-links a:hover { color: var(--mc-ink); }

.mc-pole {
  display: inline-flex;
  background: var(--mc-surface-2);
  border: 1px solid var(--mc-line);
  border-radius: 999px;
  padding: 4px;
  gap: 2px;
}
.mc-pole button {
  border: 0;
  background: transparent;
  color: var(--mc-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: .01em;
  padding: 7px 16px;
  border-radius: 999px;
  transition: all .25s ease;
  white-space: nowrap;
}
.mc-pole button.on {
  background: var(--mc-accent);
  color: var(--mc-accent-ink);
  box-shadow: var(--mc-shadow);
}

.mc-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--mc-line);
  background: var(--mc-surface);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--mc-ink);
}
.mc-avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--mc-line);
  cursor: pointer;
  background: linear-gradient(135deg, var(--mc-accent), color-mix(in srgb, var(--mc-accent) 55%, #000));
}

/* ── beat ribbon ────────────────────────────────────────────── */
.mc-beat { padding: 64px 0 8px; }
.mc-beat:last-of-type { padding-bottom: 80px; }
.mc-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--mc-accent);
}
.mc-eyebrow .mc-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--mc-accent);
}
.mc-eyebrow .mc-n {
  color: var(--mc-muted);
  font-weight: 700;
  letter-spacing: .06em;
}
.mc-beat-h {
  font-size: clamp(30px, 4.4vw, 52px);
  line-height: 1.02;
  letter-spacing: -.03em;
  font-weight: 800;
  margin: 14px 0 6px;
  max-width: 18ch;
}
.mc-lede {
  color: var(--mc-muted);
  font-size: 16px;
  max-width: 52ch;
  margin-bottom: 26px;
}
.mc-ribbon-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 4px;
}

/* ── tool cards ─────────────────────────────────────────────── */
.mc-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  margin-top: 22px;
}
.mc-card {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: var(--mc-surface);
  border: 1px solid var(--mc-line);
  box-shadow: var(--mc-shadow);
  cursor: pointer;
  transition: transform .3s ease, box-shadow .3s ease;
  text-align: left;
  color: inherit;
  font-family: inherit;
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 230px;
}
.mc-card:hover { transform: translateY(-4px); box-shadow: 0 14px 44px rgba(38,36,32,.18); }
.mc-card-img {
  height: 150px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: block;
}
.mc-card-img::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,.28));
}
.mc-card-body {
  padding: 16px 18px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.mc-card-kicker {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--mc-accent);
  margin-bottom: 6px;
}
.mc-card-h { font-size: 19px; letter-spacing: -.01em; margin-bottom: 5px; font-weight: 700; }
.mc-card-p { font-size: 13px; color: var(--mc-muted); line-height: 1.45; }
.mc-card-go { margin-top: auto; padding-top: 12px; font-size: 13px; font-weight: 700; color: var(--mc-ink); }
.mc-card-go::after { content: " ›"; color: var(--mc-accent); }

/* card gradient palettes (placeholder photography) */
.mc-im1 { background-image: linear-gradient(135deg,#8fae7e,#4c6b45); }
.mc-im2 { background-image: linear-gradient(135deg,#e3c68a,#b98b3e); }
.mc-im3 { background-image: linear-gradient(135deg,#7fa9b0,#3d6b73); }
.mc-im4 { background-image: linear-gradient(135deg,#c9a27f,#7a5233); }
.mc-im5 { background-image: linear-gradient(135deg,#a7b98f,#5f7a48); }
.mc-im6 { background-image: linear-gradient(135deg,#d8b48c,#9c6b3c); }
.mc-im7 { background-image: linear-gradient(160deg,#6c8f6a,#2f4a30); }
.mc-im8 { background-image: linear-gradient(160deg,#caa15f,#6e4a22); }

/* ── NOW surface: collapsed <-> feed ────────────────────────── */
.mc-now-shell {
  border: 1px solid var(--mc-line);
  border-radius: 22px;
  background: var(--mc-surface);
  box-shadow: var(--mc-shadow);
  overflow: hidden;
  margin-top: 22px;
}
.mc-now-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--mc-line);
}
.mc-state-word { font-size: 13px; color: var(--mc-muted); font-weight: 600; }
.mc-now-toggle {
  margin-left: auto;
  display: inline-flex;
  background: var(--mc-surface-2);
  border: 1px solid var(--mc-line);
  border-radius: 999px;
  padding: 3px;
}
.mc-now-toggle button {
  border: 0;
  background: transparent;
  color: var(--mc-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 7px 15px;
  border-radius: 999px;
  cursor: pointer;
  transition: all .2s;
}
.mc-now-toggle button.on { background: var(--mc-accent); color: var(--mc-accent-ink); }

/* collapsed: wheel + stats */
.mc-glance {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 30px;
  padding: 30px;
  align-items: center;
}
.mc-wheel-wrap { display: grid; place-items: center; }
.mc-instrument {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 18px;
  padding: 8px;
}
/* Civ wheel + civ header — a contained bright instrument card, framing
   the wheel without a dark stage (full retheme: both poles bright). */
.mc-instrument--dark {
  background: var(--mc-surface);
  padding: 20px 16px;
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px var(--mc-line);
}
.mc-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.mc-stat {
  border: 1px solid var(--mc-line);
  border-radius: 14px;
  padding: 16px 18px;
  background: var(--mc-surface-2);
}
.mc-stat-big { font-size: 30px; font-weight: 800; letter-spacing: -.02em; }
.mc-stat-big small { font-size: 14px; font-weight: 700; color: var(--mc-muted); }
.mc-stat-lbl { font-size: 13px; color: var(--mc-muted); font-weight: 600; margin-top: 2px; }

.mc-glance-detail { padding: 0 30px 30px; }
.mc-glance-detail--dark {
  margin: 0 20px 24px;
  padding: 20px;
  border-radius: 18px;
  background: var(--mc-surface);
  border: 1px solid var(--mc-line);
  color: var(--mc-ink);
}

/* ── civ breadcrumb (reused from the legacy DomainPanel) ─────── */
.mc-civ-crumbs {
  font-family: 'IBM Plex Mono', Georgia, serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: .12em;
  color: var(--mc-muted);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 12px;
  min-height: 22px;
}
.mc-crumb-seg {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  letter-spacing: inherit;
  color: var(--mc-muted);
  text-transform: inherit;
  cursor: pointer;
  transition: color 150ms ease;
}
.mc-crumb-seg:hover { color: var(--mc-ink); }
.mc-crumb-sep { color: var(--mc-gold); margin: 0 2px; }
.mc-crumb-current { color: var(--mc-gold); }

/* ── expanded: the real moments feed ────────────────────────── */
.mc-feed { padding: 22px; }
.mc-composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 4px 20px;
  border-bottom: 1px solid var(--mc-line);
  margin-bottom: 20px;
}
.mc-composer-ask { font-size: 13px; color: var(--mc-muted); }
.mc-composer-ask b { color: var(--mc-ink); font-weight: 700; }
.mc-feed-note { font-size: 14px; color: var(--mc-muted); padding: 20px 4px; }
.mc-feed-retry {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 14px;
  color: var(--mc-accent);
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
}
.mc-feed-grid { columns: 3; column-gap: 16px; }
.mc-post {
  break-inside: avoid;
  margin-bottom: 16px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--mc-surface-2);
  border: 1px solid var(--mc-line);
  position: relative;
}
.mc-post-media {
  position: relative;
  background-size: cover;
  background-position: center;
  aspect-ratio: 4 / 5;
}
.mc-post-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,.42));
}
.mc-chip {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
  padding: 5px 11px;
  border-radius: 999px;
  color: #fff;
  background: rgba(0,0,0,.42);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,.55);
}
.mc-chip--static {
  position: static;
  display: inline-block;
  color: var(--mc-accent);
  background: var(--mc-accent-soft);
  border: 1px solid var(--mc-line);
  margin-bottom: 10px;
}
.mc-cap {
  position: absolute;
  z-index: 2;
  left: 14px;
  right: 14px;
  bottom: 12px;
  color: #fff;
}
.mc-cap-txt {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  text-shadow: 0 1px 8px rgba(0,0,0,.5);
}
.mc-cap-who {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  font-size: 13px;
}
.mc-cap-a, .mc-post-a {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: rgba(255,255,255,.22);
  border: 1px solid rgba(255,255,255,.55);
  color: #fff;
}
.mc-post--text { padding: 16px 18px; }
.mc-post-line { font-size: 15px; line-height: 1.4; color: var(--mc-ink); }
.mc-post-who {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--mc-muted);
}
.mc-post-a { background: var(--mc-accent); border-color: transparent; }

.mc-mode-note { font-size: 13px; color: var(--mc-muted); margin-top: 12px; }

.mc-foot {
  border-top: 1px solid var(--mc-line);
  color: var(--mc-muted);
  font-size: 13px;
  padding: 28px 0;
  margin-top: auto;
}

/* ── responsive ─────────────────────────────────────────────── */
@media (max-width: 900px) {
  .mc-glance { grid-template-columns: 1fr; }
  .mc-feed-grid { columns: 2; }
}
@media (max-width: 640px) {
  .mc-wrap, .mc-nav-inner { padding: 0 18px; }
  .mc-nav-links { display: none; }
  .mc-beat { padding: 44px 0 8px; }
  .mc-glance { padding: 20px; }
  .mc-glance-detail { padding: 0 18px 22px; }
  .mc-feed-grid { columns: 1; }
  .mc-civ-crumbs { font-size: 13px; letter-spacing: .16em; }
}
`