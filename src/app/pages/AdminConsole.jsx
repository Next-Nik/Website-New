// src/beta/pages/AdminConsole.jsx
//
// Module 9: Admin Console port for /beta/admin.
// Source: src/pages/AdminConsole.jsx (untouched).
//
// Patch (May 2026): "Extract" tab renamed to "Add". The tool contributes
// actors to the ecosystem; the prior "extract" framing read as the opposite
// of the platform's regenerative stance. Function renamed ExtractTab → AddTab,
// internal state extracting/extractErr → adding/addErr, button label
// "Extract" → "Read site". Provenance: ProposalCard gains a "Source (optional)"
// field; saveSelected writes user-entered data_source if present, falls back
// to "Admin add (beta): <label>" otherwise. /api/org-extract endpoint URL
// preserved (rename pending its own deploy coordination). The jsonb markers
// extracted_at and input_mode:'admin_extract_beta' preserved as-is to keep
// historical row data lineage intact. The historical notes below describe
// the original Module 9 build (ExtractTab → AddTab applies throughout).
//
// What changed from the original:
//   1. Import path updates (Nav, useAuth, useSupabase, routes use beta paths).
//   2. Inline PLANET_DOMAINS_EX / SELF_DOMAINS_EX / DOMAIN_LIST replaced with
//      imports from src/beta/constants/.
//   3. AddTab — ProposalCard updated for four-dimensional placement display
//      (domains[], subdomains[], fields[], lenses[], problem_chains[],
//      platform_principles[]). API single-value fallback: if domains[] is
//      absent, treat domain_id as domains[0].
//   4. AddTab — save payload writes new four-dim columns.
//   5. ActorsTab save flow — HorizonFloorAdmissionCheck modal inserted before
//      final write. Writes horizon_floor_status to actor.
//   6. AddTab save flow — same HorizonFloorAdmissionCheck inserted.
//   7. NominationsTab approve flow — HorizonFloorAdmissionCheck inserted.
//   8. Nominate link updated to /beta/nominate.
//
// All seventeen tabs preserved. TIER_FROM_SCORE preserved. HAL signals and SFP
// patterns rendering preserved. Parallel proposals preserved.
// Integrity warning on ContributionsTab preserved.
// Original AdminConsole.jsx not modified.

import { useState, useEffect, useCallback } from 'react'
import { actorCallsRaw } from '../../lib/actorCallsClient'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import HorizonFloorAdmissionCheck from '../components/HorizonFloorAdmissionCheck'
import MomentsReviewQueue from '../components/MomentsReviewQueue'
import SeedTab from '../components/admin/SeedTab'
import PrincipleStrip from '../components/PrincipleStrip'

// ── Beta constants — import instead of inline ─────────────────
import {
  CIV_DOMAINS,
  SUBDOMAIN_MAP_BETA,
} from '../constants/domains'
import { PRINCIPLES_ORDERED } from '../constants/principles'
import { body, sc, fn } from '../../lib/designTokens'
import { SCALES as CANONICAL_SCALES } from '../constants/scales'

// ── Founder check ─────────────────────────────────────────────
// Identical to original: uses user_metadata.role set in Supabase.
// UI gate only — the real enforcement is RLS is_founder() (app_metadata only).
// Tolerant of either metadata source so the founder can't be locked out of the
// console while the role is migrated to app_metadata.
function isFounder(user) {
  return user?.app_metadata?.role === 'founder' || user?.user_metadata?.role === 'founder'
}

// Normalised keys for duplicate detection, shared by the Add flow. URL keeps the
// path so sub-orgs on a shared domain stay distinct; name is trimmed/lower-cased.
function normActorUrl(u) {
  if (!u) return null
  try {
    const x = new URL(u.startsWith('http') ? u : `https://${u}`)
    return (x.hostname.replace(/^www\./, '') + x.pathname).toLowerCase().replace(/\/+$/, '') || null
  } catch { return null }
}
function normActorName(n) {
  const s = (n || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return s || null
}

const gold  = fn.ink
const bg    = '#FAFAF7'

// ── Domain list from beta constants ───────────────────────────
const DOMAIN_LIST = CIV_DOMAINS.map(d => ({ value: d.slug, label: d.label }))
const DOMAINS_WITH_EMPTY = [{ value: '', label: 'All domains' }, ...DOMAIN_LIST]
const ACTOR_TYPES   = ['organisation', 'project']
// Canonical eight-level taxonomy — kept in sync with src/app/constants/scales.js
const SCALE_OPTIONS = CANONICAL_SCALES.map(s => s.slug)

// Subdomain map. Beta version extends the original with v3.8 Nature subdomains.
// Falls back to original SUBDOMAIN_MAP shape when domain not yet in SUBDOMAIN_MAP_BETA.
const SUBDOMAIN_MAP = {
  'human-being':     [['hb-body','Body'],['hb-mind','Mind'],['hb-inner-life','Inner Life'],['hb-development','Development'],['hb-dignity','Dignity & Rights'],['hb-expression','Expression & Culture']],
  'society':         [['soc-governance','Governance'],['soc-culture','Culture'],['soc-conflict-peace','Conflict & Peace'],['soc-community','Community'],['soc-communication','Communication & Information'],['soc-global','Global Coordination']],
  'nature':          [['nat-earth','Earth'],['nat-air','Air'],['nat-salt-water','Salt Water'],['nat-fresh-water','Fresh Water'],['nat-flora','Flora'],['nat-fauna','Fauna'],['nat-living-systems','Living Systems']],
  'technology':      [['tech-digital','Digital Systems'],['tech-biological','Biological Technology'],['tech-infrastructure','Physical Infrastructure'],['tech-energy','Energy'],['tech-frontier','Frontier & Emerging Technology']],
  'finance-economy': [['fe-resources','Resources'],['fe-exchange','Exchange'],['fe-capital','Capital'],['fe-labour','Labour'],['fe-ownership','Ownership'],['fe-distribution','Distribution']],
  'legacy':          [['leg-wisdom','Wisdom'],['leg-memory','Memory'],['leg-ceremony','Ceremony & Ritual'],['leg-intergenerational','Intergenerational Relationship'],['leg-long-arc','The Long Arc']],
  'vision':          [['vis-imagination','Imagination'],['vis-philosophy','Philosophy & Worldview'],['vis-leadership','Leadership'],['vis-coordination','Coordination'],['vis-foresight','Foresight']],
}

// Add-specific domain lists
const PLANET_DOMAINS_EX = DOMAIN_LIST
const SELF_DOMAINS_EX = [
  { value: 'path',       label: 'Path' },
  { value: 'spark',      label: 'Spark' },
  { value: 'body',       label: 'Body' },
  { value: 'finances',   label: 'Finances' },
  { value: 'connection', label: 'Connection' },
  { value: 'inner-game', label: 'Inner Game' },
  { value: 'signal',     label: 'Signal' },
]
const SCALES_EX = CANONICAL_SCALES.map(s => s.slug)
const TYPES_EX  = ['organisation','project','practitioner','programme','resource']

// ── Placement tier from score (preserved from original) ───────
const TIER_FROM_SCORE = s => s <= 4.5 ? 'pattern_instance' : s <= 6.5 ? 'contested' : s <= 8.5 ? 'qualified' : 'exemplar'

const TIER_CFG = {
  pattern_instance: { label: 'Pattern instance', color: '#8A3030', bg: 'rgba(138,48,48,0.08)', border: 'rgba(138,48,48,0.25)' },
  contested:        { label: 'Contested',         color: '#8A6020', bg: 'rgba(76,107,69,0.08)', border: 'rgba(76,107,69,0.30)' },
  qualified:        { label: 'Qualified',          color: '#262420', bg: 'rgba(38,36,32,0.08)', border: 'rgba(38,36,32,0.30)' },
  exemplar:         { label: 'Exemplar',            color: '#6A4A10', bg: 'rgba(106,74,16,0.10)', border: 'rgba(106,74,16,0.35)' },
}

const LABEL_COLORS = {
  Planet:       { color: '#2A4A8A', bg: 'rgba(42,74,138,0.08)',  border: 'rgba(42,74,138,0.25)' },
  Self:         { color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)', border: 'rgba(42,107,58,0.25)' },
  Practitioner: { color: '#262420', bg: 'rgba(38,36,32,0.08)', border: 'rgba(38,36,32,0.25)' },
}

// ── Shared UI primitives (identical to original) ──────────────

function Eyebrow({ children }) {
  return (
    <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', color: gold,
      textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
      {children}
    </span>
  )
}

function Btn({ onClick, children, variant = 'primary', small, disabled }) {
  const styles = {
    primary: { background: 'rgba(76,107,69,0.05)', border: '1.5px solid rgba(76,107,69,0.78)', color: gold },
    danger:  { background: 'rgba(180,40,40,0.05)',  border: '1.5px solid rgba(180,40,40,0.5)',   color: '#8A2020' },
    ghost:   { background: 'transparent',           border: '1px solid rgba(76,107,69,0.30)',    color: 'rgba(15,21,35,0.72)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...sc, fontSize: small ? '15px' : '17px', letterSpacing: '0.12em',
      padding: small ? '6px 14px' : '10px 20px',
      borderRadius: '40px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, ...styles[variant],
    }}>
      {children}
    </button>
  )
}

function Input({ value, onChange, placeholder, type = 'text', style, onKeyDown, step }) {
  return (
    <input type={type} step={step} value={value} onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={{
        ...body, fontSize: '15px', color: '#0F1523',
        padding: '9px 14px', borderRadius: '8px',
        border: '1.5px solid rgba(76,107,69,0.35)',
        background: '#FFFFFF', outline: 'none', width: '100%',
        ...style,
      }}
    />
  )
}

function Select({ value, onChange, options, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        ...body, fontSize: '15px', color: '#0F1523',
        padding: '9px 14px', borderRadius: '8px',
        border: '1.5px solid rgba(76,107,69,0.35)',
        background: '#FFFFFF', outline: 'none', ...style,
      }}>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  )
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: '#FFFFFF', border: '1.5px solid rgba(76,107,69,0.20)',
      borderRadius: '14px', padding: '20px 22px', marginBottom: '10px',
      ...(onClick ? { cursor: 'pointer' } : null),
      ...style,
    }}>
      {children}
    </div>
  )
}

function Badge({ label, color = gold }) {
  return (
    <span style={{
      ...sc, fontSize: '15px', letterSpacing: '0.12em',
      padding: '3px 9px', borderRadius: '40px',
      border: `1px solid ${color}40`, color,
      background: `${color}12`,
    }}>
      {label}
    </span>
  )
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: '#3c5637', color: '#FAFAF7',
      ...body, fontSize: '17px',
      padding: '12px 20px', borderRadius: '10px',
      boxShadow: '0 8px 28px rgba(15,21,35,0.3)',
    }}>
      {message}
    </div>
  )
}

// ── HorizonFloor admission modal ──────────────────────────────
// Wraps HorizonFloorAdmissionCheck in a modal overlay for use
// inside the admin save flows.

function HorizonFloorModal({ domainSlug, contextLabel, onResolve, onCancel }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel?.() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(15,21,35,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: '#FAFAF7', borderRadius: '14px',
        border: '1px solid rgba(76,107,69,0.25)',
        width: 'min(560px, 100%)', maxHeight: '82vh',
        overflowY: 'auto', padding: '32px',
        boxShadow: '0 24px 64px rgba(15,21,35,0.28)',
      }}>
        <HorizonFloorAdmissionCheck
          domainSlug={domainSlug}
          contextLabel={contextLabel}
          onResolve={onResolve}
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}

// ── PRISM TAB ─────────────────────────────────────────────────
// Founder lab — three practices under evaluation (July 2026),
// adapted from the Prismology reference material. Lives at
// /admin/prism as its own page; this tab is the doorway.

function PrismTab() {
  const items = [
    ['Mirror Work', 'Front camera as mirror, your I Am statements overlaid, optional resonance tone. Candidate Voice-beat upgrade · and graduated camera work.'],
    ['Write & Burn', 'Evening evacuation. Nothing persists: no database, no device storage. Candidate complement to the Journal.'],
    ['Geometry', 'Guided sacred-form tracing with quiet recognition · twenty-eight forms, Vesica Piscis to the Icosahedron in the Flower. Pencil-friendly. Candidate onboarding / deepening material.'],
  ]
  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ ...body, fontSize: '15px', lineHeight: 1.65, color: 'rgba(15,21,35,0.60)', marginBottom: '24px' }}>
        Hidden practices under evaluation. Not linked anywhere public; founder-gated.
      </p>
      {items.map(([t, d]) => (
        <div key={t} style={{ padding: '14px 0', borderBottom: '1px solid rgba(15,21,35,0.08)' }}>
          <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.12em', color: gold }}>{t}</div>
          <div style={{ ...body, fontSize: '14px', lineHeight: 1.6, color: 'rgba(15,21,35,0.55)', marginTop: '4px' }}>{d}</div>
        </div>
      ))}
      <Link to="/admin/prism" style={{
        ...sc, display: 'inline-block', marginTop: '24px', fontSize: '15px',
        letterSpacing: '0.12em', color: gold, textDecoration: 'none',
        borderBottom: `1px solid ${gold}`, paddingBottom: '2px',
      }}>
        Open the Prism Lab →
      </Link>
    </div>
  )
}

// ── Tab navigation ────────────────────────────────────────────

const TABS = ['Now', 'Platform', 'Actors', 'Add', 'Seed', 'Place', 'Flags', 'Moments', 'Chains', 'Practices', 'Prism', 'Floor', 'Domain Data', 'Indicators', 'Subdomains', 'Needs', 'Contributions', 'Waitlist', 'Resources', 'Groups', 'Members', 'Entitlements', 'Users', 'Grants']

function TabBar({ active, setActive }) {
  return (
    <div style={{
      display: 'flex', gap: '4px', marginBottom: '32px',
      borderBottom: '1px solid rgba(76,107,69,0.20)', paddingBottom: '0',
      overflowX: 'auto',
    }}>
      {TABS.map(tab => (
        <button key={tab} onClick={() => setActive(tab)} style={{
          ...sc, fontSize: '15px', letterSpacing: '0.12em',
          padding: '10px 18px', background: 'none', border: 'none',
          cursor: 'pointer', whiteSpace: 'nowrap',
          color: active === tab ? gold : 'rgba(15,21,35,0.55)',
          borderBottom: active === tab
            ? `2px solid ${gold}` : '2px solid transparent',
          marginBottom: '-1px',
        }}>
          {tab}
        </button>
      ))}
    </div>
  )
}

// ── NOW TAB ───────────────────────────────────────────────────
// Preserved from original

function NowTab({ onNavigate }) {
  const navigate              = useNavigate()
  const [stats, setStats]     = useState(null)
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Aggregate tool-usage counts come from the founder-gated server
        // endpoint (service role, outside RLS) — counting these tables in
        // the browser only ever saw the founder's OWN rows, because the
        // personal-tool tables are correctly RLS-locked per user. The
        // endpoint returns integers only; no row content crosses the wire.
        let token = null
        try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}

        const [statsRes, { data: recentUsers }] = await Promise.all([
          fetch('/api/admin-stats', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then(r => r.json()).catch(() => null),
          supabase.from('users').select('id, email, first_name, last_name, created_at, status')
            .order('created_at', { ascending: false }).limit(500),
        ])

        const s = statsRes?.stats || {}
        setStats({
          totalUsers:  s.users          ?? null,
          mapCount:    s.maps_complete  ?? null,
          ppCount:     s.purpose_pieces ?? null,
          sprintCount: s.active_sprints ?? null,
        })
        setRecent(recentUsers ?? [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>Loading...</p>

  const visible = showAll ? recent : recent.slice(0, 8)

  return (
    <div>
      <h2 style={{ ...body, fontSize: '22px', fontWeight: 400, color: '#0F1523', marginBottom: '28px' }}>
        Live snapshot
      </h2>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '36px' }}>
          {[
            { label: 'Users', value: stats.totalUsers, tab: 'Users' },
            { label: 'Map sessions', value: stats.mapCount },
            { label: 'Purpose Piece', value: stats.ppCount },
            { label: 'Active sprints', value: stats.sprintCount },
          ].map(s => (
            <Card key={s.label} onClick={s.tab && onNavigate ? () => onNavigate(s.tab) : undefined}
              style={{ textAlign: 'center', padding: '18px 12px' }}>
              <div style={{ ...body, fontSize: '32px', fontWeight: 400, color: '#0F1523', lineHeight: 1 }}>{s.value ?? '–'}</div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginTop: '6px' }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
        <Eyebrow>{showAll ? 'All signups' : 'Recent signups'}</Eyebrow>
        {recent.length > 8 && (
          <Btn small variant="ghost" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show recent only' : `See all (${recent.length})`}
          </Btn>
        )}
      </div>

      {visible.map(u => (
        <Card key={u.id} onClick={() => navigate(`/profile/${u.id}`)} style={{ padding: '12px 16px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>
              {u.email}
              {u.first_name && <span style={{ color: 'rgba(15,21,35,0.55)', marginLeft: '8px' }}>{u.first_name} {u.last_name}</span>}
            </span>
            <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{u.created_at?.slice(0, 10)}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── PLATFORM TAB ─────────────────────────────────────────────
// Preserved from original

function PlatformTab({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: totalActors }, { count: claimedActors }, { count: openNeeds },
        { count: pendingClaims }, { count: totalContribs }, { count: waitlistCount },
        { data: domainCounts }, { data: zeroActorDomains },
      ] = await Promise.all([
        supabase.from('nextus_actors').select('*', { count: 'exact', head: true }),
        supabase.from('nextus_actors').select('*', { count: 'exact', head: true }).not('profile_owner', 'is', null),
        supabase.from('nextus_needs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('claim_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('nextus_contributions').select('*', { count: 'exact', head: true }),
        supabase.from('nextus_waitlist').select('*', { count: 'exact', head: true }),
        supabase.from('nextus_domains').select('id, name, total_actors, gap_score, gap_signal, data_status').order('gap_score'),
        supabase.from('nextus_domains').select('id, name, total_actors').eq('total_actors', 0),
      ])
      setStats({ totalActors, claimedActors, openNeeds, pendingClaims, totalContribs, waitlistCount, domainCounts, zeroActorDomains })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>

  const statCards = [
    { label: 'Total Actors',  value: stats.totalActors,   tab: 'Actors' },
    { label: 'Claimed',       value: stats.claimedActors, tab: 'Actors' },
    { label: 'Open Needs',    value: stats.openNeeds,     tab: 'Needs' },
    { label: 'Pending Claims',value: stats.pendingClaims, tab: 'Flags' },
    { label: 'Contributions', value: stats.totalContribs, tab: 'Contributions' },
    { label: 'Waitlist',      value: stats.waitlistCount, tab: 'Waitlist' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {statCards.map(s => (
          <Card key={s.label} onClick={s.tab && onNavigate ? () => onNavigate(s.tab) : undefined}
            style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ ...body, fontSize: '32px', fontWeight: 400, color: '#0F1523', lineHeight: 1 }}>{s.value ?? 0}</div>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginTop: '6px' }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Eyebrow>Domains</Eyebrow>
      <div style={{ marginBottom: '32px' }}>
        {(stats.domainCounts || []).map(d => {
          const hasScore      = d.gap_score != null
          const isVerified    = d.data_status === 'verified'
          const sufficient    = (d.total_actors || 0) >= 10
          const showScore     = hasScore && isVerified && sufficient
          const showIllustrative = hasScore && !isVerified
          return (
            <Card key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', flexWrap: 'wrap' }}>
              <div style={{ ...body, fontSize: '16px', color: '#0F1523', width: '160px', flexShrink: 0 }}>{d.name}</div>
              <div style={{ flex: 1, height: '6px', background: 'rgba(76,107,69,0.12)', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                {showScore && (
                  <div style={{ height: '100%', width: `${(d.gap_score / 10) * 100}%`,
                    background: d.gap_score < 4 ? '#8A3030' : d.gap_score < 6 ? '#8A7030' : '#2A6B3A',
                    borderRadius: '3px' }} />
                )}
              </div>
              <div style={{ width: '160px', textAlign: 'right', flexShrink: 0 }}>
                {showScore ? (
                  <div>
                    <span style={{ ...sc, fontSize: '14px', color: gold }}>{d.gap_score}/10</span>
                    <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>
                      Verified · {d.total_actors} actors
                    </div>
                  </div>
                ) : showIllustrative ? (
                  <div>
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)' }}>
                      Illustrative
                    </span>
                    <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>
                      {d.total_actors || 0} actor{(d.total_actors || 0) !== 1 ? 's' : ''} · not yet verified
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)' }}>
                      Insufficient data
                    </span>
                    <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>
                      {d.total_actors || 0} actor{(d.total_actors || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
              {d.gap_signal && <Badge label="gap" color="#8A3030" />}
              {isVerified && sufficient && <Badge label="verified" color="#2A6B3A" />}
            </Card>
          )
        })}
      </div>
      {stats.pendingClaims > 0 && (
        <Card style={{ borderColor: 'rgba(76,107,69,0.60)', background: 'rgba(76,107,69,0.04)' }}>
          <span style={{ ...body, fontSize: '16px', color: '#0F1523' }}>{stats.pendingClaims} claim{stats.pendingClaims !== 1 ? 's' : ''} awaiting review</span>
        </Card>
      )}
      {(stats.zeroActorDomains || []).length > 0 && (
        <Card style={{ borderColor: 'rgba(138,48,48,0.40)', background: 'rgba(138,48,48,0.03)' }}>
          <span style={{ ...body, fontSize: '16px', color: '#0F1523' }}>Empty domains: {stats.zeroActorDomains.map(d => d.name).join(', ')}</span>
        </Card>
      )}
    </div>
  )
}

// ── ACTORS TAB ───────────────────────────────────────────────
// Beta change: HorizonFloorAdmissionCheck added to save flow.
// Writes horizon_floor_status to actor on save.

const EMPTY_ACTOR_FORM = {
  name: '', type: 'organisation', domain_id: '', subdomain_id: '',
  // four-dim arrays (beta additions)
  domains: [], subdomains: [], fields: [], lenses: [], problem_chains: [],
  platform_principles: [],
  scale: 'national', location_name: '', lat: '', lng: '', website: '',
  description: '', impact_summary: '', reach: '',
  alignment_score: '', winning: false, is_platform_founder: false, data_source: '',
}


// ── Manual actor linker ───────────────────────────────────────
// Link any two existing actors by hand (e.g. NextUs and Nik Wood). Mirrors the
// batch auto-link: parent_child sets the child's parent_id; member_of / partner
// write a confirmed nextus_relationships row. Existing links are listed with an
// unlink control.
function ActorLinker({ toast }) {
  const { user } = useAuth()
  const [actors, setActors] = useState([])
  const [links, setLinks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [fromId, setFromId]   = useState('')
  const [relType, setRelType] = useState('member_of')
  const [toId, setToId]       = useState('')

  async function load() {
    setLoading(true)
    const [{ data: acts }, { data: rels }] = await Promise.all([
      supabase.from('nextus_actors').select('id, name, type, parent_id').order('name').limit(1000),
      supabase.from('nextus_relationships').select('id, actor_id, related_actor_id, relationship_type, status').order('created_at', { ascending: false }).limit(500),
    ])
    const list = acts || []
    const byId = Object.fromEntries(list.map(a => [a.id, a]))
    const parentLinks = list.filter(a => a.parent_id).map(a => ({
      kind: 'parent', key: `p-${a.id}`, fromId: a.id, toId: a.parent_id,
      fromName: a.name, toName: byId[a.parent_id]?.name || '(missing)', type: 'parent_child',
    }))
    const relLinks = (rels || []).map(r => ({
      kind: 'rel', key: r.id, id: r.id, fromId: r.actor_id, toId: r.related_actor_id,
      fromName: byId[r.actor_id]?.name || '(missing)', toName: byId[r.related_actor_id]?.name || '(missing)',
      type: r.relationship_type,
    }))
    setActors(list)
    setLinks([...parentLinks, ...relLinks])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createLink() {
    if (!fromId || !toId) { toast('Pick both actors'); return }
    if (fromId === toId)  { toast('Pick two different actors'); return }
    setSaving(true)
    let error
    if (relType === 'parent_child') {
      ({ error } = await supabase.from('nextus_actors').update({ parent_id: toId }).eq('id', fromId))
    } else {
      ({ error } = await supabase.from('nextus_relationships').insert({
        actor_id: fromId, related_actor_id: toId, relationship_type: relType,
        status: 'confirmed', initiated_by: user?.id || null, confirmed_by: user?.id || null,
        confirmed_at: new Date().toISOString(),
      }))
    }
    setSaving(false)
    if (error) { console.error('link failed', error); toast(`Could not link: ${error.message}`); return }
    toast('Linked')
    setFromId(''); setToId('')
    load()
  }

  async function unlink(link) {
    if (!window.confirm(`Remove the link "${link.fromName} ${REL_PHRASE[link.type] || link.type} ${link.toName}"?`)) return
    let error
    if (link.kind === 'parent') {
      ({ error } = await supabase.from('nextus_actors').update({ parent_id: null }).eq('id', link.fromId))
    } else {
      ({ error } = await supabase.from('nextus_relationships').delete().eq('id', link.id))
    }
    if (error) { toast(`Could not unlink: ${error.message}`); return }
    toast('Unlinked')
    load()
  }

  const actorOpts = [{ value: '', label: '— Select actor —' },
    ...actors.map(a => ({ value: a.id, label: a.type ? `${a.name} · ${a.type}` : a.name }))]
  const relOpts = [
    { value: 'parent_child', label: 'is part of' },
    { value: 'member_of',    label: 'is a member of' },
    { value: 'partner',      label: 'is a partner of' },
  ]

  return (
    <div>
      <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '20px', lineHeight: 1.6, maxWidth: '560px' }}>
        Link any two actors that already exist on the map. The first actor is the one the relationship belongs to (the child, the member, the partner).
      </p>

      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxWidth: '520px' }}>
          <Select value={fromId}  onChange={setFromId}  options={actorOpts} />
          <Select value={relType} onChange={setRelType} options={relOpts} />
          <Select value={toId}    onChange={setToId}    options={actorOpts} />
          <div>
            <Btn small onClick={createLink} disabled={saving || !fromId || !toId}>
              {saving ? 'Linking…' : 'Create link'}
            </Btn>
          </div>
        </div>
      </Card>

      <Eyebrow>Existing links</Eyebrow>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && links.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No links yet.</p>}
      {links.map(l => (
        <Card key={l.key} style={{ padding: '10px 16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>
              {l.fromName} <span style={{ color: 'rgba(15,21,35,0.55)' }}>{REL_PHRASE[l.type] || l.type}</span> {l.toName}
            </span>
            <Btn small variant="ghost" onClick={() => unlink(l)}>Unlink</Btn>
          </div>
        </Card>
      ))}
    </div>
  )
}

const REL_PHRASE = { parent_child: 'is part of', member_of: 'is a member of', partner: 'is a partner of' }

function ActorsTab({ toast }) {
  const [actors, setActors]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [filterDomain, setFilterDomain] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [filterClaimed, setFilterClaimed] = useState('')
  const [filterWinning, setFilterWinning] = useState('')
  const [search, setSearch]     = useState('')
  const [total, setTotal]       = useState(0)
  const [mode, setMode]         = useState('browse')
  const [form, setForm]         = useState(EMPTY_ACTOR_FORM)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [actorDomains, setActorDomains] = useState([])

  // HorizonFloor modal state
  const [floorPending, setFloorPending] = useState(null) // { payload, savedId }

  const subdomainOptions = form.domain_id
    ? [['', '-- none --'], ...(SUBDOMAIN_MAP[form.domain_id] || [])].map(([v, l]) => ({ value: v, label: l }))
    : [{ value: '', label: 'Select domain first' }]

  async function fetchActors() {
    setLoading(true)
    let q = supabase.from('nextus_actors').select('*', { count: 'exact' })
    if (filterDomain)  q = q.eq('domain_id', filterDomain)
    if (filterType)    q = q.eq('type', filterType)
    if (filterClaimed === 'claimed')    q = q.eq('claimed', true)
    if (filterClaimed === 'unclaimed')  q = q.eq('claimed', false)
    if (filterWinning === 'winning')    q = q.eq('winning', true)
    if (filterWinning === 'underloved') q = q.eq('winning', false)
    if (search) q = q.ilike('name', `%${search}%`)
    q = q.order('name').limit(50)
    const { data, count } = await q
    setActors(data || [])
    setTotal(count || 0)
    setLoading(false)
  }


  useEffect(() => { fetchActors() }, [filterDomain, filterType, filterClaimed, filterWinning])

  function setFormField(field, value) {
    setForm(f => { const next = { ...f, [field]: value }; if (field === 'domain_id') next.subdomain_id = ''; return next })
  }

  async function startEdit(actor) {
    setForm({
      name: actor.name || '', type: actor.type || 'organisation',
      domain_id: actor.domain_id || '', subdomain_id: actor.subdomain_id || '',
      domains: actor.domains || [], subdomains: actor.subdomains || [],
      fields: actor.fields || [], lenses: actor.lenses || [],
      problem_chains: actor.problem_chains || [],
      platform_principles: actor.platform_principles || [],
      scale: actor.scale || 'national', location_name: actor.location_name || '',
      lat: actor.lat ?? '', lng: actor.lng ?? '',
      website: actor.website || '', description: actor.description || '',
      impact_summary: actor.impact_summary || '', reach: actor.reach || '',
      alignment_score: actor.alignment_score ?? '', winning: actor.winning || false,
      is_platform_founder: actor.is_platform_founder || false,
      data_source: actor.data_source || '',
    })
    setEditId(actor.id)
    const { data } = await supabase.from('nextus_actor_domains')
      .select('*').eq('actor_id', actor.id).order('is_primary', { ascending: false })
    setActorDomains(data || [])
    setMode('edit')
  }

  // Save actor — initiates HorizonFloor check before final write
  async function saveActor() {
    if (!form.name.trim()) { toast('Name is required'); return }
    setSaving(true)

    const primaryDomain = form.domains?.[0] || form.domain_id || null

    const payload = {
      name: form.name.trim(),
      type: form.type || 'organisation',
      // Legacy single-value fields (backcompat)
      domain_id: primaryDomain,
      subdomain_id: form.subdomain_id || null,
      // Four-dimensional placement (beta additions)
      domains: form.domains?.length ? form.domains : (primaryDomain ? [primaryDomain] : []),
      subdomains: form.subdomains || [],
      fields: form.fields || [],
      lenses: form.lenses || [],
      problem_chains: form.problem_chains || [],
      platform_principles: form.platform_principles || [],
      scale: form.scale || null,
      location_name: form.location_name?.trim() || null,
      lat: form.lat !== '' ? parseFloat(form.lat) : null,
      lng: form.lng !== '' ? parseFloat(form.lng) : null,
      website: form.website?.trim() || null,
      description: form.description?.trim() || null,
      impact_summary: form.impact_summary?.trim() || null,
      reach: form.reach?.trim() || null,
      alignment_score: form.alignment_score !== '' ? parseFloat(form.alignment_score) : null,
      winning: form.winning || false,
      is_platform_founder: form.is_platform_founder || false,
      data_source: form.data_source?.trim() || null,
    }

    setSaving(false)
    // Show HorizonFloor check before writing
    setFloorPending({ payload, actorDomains })
  }

  async function commitSave(payload, floorStatus, reason) {
    setSaving(true)
    const fullPayload = {
      ...payload,
      horizon_floor_status: floorStatus,
    }
    let savedId = editId
    if (mode === 'edit') {
      const { error } = await supabase.from('nextus_actors').update(fullPayload).eq('id', editId)
      if (error) { setSaving(false); toast('Error: ' + error.message); setFloorPending(null); return }
    } else {
      const { data, error } = await supabase.from('nextus_actors').insert(fullPayload).select('id').single()
      if (error) { setSaving(false); toast('Error: ' + error.message); setFloorPending(null); return }
      savedId = data.id
    }
    if (savedId && actorDomains.length > 0) {
      await supabase.from('nextus_actor_domains').delete().eq('actor_id', savedId)
      const domainRows = actorDomains.map(d => ({
        actor_id: savedId,
        domain_id: d.domain_id,
        subdomain_id: d.subdomain_id || null,
        is_primary: d.is_primary || false,
        alignment_score: d.alignment_score || null,
      }))
      await supabase.from('nextus_actor_domains').insert(domainRows)
    }
    setSaving(false)
    setFloorPending(null)
    toast(mode === 'edit' ? 'Actor updated' : 'Actor added')
    setForm(EMPTY_ACTOR_FORM); setActorDomains([]); setEditId(null); setMode('browse'); fetchActors()
  }

  async function deleteActor(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    // .select('id') makes the delete return the rows it removed — without it,
    // an RLS-blocked delete matches zero rows and reports success, which is
    // how this button spent months toasting "Deleted" over surviving rows.
    const { data: gone, error } = await supabase
      .from('nextus_actors').delete().eq('id', id).select('id')
    if (error) {
      toast(`Delete failed: ${error.message}`)
      return
    }
    if (!gone?.length) {
      toast('Delete blocked — no rows removed. If this actor is claimed, it cannot be deleted from the console; if unclaimed, check that migration 162 has been run.')
      return
    }
    toast('Deleted'); fetchActors()
  }

  async function toggleWinning(actor) {
    await supabase.from('nextus_actors').update({ winning: !actor.winning }).eq('id', actor.id)
    fetchActors()
  }

  async function toggleFounderBadge(actor) {
    const next = !actor.is_platform_founder
    const verb = next ? 'GRANT' : 'REVOKE'
    if (!window.confirm(`${verb} the "Founder of NextUs" badge for ${actor.name}?`)) return
    await supabase.from('nextus_actors')
      .update({ is_platform_founder: next })
      .eq('id', actor.id)
    toast(next ? 'Founder badge granted' : 'Founder badge revoked')
    fetchActors()
  }


  const domainLabel = id => DOMAIN_LIST.find(d => d.value === id)?.label || id

  return (
    <div>
      {/* HorizonFloor modal */}
      {floorPending && (
        <HorizonFloorModal
          domainSlug={floorPending.payload.domain_id || 'nature'}
          contextLabel="this actor"
          onResolve={async ({ status, reason }) => {
            await commitSave(floorPending.payload, status, reason)
          }}
          onCancel={() => setFloorPending(null)}
        />
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {['browse', 'add', 'links'].map(m => (
          <Btn key={m} onClick={() => { setMode(m); if (m === 'add') setForm(EMPTY_ACTOR_FORM) }}
            variant={mode === m || (mode === 'edit' && m === 'add') ? 'primary' : 'ghost'} small>
            {m === 'browse' ? `Browse (${total})`
              : m === 'add' ? '+ Add Actor'
              : 'Links'}
          </Btn>
        ))}
      </div>

      {mode === 'browse' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <Input value={search} onChange={setSearch} placeholder="Search by name..." onKeyDown={e => e.key === 'Enter' && fetchActors()} />
            <Select value={filterDomain} onChange={setFilterDomain} options={DOMAINS_WITH_EMPTY} />
            <Select value={filterType} onChange={setFilterType} options={[{ value: '', label: 'All types' }, ...ACTOR_TYPES.map(t => ({ value: t, label: t }))]} />
            <Select value={filterClaimed} onChange={setFilterClaimed} options={[{ value: '', label: 'Claimed / unclaimed' }, { value: 'claimed', label: 'Claimed' }, { value: 'unclaimed', label: 'Unclaimed' }]} />
            <Select value={filterWinning} onChange={setFilterWinning} options={[{ value: '', label: 'All actors' }, { value: 'winning', label: 'Winning' }, { value: 'underloved', label: 'Underloved' }]} />
            <Btn onClick={fetchActors} small>Search</Btn>
          </div>

          {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
          {!loading && actors.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No actors found.</p>}

          {actors.map(a => (
            <Card key={a.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ ...body, fontSize: '17px', color: '#0F1523', fontWeight: 400 }}>{a.name}</span>
                    <Badge label={a.type || 'org'} />
                    {a.winning && <Badge label="winning" color="#2A6B3A" />}
                    {a.is_platform_founder && <Badge label="founder" color="#262420" />}
                    {a.horizon_floor_status === 'flagged_for_review' && (
                      <Badge label="floor review" color="#8A3030" />
                    )}
                  </div>
                  {/* Four-dim placement preview */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                    {(a.domains || [a.domain_id]).filter(Boolean).map((d, i) => (
                      <span key={d} style={{
                        ...sc, fontSize: '13px', letterSpacing: '0.08em',
                        color: i === 0 ? gold : 'rgba(15,21,35,0.55)',
                        background: i === 0 ? 'rgba(76,107,69,0.08)' : 'rgba(15,21,35,0.04)',
                        border: `1px solid ${i === 0 ? 'rgba(76,107,69,0.35)' : 'rgba(15,21,35,0.15)'}`,
                        borderRadius: '40px', padding: '1px 8px',
                      }}>
                        {domainLabel(d)}{i === 0 ? ' (primary)' : ''}
                      </span>
                    ))}
                  </div>
                  {a.location_name && <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{a.location_name}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <Btn small onClick={() => startEdit(a)}>Edit</Btn>
                  <Btn small variant="ghost" onClick={() => window.open(`/org/${a.slug || a.id}`, '_blank', 'noopener')}>
                    Preview
                  </Btn>
                  {!a.profile_owner && (
                    <Btn small variant="ghost" onClick={() => window.open(`/org/${a.slug || a.id}/manage`, '_blank', 'noopener')}>
                      Manage
                    </Btn>
                  )}
                  <Btn small variant="ghost" onClick={() => toggleWinning(a)}>
                    {a.winning ? 'Un-win' : 'Win'}
                  </Btn>
                  <Btn small variant="danger" onClick={() => deleteActor(a.id, a.name)}>Delete</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {mode === 'links' && <ActorLinker toast={toast} />}

      {(mode === 'add' || mode === 'edit') && (
        <div style={{ maxWidth: '640px' }}>
          <h3 style={{ ...body, fontSize: '20px', fontWeight: 400, color: '#0F1523', marginBottom: '24px' }}>
            {mode === 'edit' ? 'Edit actor' : 'Add actor'}
          </h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Name *</label>
              <Input value={form.name} onChange={v => setFormField('name', v)} placeholder="Actor name" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Type</label>
                <Select value={form.type} onChange={v => setFormField('type', v)}
                  options={ACTOR_TYPES.map(t => ({ value: t, label: t }))} />
              </div>
              <div>
                <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Scale</label>
                <Select value={form.scale || ''} onChange={v => setFormField('scale', v)}
                  options={[{ value: '', label: '-- Select --' }, ...SCALE_OPTIONS.map(s => ({ value: s, label: s }))]} />
              </div>
            </div>

            {/* Four-dim: Primary domain (legacy + array) */}
            <div>
              <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Primary domain *</label>
              <Select value={form.domain_id || ''} onChange={v => {
                setFormField('domain_id', v)
                // Also write as domains[0]
                setForm(f => ({
                  ...f,
                  domain_id: v,
                  domains: v ? [v, ...(f.domains || []).filter(d => d !== v).slice(0, 5)] : f.domains,
                }))
              }}
                options={[{ value: '', label: '-- Select domain --' }, ...DOMAIN_LIST]} />
            </div>

            {/* Four-dim: Secondary domains */}
            <div>
              <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Secondary domains</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {DOMAIN_LIST.map(d => {
                  if (d.value === form.domain_id) return null
                  const isOn = (form.domains || []).includes(d.value)
                  return (
                    <button key={d.value} type="button"
                      onClick={() => {
                        const curr = form.domains || []
                        const next = isOn ? curr.filter(x => x !== d.value) : [...curr, d.value]
                        setFormField('domains', next)
                      }}
                      style={{
                        ...sc, fontSize: '13px', letterSpacing: '0.06em',
                        padding: '4px 10px', borderRadius: '40px', cursor: 'pointer',
                        color: isOn ? gold : 'rgba(15,21,35,0.72)',
                        background: isOn ? 'rgba(76,107,69,0.08)' : '#FFFFFF',
                        border: isOn ? '1px solid rgba(76,107,69,0.55)' : '1px solid rgba(76,107,69,0.25)',
                      }}>
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Four-dim: Platform principles */}
            <div>
              <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Platform principles engaged</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PRINCIPLES_ORDERED.map(p => {
                  const isOn = (form.platform_principles || []).includes(p.slug)
                  return (
                    <button key={p.slug} type="button"
                      onClick={() => {
                        const curr = form.platform_principles || []
                        setFormField('platform_principles', isOn ? curr.filter(x => x !== p.slug) : [...curr, p.slug])
                      }}
                      style={{
                        ...sc, fontSize: '13px', letterSpacing: '0.06em',
                        padding: '4px 10px', borderRadius: '40px', cursor: 'pointer',
                        color: isOn ? gold : 'rgba(15,21,35,0.72)',
                        background: isOn ? 'rgba(76,107,69,0.08)' : '#FFFFFF',
                        border: isOn ? '1px solid rgba(76,107,69,0.55)' : '1px solid rgba(76,107,69,0.25)',
                      }}>
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Alignment score (0–10)</label>
              <Input value={form.alignment_score} onChange={v => setFormField('alignment_score', v)} type="number" step="0.5" placeholder="0–10" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Location</label>
                <Input value={form.location_name} onChange={v => setFormField('location_name', v)} placeholder="City, Country" />
              </div>
              <div>
                <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Website</label>
                <Input value={form.website} onChange={v => setFormField('website', v)} placeholder="https://..." />
              </div>
            </div>

            <div>
              <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Description</label>
              <textarea value={form.description} onChange={e => setFormField('description', e.target.value)} rows={3}
                style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px', borderRadius: '8px',
                  border: '1.5px solid rgba(76,107,69,0.35)', background: '#FFFFFF', outline: 'none',
                  width: '100%', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.is_platform_founder}
                onChange={e => setFormField('is_platform_founder', e.target.checked)}
                style={{ width: '17px', height: '17px', accentColor: '#4c6b45', cursor: 'pointer' }} />
              <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.78)' }}>
                Founder of NextUs badge
              </span>
            </label>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Btn onClick={saveActor} disabled={saving}>
                {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Save actor'}
              </Btn>
              <Btn variant="ghost" onClick={() => { setMode('browse'); setForm(EMPTY_ACTOR_FORM); setEditId(null) }}>
                Cancel
              </Btn>
              <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
                Horizon Floor check runs before save.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ── EXTRACT TAB (four-dim) ───────────────────────────────────
// Beta change: ProposalCard updated to show domains[], subdomains[],
// fields[], lenses[], problem_chains[], platform_principles[].
// Primary-first ordering is visible (first entry labelled "primary").
// Save payload writes four-dim columns.
// HorizonFloorAdmissionCheck fires before final write.

function ExTierBadge({ tier }) {
  const c = TIER_CFG[tier]; if (!c) return null
  return (
    <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px', letterSpacing:'0.12em',
      padding:'3px 10px', borderRadius:'40px', border:`1px solid ${c.border}`, color:c.color, background:c.bg }}>
      {c.label}
    </span>
  )
}

function ExLabelBadge({ label }) {
  const c = LABEL_COLORS[label] || LABEL_COLORS.Planet
  return (
    <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px', letterSpacing:'0.14em',
      padding:'4px 12px', borderRadius:'40px', border:`1px solid ${c.border}`, color:c.color, background:c.bg }}>
      {label}
    </span>
  )
}

function ExPill({ label, variant = 'green' }) {
  const cols = {
    green: { color:'#2A6B3A', bg:'rgba(42,107,58,0.08)', border:'rgba(42,107,58,0.25)' },
    amber: { color:'#8A6020', bg:'rgba(76,107,69,0.08)', border:'rgba(76,107,69,0.20)' },
    blue:  { color:'#2A4A8A', bg:'rgba(42,74,138,0.08)', border:'rgba(42,74,138,0.25)' },
  }
  const c = cols[variant] || cols.green
  return (
    <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px', letterSpacing:'0.10em',
      padding:'2px 9px', borderRadius:'40px', border:`1px solid ${c.border}`,
      color:c.color, background:c.bg, display:'inline-block', margin:'2px' }}>
      {label}
    </span>
  )
}

// Four-dim array pills — primary first, secondary/tertiary dimmed
function DimPills({ label, values = [], color = gold }) {
  if (!values || values.length === 0) return null
  return (
    <div style={{ marginBottom: '6px' }}>
      <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px', letterSpacing:'0.16em',
        color: 'rgba(15,21,35,0.55)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div>
        {values.map((v, i) => (
          <span key={v} style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px', letterSpacing:'0.08em',
            padding:'2px 8px', borderRadius:'40px', margin:'2px', display:'inline-block',
            color: i === 0 ? color : 'rgba(15,21,35,0.55)',
            background: i === 0 ? `${color}14` : 'rgba(15,21,35,0.04)',
            border: `1px solid ${i === 0 ? color + '40' : 'rgba(15,21,35,0.15)'}`,
          }}>
            {v}{i === 0 ? ' (primary)' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function ProposalCard({ proposal, index, checked, onToggle, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const score = parseFloat(proposal.alignment_score)

  // Normalise four-dim arrays. API may return old single-value domain_id only.
  const domains    = proposal.domains?.length     ? proposal.domains    : (proposal.domain_id ? [proposal.domain_id] : [])
  const subdomains = proposal.subdomains          || []
  const fields     = proposal.fields              || []
  const lenses     = proposal.lenses              || []
  const problems   = proposal.problem_chains      || []
  const principles = proposal.platform_principles || []

  function domainOptions() {
    const blank = [{ value:'', label:'-- Select domain --' }]
    if (proposal.track === 'self')   return [...blank, ...SELF_DOMAINS_EX]
    if (proposal.track === 'planet') return [...blank, ...PLANET_DOMAINS_EX]
    return [...blank,
      { value:'', label:'-- Planet --', disabled:true }, ...PLANET_DOMAINS_EX,
      { value:'', label:'-- Self --',   disabled:true }, ...SELF_DOMAINS_EX,
    ]
  }

  function set(k, v) { onChange(index, k, v) }

  function handleScoreChange(v) {
    set('alignment_score', v)
    const n = parseFloat(v)
    if (!isNaN(n)) set('placement_tier', TIER_FROM_SCORE(n))
  }

  return (
    <div style={{
      background: checked ? '#FFFFFF' : 'rgba(15,21,35,0.03)',
      border: checked ? '1.5px solid rgba(76,107,69,0.40)' : '1.5px solid rgba(15,21,35,0.12)',
      borderRadius: '14px', marginBottom: '16px',
      opacity: checked ? 1 : 0.6,
      transition: 'all 0.15s',
    }}>

      {/* Card header */}
      <div style={{ padding: '18px 20px', display:'flex', alignItems:'flex-start', gap:'14px' }}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(index)}
          style={{ width:'18px', height:'18px', accentColor:'#4c6b45', marginTop:'3px', flexShrink:0, cursor:'pointer' }} />

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
            <ExLabelBadge label={proposal.label} />
            <ExTierBadge tier={proposal.placement_tier} />
            {proposal._duplicate && (
              <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.10em', textTransform:'uppercase', color:'#8A6020',
                background:'rgba(76,107,69,0.10)', border:'1px solid rgba(76,107,69,0.40)',
                borderRadius:'40px', padding:'2px 10px' }}>
                Already on the map
              </span>
            )}
            <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.10em', color:'rgba(15,21,35,0.55)' }}>
              {proposal.confidence}% confidence
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', marginBottom:'8px' }}>
            {/* Logo / image being placed — so it's reviewable, not approved blind */}
            <div style={{ flexShrink:0, width:'56px', height:'56px', borderRadius:'8px',
              border:'1px solid rgba(76,107,69,0.30)', background:'#FFFFFF',
              overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {proposal.image_url
                ? <img src={proposal.image_url} alt=""
                    style={{ width:'100%', height:'100%', objectFit:'contain' }}
                    onError={e => { e.currentTarget.style.display = 'none'
                      e.currentTarget.parentNode.dataset.broken = '1' }} />
                : <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                    letterSpacing:'0.10em', color:'rgba(15,21,35,0.55)', textAlign:'center' }}>NO IMAGE</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'19px', fontWeight: 400,
                color:'#0F1523' }}>
                {proposal.name}
              </div>
              {proposal.tagline && (
                <div style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'14px',
                  color:'rgba(15,21,35,0.70)', lineHeight:1.4, marginTop:'3px' }}>
                  {proposal.tagline}
                </div>
              )}
              {proposal.floor_check?.has_favicon_fallback && (
                <div style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                  letterSpacing:'0.10em', color:'#8A6020', marginTop:'4px' }}>
                  FAVICON FALLBACK · NO LOGO FOUND
                </div>
              )}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:'6px', marginBottom:'8px' }}>
            <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'40px',
              fontWeight:700, color:'#0F1523', lineHeight:1 }}>
              {proposal.alignment_score}
            </span>
            <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'14px',
              color:'rgba(15,21,35,0.55)' }}>/10</span>
          </div>

          {/* Description — the profile write-up being placed. This is the copy
             that should read like the actor's own site, not a review. */}
          {proposal.description && (
            <div style={{ marginBottom:'12px' }}>
              <p style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.14em', color:'rgba(15,21,35,0.55)', marginBottom:'5px',
                textTransform:'uppercase' }}>
                Profile
              </p>
              <p style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'15px',
                color:'#0F1523', lineHeight:1.65, margin:0 }}>
                {proposal.description}
              </p>
            </div>
          )}

          {/* Story — the longer narrative, shown so it's reviewable before placing */}
          {proposal.story && (
            <div style={{ marginBottom:'12px' }}>
              <p style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.14em', color:'rgba(15,21,35,0.55)', marginBottom:'5px',
                textTransform:'uppercase' }}>
                Story
              </p>
              {proposal.story.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map((para, i) => (
                <p key={i} style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'14px',
                  color:'rgba(15,21,35,0.72)', lineHeight:1.65, margin:'0 0 8px' }}>
                  {para}
                </p>
              ))}
            </div>
          )}

          {proposal.score_reasoning && (
            <div style={{ borderLeft:'2px solid rgba(15,21,35,0.14)', paddingLeft:'12px', marginBottom:'12px' }}>
              <p style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.14em', color:'rgba(15,21,35,0.55)', marginBottom:'4px',
                textTransform:'uppercase' }}>
                Why this score · internal
              </p>
              <p style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'13px',
                color:'rgba(15,21,35,0.55)', lineHeight:1.6, margin:0 }}>
                {proposal.score_reasoning}
              </p>
            </div>
          )}

          {/* Four-dimensional placement — primary-first display */}
          <div style={{ marginBottom: '10px' }}>
            <DimPills label="Domains"   values={domains}    color="#2A4A8A" />
            <DimPills label="Subdomains" values={subdomains} color="#2A6B3A" />
            {fields.length > 0 && <DimPills label="Fields"  values={fields}    color="rgba(15,21,35,0.55)" />}
            {lenses.length > 0 && <DimPills label="Lenses"  values={lenses}    color="#6B2A9E" />}
            {problems.length > 0 && (
              <div style={{ marginBottom: '6px' }}>
                <span style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px', letterSpacing:'0.16em',
                  color: 'rgba(15,21,35,0.55)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Problem chains
                </span>
                {problems.map((p, i) => (
                  <div key={i} style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'13px',
                    color: i === 0 ? '#0F1523' : 'rgba(15,21,35,0.55)',
                    lineHeight: 1.5, marginBottom: '3px' }}>
                    {i === 0 ? '' : '+ '}{p}
                  </div>
                ))}
              </div>
            )}
            {principles.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                <PrincipleStrip slugs={principles} size="sm" />
              </div>
            )}
          </div>

          {/* HAL signals (preserved — canonical structural-integrity surface) */}
          {proposal.hal_signals?.length > 0 && (
            <div style={{ marginBottom:'8px' }}>
              <p style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.14em', color:'#2A6B3A', marginBottom:'5px' }}>
                HAL conditions
              </p>
              <div>{proposal.hal_signals.map(s => <ExPill key={s} label={s} variant="green" />)}</div>
            </div>
          )}
          {/* SFP patterns (preserved — canonical structural-integrity surface) */}
          {proposal.sfp_patterns?.length > 0 && (
            <div style={{ marginBottom:'8px' }}>
              <p style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.14em', color:'#8A6020', marginBottom:'5px' }}>
                SFP patterns
              </p>
              <div>{proposal.sfp_patterns.map(s => <ExPill key={s} label={s} variant="amber" />)}</div>
            </div>
          )}

          {/* Relationships the AI proposed — shown so the linking is visible
             before placement. Written on save by linkRelationships(). */}
          {proposal.relationships?.length > 0 && (
            <div style={{ marginBottom:'8px' }}>
              <p style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.14em', color:'rgba(15,21,35,0.55)', marginBottom:'5px' }}>
                Linked to
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                {proposal.relationships.map((r, i) => (
                  <span key={i} style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'13px',
                    color:'rgba(15,21,35,0.72)', background:'rgba(15,21,35,0.04)',
                    border:'1px solid rgba(15,21,35,0.10)', borderRadius:'40px', padding:'3px 10px' }}>
                    {r.to_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Channels — the links being attached (YouTube, podcast, Substack,
             socials, contact). Shown so they're reviewable before placing. */}
          {proposal.links?.length > 0 && (
            <div style={{ marginBottom:'8px' }}>
              <p style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.14em', color:'rgba(15,21,35,0.55)', marginBottom:'5px' }}>
                Channels · {proposal.links.length}
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                {proposal.links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer"
                    style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                      letterSpacing:'0.08em', textTransform:'uppercase', textDecoration:'none',
                      color:gold, background:'rgba(76,107,69,0.06)',
                      border:'1px solid rgba(76,107,69,0.30)', borderRadius:'40px', padding:'3px 10px' }}>
                    {(l.link_type || 'link').replace(/_/g, ' ')}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => setExpanded(e => !e)}
          style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
            letterSpacing:'0.12em', color:'rgba(15,21,35,0.55)',
            background:'none', border:'none', cursor:'pointer', flexShrink:0, paddingTop:'4px' }}>
          {expanded ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Editable fields */}
      {expanded && (
        <div style={{ borderTop:'1px solid rgba(76,107,69,0.15)', padding:'18px 20px 20px', display:'grid', gap:'14px' }}>
          <div>
            <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Name</label>
            <Input value={proposal.name} onChange={v => set('name', v)} placeholder="Name" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Type</label>
              <Select value={proposal.type} onChange={v => set('type', v)}
                options={TYPES_EX.map(t => ({ value:t, label:t }))} />
            </div>
            <div>
              <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Track</label>
              <Select value={proposal.track} onChange={v => { set('track', v); set('domain_id','') }}
                options={[{ value:'planet', label:'Planet' }, { value:'self', label:'Self' }]} />
            </div>
            <div>
              <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Scale</label>
              <Select value={proposal.scale || ''} onChange={v => set('scale', v)}
                options={[{ value:'', label:'-- Select --' }, ...SCALES_EX.map(s => ({ value:s, label:s }))]} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Primary domain *</label>
            <Select value={domains[0] || ''} onChange={v => {
              set('domain_id', v)
              set('domains', v ? [v, ...domains.slice(1)] : domains.slice(1))
            }}
              options={domainOptions()} />
          </div>

          {/* Secondary domains */}
          <div>
            <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'6px' }}>Secondary domains</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {PLANET_DOMAINS_EX.filter(d => d.value !== domains[0]).map(d => {
                const isOn = domains.slice(1).includes(d.value)
                return (
                  <button key={d.value} type="button"
                    onClick={() => {
                      const rest = domains.slice(1)
                      const next = isOn ? rest.filter(x => x !== d.value) : [...rest, d.value]
                      set('domains', [domains[0], ...next].filter(Boolean))
                    }}
                    style={{
                      fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px', letterSpacing:'0.06em',
                      padding:'3px 9px', borderRadius:'40px', cursor:'pointer',
                      color: isOn ? gold : 'rgba(15,21,35,0.72)',
                      background: isOn ? 'rgba(76,107,69,0.08)' : '#FFFFFF',
                      border: isOn ? '1px solid rgba(76,107,69,0.55)' : '1px solid rgba(76,107,69,0.25)',
                    }}>
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Platform principles */}
          <div>
            <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'6px' }}>Platform principles</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {PRINCIPLES_ORDERED.map(p => {
                const isOn = principles.includes(p.slug)
                return (
                  <button key={p.slug} type="button"
                    onClick={() => {
                      set('platform_principles', isOn ? principles.filter(x => x !== p.slug) : [...principles, p.slug])
                    }}
                    style={{
                      fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px', letterSpacing:'0.06em',
                      padding:'3px 9px', borderRadius:'40px', cursor:'pointer',
                      color: isOn ? gold : 'rgba(15,21,35,0.72)',
                      background: isOn ? 'rgba(76,107,69,0.08)' : '#FFFFFF',
                      border: isOn ? '1px solid rgba(76,107,69,0.55)' : '1px solid rgba(76,107,69,0.25)',
                    }}>
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Location</label>
              <Input value={proposal.location_name || ''} onChange={v => set('location_name', v)}
                placeholder="e.g. Mexico City, Mexico" />
            </div>
            <div>
              <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Website</label>
              <Input value={proposal.website || ''} onChange={v => set('website', v)} placeholder="https://..." />
            </div>
          </div>

          <div>
            <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Description</label>
            <textarea value={proposal.description || ''} onChange={e => set('description', e.target.value)}
              rows={3} style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'15px', color:'#0F1523',
                padding:'9px 14px', borderRadius:'8px', border:'1.5px solid rgba(76,107,69,0.35)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.6, boxSizing:'border-box' }} />
          </div>

          {/* Source — provenance for seeding (optional, free-text).
              Format suggestion: "podcast | Episode 47 — Guest Name | https://..." */}
          <div>
            <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Source (optional)</label>
            <input type="text" value={proposal.data_source || ''}
              onChange={e => set('data_source', e.target.value)}
              placeholder="e.g. podcast | Episode 47 — Guest Name | https://..."
              style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'14px', color:'#0F1523',
                padding:'9px 14px', borderRadius:'8px',
                border:'1.5px solid rgba(76,107,69,0.35)', background:'#FFFFFF',
                outline:'none', width:'100%', boxSizing:'border-box' }} />
          </div>

          <div>
            <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Impact summary</label>
            <textarea value={proposal.impact_summary || ''} onChange={e => set('impact_summary', e.target.value)}
              rows={2} style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'15px', color:'#0F1523',
                padding:'9px 14px', borderRadius:'8px', border:'1.5px solid rgba(76,107,69,0.35)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.6, boxSizing:'border-box' }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:'12px', alignItems:'end' }}>
            <div>
              <label style={{ fontFamily:"'IBM Plex Mono',Georgia,serif", fontSize:'13px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Score (0–10)</label>
              <Input value={proposal.alignment_score ?? ''} onChange={handleScoreChange}
                type="number" step="0.5" placeholder="0–10" />
            </div>
            <div style={{ paddingBottom:'2px' }}>
              {!isNaN(score) && <ExTierBadge tier={TIER_FROM_SCORE(score)} />}
              <span style={{ fontFamily:"'Newsreader',Georgia,serif", fontSize:'13px',
                color:'rgba(15,21,35,0.55)', marginLeft:'10px' }}>
                Adjust if your read differs from the AI draft.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddTab({ toast }) {
  const { user }                = useAuth()
  const [input,    setInput]    = useState('')
  const [adding,   setAdding]   = useState(false)
  const [addErr,   setAddErr]   = useState(null)
  const [proposals,  setProposals]  = useState([])
  const [checked,    setChecked]    = useState([])
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState([])

  // HorizonFloor modal state — one proposal queued at a time
  const [floorQueue,  setFloorQueue]  = useState([])   // proposals waiting floor check
  const [floorActive, setFloorActive] = useState(null) // current { proposal, index }
  const [savedNow,    setSavedNow]    = useState([])   // accumulated saved records
  const [pendingBatch, setPendingBatch] = useState([]) // ALL selected proposals for this save run — so relationship linking spans records placed directly and records confirmed through the modal

  // Skip the per-record Floor confirmation — for floor-meeting records ONLY.
  // Session-only by design (no localStorage): it resets to off on every page
  // load so it can never silently stay on across sessions. Records that fall
  // below the Actor Profile Floor ALWAYS go through the HorizonFloor modal,
  // toggle or no toggle — nothing ships thin without an explicit decision.
  const [skipFloor, setSkipFloor] = useState(false)

  // The Actor Profile Floor (NextUs_Actor_Profile_Floor.md), checked locally
  // before placement. Mirrors the checks in scripts/batch-seed.js so the
  // single-add and bulk paths hold the same line.
  function checkProfileFloor(p) {
    const errors = []
    if (!p.name?.trim() || p.name.trim().length < 2)      errors.push('name missing')
    if (!p.type)                                          errors.push('type missing')
    if (!p.description?.trim() || p.description.trim().length < 50)
      errors.push(`description too short (${(p.description || '').trim().length}/50 chars)`)
    if (!p.image_url?.trim())                             errors.push('no image')
    if (!p.website?.trim())                               errors.push('no website / contact path')
    if (!(p.domains?.length) && !p.domain_id)             errors.push('no domain placement')
    return { passes: errors.length === 0, errors }
  }

  async function readSite() {
    if (!input.trim()) return
    setAdding(true); setAddErr(null); setProposals([]); setChecked([]); setSaved([])
    try {
      // Endpoint name preserved as /api/org-extract; rename pending its own deploy coordination.
      const res = await fetch('/api/org-extract', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      // The reader can be killed by the platform timeout before it answers, which
      // returns a non-JSON body. Read text first so that surfaces as a clear
      // message instead of an opaque "could not reach" parse failure.
      const body = await res.text()
      let data
      try { data = JSON.parse(body) }
      catch {
        setAddErr(res.status === 504
          ? 'The reader timed out on this source. Try again, or paste its description text here instead.'
          : 'The reader returned an unexpected response. Try again, or paste a description.')
        return
      }
      if (data.error) { setAddErr(data.message || 'Could not read the site.'); return }
      const results = data.results || []

      // Flag anything already on the map so the single Add flow doesn't double
      // it. Match on exact website URL (path kept, so sub-orgs stay distinct) or
      // exact name. Duplicates are shown but unchecked by default.
      const existing = { urls: new Set(), names: new Set() }
      try {
        const { data: rows } = await supabase.from('nextus_actors').select('name, website').limit(5000)
        for (const a of (rows || [])) {
          const u = normActorUrl(a.website); if (u) existing.urls.add(u)
          const n = normActorName(a.name);   if (n) existing.names.add(n)
        }
      } catch {}
      const marked = results.map(r => {
        const u = normActorUrl(r.website), n = normActorName(r.name)
        const dup = !!((u && existing.urls.has(u)) || (n && existing.names.has(n)))
        return { ...r, _duplicate: dup }
      })
      setProposals(marked)
      setChecked(marked.map(r => !r._duplicate))
    } catch {
      setAddErr('Could not reach the reading service.')
    } finally {
      setAdding(false)
    }
  }

  function toggleChecked(i) {
    setChecked(c => c.map((v, idx) => idx === i ? !v : v))
  }

  function handleChange(i, key, value) {
    setProposals(ps => ps.map((p, idx) => idx === i ? { ...p, [key]: value } : p))
  }

  async function saveSelected() {
    const selected = proposals.filter((_, i) => checked[i])
    if (selected.length === 0) { toast('Select at least one first'); return }
    for (const p of selected) {
      if (!p.name?.trim())                      { toast(`Name required on ${p.label} entry`); return }
      if (!(p.domains?.length) && !p.domain_id) { toast(`Domain required on ${p.label} entry`); return }
    }

    // The Floor is checked for every record, every time. The skip toggle only
    // skips the confirmation modal for records that MEET the floor — anything
    // below the floor is always routed through the HorizonFloor modal so it
    // cannot ship thin without an explicit, per-record decision.
    const belowFloor = selected.filter(p => !checkProfileFloor(p).passes)
    const meetsFloor = selected.filter(p =>  checkProfileFloor(p).passes)

    setPendingBatch(selected)

    if (skipFloor) {
      setSaving(true)
      const placed = []
      for (const p of meetsFloor) {
        const r = await commitProposal(p, 'compatible', null)
        if (r) placed.push(r)
      }
      setSaving(false)
      if (belowFloor.length) {
        toast(`${belowFloor.length} record${belowFloor.length !== 1 ? 's' : ''} below the Floor — confirming each`)
        setSavedNow(placed)
        setFloorQueue(belowFloor)
        setFloorActive({ proposal: belowFloor[0], queueIndex: 0, queue: belowFloor })
        // linkRelationships runs after the modal queue drains (handleFloorResolve)
        return
      }
      if (placed.length) {
        setSaved(placed)
        await linkRelationships(selected, placed)
        toast(`${placed.length} record${placed.length !== 1 ? 's' : ''} placed on the map`)
      }
      return
    }

    // Queue proposals through HorizonFloor check one by one
    setSavedNow([])
    setFloorQueue(selected)
    setFloorActive({ proposal: selected[0], queueIndex: 0, queue: selected })
  }

  async function commitProposal(proposal, floorStatus, reason) {
    const domains = proposal.domains?.length
      ? proposal.domains
      : (proposal.domain_id ? [proposal.domain_id] : [])

    const payload = {
      name:            proposal.name.trim(),
      type:            proposal.type || 'organisation',
      track:           proposal.track || null,
      // The full extracted profile — image, tagline, story — not just the
      // classification. Dropping these was why records placed from this tab
      // arrived on the map thinner than their proposal cards.
      tagline:         proposal.tagline?.trim()   || null,
      image_url:       proposal.image_url?.trim() || null,
      image_provenance: proposal.image_url?.trim() ? 'hotlink' : null,
      story:           proposal.story?.trim()     || null,
      // Legacy backcompat
      domain_id:       domains[0] || null,
      // Four-dimensional placement
      domains:         domains,
      subdomains:      proposal.subdomains || [],
      fields:          proposal.fields     || [],
      lenses:          proposal.lenses     || [],
      problem_chains:  proposal.problem_chains     || [],
      platform_principles: proposal.platform_principles || [],
      scale:           proposal.scale || null,
      scale_notes:     proposal.scale_notes?.trim() || null,
      location_name:   proposal.location_name?.trim() || null,
      website:         proposal.website?.trim() || null,
      description:     proposal.description?.trim() || null,
      impact_summary:  proposal.impact_summary?.trim() || null,
      alignment_score: proposal.alignment_score !== '' && proposal.alignment_score != null
        ? parseFloat(proposal.alignment_score) : null,
      alignment_score_computed:   true,
      alignment_score_updated_at: new Date().toISOString(),
      placement_tier:  proposal.placement_tier || null,
      horizon_floor_status: floorStatus,
      seeded_by:       'nextus',
      vetting_status:  'approved',
      data_source:     proposal.data_source?.trim()
                         ? proposal.data_source.trim()
                         : `Admin add (beta): ${proposal.label}`,
      alignment_reasoning: {
        hal_signals:     proposal.hal_signals,
        sfp_patterns:    proposal.sfp_patterns,
        score_reasoning: proposal.score_reasoning,
        confidence:      proposal.confidence,
        confidence_note: proposal.confidence_note,
        extracted_at:    new Date().toISOString(),
        input_mode:      'admin_extract_beta',
        label:           proposal.label,
        horizon_floor_note: reason || null,
      },
    }

    const { data: inserted, error } = await supabase
      .from('nextus_actors').insert(payload).select('id').single()

    if (error) {
      toast(`Error saving ${proposal.label}: ${error.message}`)
      return null
    }

    // ── Auxiliary profile data — links, press, image rehost ────────────────
    // Best-effort, mirroring the public /add flow (api/add-actor.js saveAux).
    // Founder writes to actor_links / actor_press on unclaimed actors pass
    // RLS via migration 148. Failures warn, never block the placement.
    const auxLinks = Array.isArray(proposal.links) ? proposal.links : []
    if (auxLinks.length) {
      const rows = auxLinks
        .filter(l => l?.url)
        .map((l, idx) => ({
          actor_id:   inserted.id,
          link_type:  l.link_type || 'website',
          url:        l.url,
          label:      l.label || null,
          sort_order: idx,
        }))
      if (rows.length) {
        const { error: linkErr } = await supabase.from('actor_links').insert(rows)
        if (linkErr) console.warn(`links not saved for ${proposal.name}:`, linkErr.message)
      }
    }
    const auxPress = Array.isArray(proposal.press) ? proposal.press : []
    if (auxPress.length) {
      const rows = auxPress
        .filter(p => p?.publication)
        .map((p, idx) => ({
          actor_id:     inserted.id,
          publication:  p.publication,
          url:          p.url          || null,
          title:        p.title        || null,
          published_at: p.published_at || null,
          sort_order:   idx,
        }))
      if (rows.length) {
        const { error: pressErr } = await supabase.from('actor_press').insert(rows)
        if (pressErr) console.warn(`press not saved for ${proposal.name}:`, pressErr.message)
      }
    }

    // Re-host the hotlinked image into Supabase Storage. Fire-and-forget —
    // a failure leaves the hotlink in place and the Floor tab can retry.
    const img = proposal.image_url?.trim()
    if (img) {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token || null
        fetch('/api/actor-image-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ actorId: inserted.id, imageUrl: img }),
        }).catch(() => {})
      } catch {}
    }

    return { id: inserted.id, name: proposal.name, label: proposal.label }
  }

  async function handleFloorResolve({ status, reason }) {
    setSaving(true)
    const { proposal, queueIndex, queue } = floorActive
    const result = await commitProposal(proposal, status, reason)
    setSaving(false)
    setFloorActive(null)

    if (result) {
      const next = [...savedNow, result]
      setSavedNow(next)
      const nextIndex = queueIndex + 1
      if (nextIndex < queue.length) {
        setFloorActive({ proposal: queue[nextIndex], queueIndex: nextIndex, queue })
      } else {
        setSaved(next)
        // Link across the FULL batch (directly-placed + modal-confirmed), so
        // relationships between a floor-passing record and a below-floor one
        // still resolve. pendingBatch holds every selected proposal.
        await linkRelationships(pendingBatch.length ? pendingBatch : queue, next)
        toast(`${next.length} record${next.length !== 1 ? 's' : ''} placed on the map`)
      }
    }
  }

  // Write the AI-proposed relationships once every selected record exists, so
  // both ends can be resolved by name. parent_child sets the child's parent_id;
  // member_of / partner write a confirmed row to nextus_relationships. Only
  // links where both actors were placed in this batch are written.
  async function linkRelationships(queue, saved) {
    if (!saved?.length) return
    const nameToId = {}
    for (const s of saved) {
      if (s?.name) nameToId[s.name.trim().toLowerCase()] = s.id
    }
    for (const proposal of queue) {
      const fromId = nameToId[proposal.name?.trim().toLowerCase()]
      if (!fromId) continue
      for (const rel of (proposal.relationships || [])) {
        const targetId = nameToId[rel.to_name?.trim().toLowerCase()]
        if (!targetId || targetId === fromId) continue
        if (rel.relationship_type === 'parent_child') {
          await supabase.from('nextus_actors').update({ parent_id: targetId }).eq('id', fromId)
        } else if (rel.relationship_type === 'member_of' || rel.relationship_type === 'partner') {
          await supabase.from('nextus_relationships').insert({
            actor_id:          fromId,
            related_actor_id:  targetId,
            relationship_type: rel.relationship_type,
            status:            'confirmed',
            initiated_by:      user?.id || null,
            confirmed_by:      user?.id || null,
            confirmed_at:      new Date().toISOString(),
          }).then(({ error }) => { if (error) console.error('link relationship failed', error) })
        }
      }
    }
  }

  function reset() {
    setInput(''); setProposals([]); setChecked([]); setSaved([]); setAddErr(null)
    setFloorQueue([]); setFloorActive(null); setSavedNow([]); setPendingBatch([])
  }

  const selectedCount = checked.filter(Boolean).length

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* HorizonFloor modal — per-proposal, one at a time */}
      {floorActive && (
        <HorizonFloorModal
          domainSlug={floorActive.proposal.domains?.[0] || floorActive.proposal.domain_id || 'nature'}
          contextLabel={`${floorActive.proposal.name} (${floorActive.proposal.label})`}
          onResolve={handleFloorResolve}
          onCancel={() => setFloorActive(null)}
        />
      )}

      <h2 style={{ ...body, fontSize:'22px', fontWeight: 400, color:'#0F1523', marginBottom:'8px' }}>
        Add to the ecosystem
      </h2>
      <p style={{ ...body, fontSize:'14px', color:'rgba(15,21,35,0.55)', lineHeight:1.65, marginBottom:'28px' }}>
        Paste a URL, description, or raw HTML. The engine reads the source and proposes up to three distinct actor records
        (Planet, Self, and Practitioner) each assessed independently. Tick the ones you want, edit any field,
        then place all selected directly onto the map.
        Four-dimensional placement (domains, subdomains, lenses, problem chains, platform principles)
        renders when the endpoint returns it. Single-value domain fallback is automatic.
      </p>

      {saved.length > 0 && (
        <div style={{ background:'rgba(42,107,58,0.06)', border:'1px solid rgba(42,107,58,0.30)',
          borderRadius:'14px', padding:'24px', marginBottom:'28px' }}>
          <div style={{ ...sc, fontSize:'13px', letterSpacing:'0.16em', color:'#2A6B3A', marginBottom:'12px' }}>
            Placed on the map
          </div>
          {saved.map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
              <ExLabelBadge label={s.label} />
              <span style={{ ...body, fontSize:'17px', color:'#0F1523' }}>{s.name}</span>
              <a href={`/nextus/actors/${s.id}`} target="_blank" rel="noopener noreferrer"
                style={{ ...sc, fontSize:'13px', letterSpacing:'0.12em', color:gold }}>
                View
              </a>
            </div>
          ))}
          <button onClick={reset}
            style={{ ...sc, fontSize:'13px', letterSpacing:'0.12em', color:'rgba(15,21,35,0.55)',
              background:'none', border:'none', cursor:'pointer', marginTop:'12px', padding:0 }}>
            Add another
          </button>
        </div>
      )}

      {!saved.length && (
        <>
          <div style={{ marginBottom:'14px' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={5}
              placeholder="Paste a URL, a description, or raw HTML source..."
              style={{ ...body, fontSize:'15px', color:'#0F1523', padding:'12px 16px',
                borderRadius:'8px', border:'1.5px solid rgba(76,107,69,0.30)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.65, boxSizing:'border-box' }} />
          </div>

          {addErr && (
            <div style={{ background:'rgba(138,48,48,0.05)', border:'1px solid rgba(138,48,48,0.28)',
              borderRadius:'8px', padding:'10px 14px', marginBottom:'14px' }}>
              <p style={{ ...body, fontSize:'14px', color:'#8A3030', margin:0 }}>{addErr}</p>
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'32px' }}>
            <button onClick={readSite} disabled={adding || !input.trim()}
              style={{ ...sc, fontSize:'14px', letterSpacing:'0.16em',
                padding:'12px 30px', borderRadius:'40px', border:'none',
                background: adding || !input.trim() ? 'rgba(76,107,69,0.30)' : '#4c6b45',
                color:'#FFFFFF', cursor: adding || !input.trim() ? 'not-allowed' : 'pointer' }}>
              {adding ? 'Reading...' : 'Read site'}
            </button>
            {proposals.length > 0 && (
              <button onClick={reset}
                style={{ ...sc, fontSize:'13px', letterSpacing:'0.12em', color:'rgba(15,21,35,0.55)',
                  background:'none', border:'none', cursor:'pointer' }}>
                Clear
              </button>
            )}
          </div>

          {proposals.length > 0 && (
            <>
              <div style={{ ...sc, fontSize:'13px', letterSpacing:'0.16em',
                color:'rgba(15,21,35,0.55)', marginBottom:'16px' }}>
                {proposals.length} record{proposals.length !== 1 ? 's' : ''} identified. Tick the ones you want to place.
              </div>

              {proposals.map((p, i) => {
                const floor = checkProfileFloor(p)
                return (
                  <div key={i}>
                    {!floor.passes && (
                      <div style={{ background:'rgba(38,36,32,0.06)',
                        border:'1px solid rgba(76,107,69,0.40)', borderBottom:'none',
                        borderRadius:'10px 10px 0 0', padding:'8px 14px' }}>
                        <span style={{ ...sc, fontSize:'13px', letterSpacing:'0.14em', color:'#262420' }}>
                          Below the Floor
                        </span>
                        <span style={{ ...body, fontSize:'13px', color:'rgba(15,21,35,0.72)', marginLeft:'10px' }}>
                          {floor.errors.join(' · ')}
                        </span>
                      </div>
                    )}
                    <ProposalCard
                      proposal={p}
                      index={i}
                      checked={checked[i]}
                      onToggle={toggleChecked}
                      onChange={handleChange}
                    />
                  </div>
                )
              })}

              <div style={{ paddingTop:'8px', borderTop:'1px solid rgba(76,107,69,0.15)',
                display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                <button onClick={saveSelected} disabled={saving || selectedCount === 0}
                  style={{ ...sc, fontSize:'14px', letterSpacing:'0.16em',
                    padding:'13px 32px', borderRadius:'40px', border:'none',
                    background: saving || selectedCount === 0 ? 'rgba(76,107,69,0.30)' : '#4c6b45',
                    color:'#FFFFFF', cursor: saving || selectedCount === 0 ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : `Place ${selectedCount} selected`}
                </button>
                <label style={{ display:'flex', alignItems:'center', gap:'7px', cursor:'pointer' }}>
                  <input type="checkbox" checked={skipFloor}
                    onChange={e => toggleSkipFloor(e.target.checked)}
                    style={{ width:'16px', height:'16px', accentColor:'#4c6b45', cursor:'pointer' }} />
                  <span style={{ ...body, fontSize:'13px', color:'rgba(15,21,35,0.55)' }}>
                    Skip Floor confirmation
                  </span>
                </label>
                <p style={{ ...body, fontSize:'13px', color:'rgba(15,21,35,0.55)', margin:0 }}>
                  {skipFloor
                    ? 'Floor-meeting records place directly. Records below the Floor still get a per-record check.'
                    : 'Horizon Floor check runs for each selected record.'}
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── PLACE TAB ────────────────────────────────────────────────
// Preserved from original. TIER_FROM_SCORE preserved.

function PlaceTab({ toast }) {
  const [actors, setActors]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('pending')
  const [scoreEdits, setScoreEdits] = useState({})

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('nextus_actors')
      .select('*')
      .eq('seeded_by', 'community')
      .not('alignment_reasoning', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)

    let results = data || []
    if (filter === 'pending')   results = results.filter(a => a.vetting_status === 'nominated')
    if (filter === 'qualified') results = results.filter(a => ['qualified', 'exemplar'].includes(a.placement_tier) && a.seeded_by === 'nextus')
    if (filter === 'contested') results = results.filter(a => ['contested', 'pattern_instance'].includes(a.placement_tier))
    setActors(results)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function approve(actor) {
    const rawScore = scoreEdits[actor.id]
    const score    = rawScore !== undefined ? parseFloat(rawScore) : actor.alignment_score
    const tier     = TIER_FROM_SCORE(score ?? 7)

    const { error } = await supabase.from('nextus_actors').update({
      seeded_by:       'nextus',
      vetting_status:  'approved',
      alignment_score: score ?? actor.alignment_score,
      placement_tier:  tier,
    }).eq('id', actor.id)

    if (error) { toast('Error approving'); return }
    toast(`${actor.name} approved (${tier})`)
    load()
  }

  async function contest(actor) {
    const { error } = await supabase.from('nextus_actors').update({
      placement_tier: 'contested',
    }).eq('id', actor.id)
    if (error) { toast('Error'); return }
    toast(`${actor.name} moved to contested`)
    load()
  }

  async function reject(actor) {
    const reason = window.prompt(`Reason for rejecting "${actor.name}" (optional):`)
    if (reason === null) return
    const { error } = await supabase.from('nextus_actors').update({
      vetting_status: 'rejected',
      data_source: actor.data_source
        ? actor.data_source + (reason ? ` | Rejected: ${reason}` : ' | Rejected')
        : reason ? `Rejected: ${reason}` : 'Rejected',
    }).eq('id', actor.id)
    if (error) { toast('Error rejecting'); return }
    toast(`${actor.name} rejected`)
    load()
  }

  const trackLabel = t => ({ planet: 'Planet', self: 'Self', both: 'Planet + Self' })[t] || t
  const domainLabel = id => DOMAIN_LIST.find(d => d.value === id)?.label || id

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[['pending','Pending'], ['qualified','Qualified'], ['contested','Contested'], ['all','All']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'} onClick={() => setFilter(val)}>
            {label}
          </Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {filter === 'pending' && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '20px', lineHeight: 1.6, maxWidth: '560px' }}>
          Review each placement. The AI score is a draft. Adjust before approving.
          Approve to promote to the map. Contest to hold in the contested layer. Reject to remove.
        </div>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && actors.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filter === 'all' ? '' : filter} placements.</p>}

      {actors.map(a => {
        const rawScore = scoreEdits[a.id]
        const scoreDisplay = rawScore !== undefined ? rawScore : (a.alignment_score ?? '')
        const tierDisplay  = rawScore !== undefined && !isNaN(parseFloat(rawScore))
          ? TIER_FROM_SCORE(parseFloat(rawScore))
          : a.placement_tier

        // Four-dim display
        const domains = a.domains?.length ? a.domains : (a.domain_id ? [a.domain_id] : [])

        return (
          <Card key={a.id} style={{ borderLeft: `3px solid ${a.placement_tier === 'exemplar' ? '#2A6B3A' : a.placement_tier === 'contested' ? '#8A3030' : 'rgba(76,107,69,0.35)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ ...body, fontSize: '18px', color: '#0F1523' }}>{a.name}</span>
                  <ExTierBadge tier={tierDisplay} />
                  {a.track && <ExLabelBadge label={trackLabel(a.track)} />}
                </div>

                {/* Four-dim display */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {domains.map((d, i) => (
                    <span key={d} style={{
                      ...sc, fontSize: '13px', letterSpacing: '0.08em',
                      color: i === 0 ? gold : 'rgba(15,21,35,0.55)',
                      background: i === 0 ? 'rgba(76,107,69,0.08)' : 'rgba(15,21,35,0.04)',
                      border: `1px solid ${i === 0 ? 'rgba(76,107,69,0.35)' : 'rgba(15,21,35,0.15)'}`,
                      borderRadius: '40px', padding: '1px 8px',
                    }}>
                      {domainLabel(d)}{i === 0 ? ' (primary)' : ''}
                    </span>
                  ))}
                </div>

                {/* HAL signals and SFP patterns (canonical structural-integrity surfaces preserved) */}
                {a.alignment_reasoning?.hal_signals?.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#2A6B3A', marginRight: '6px' }}>HAL:</span>
                    {a.alignment_reasoning.hal_signals.map(s => <ExPill key={s} label={s} variant="green" />)}
                  </div>
                )}
                {a.alignment_reasoning?.sfp_patterns?.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#8A6020', marginRight: '6px' }}>SFP:</span>
                    {a.alignment_reasoning.sfp_patterns.map(s => <ExPill key={s} label={s} variant="amber" />)}
                  </div>
                )}
                {a.alignment_reasoning?.score_reasoning && (
                  <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, margin: '6px 0 0', maxWidth: '480px' }}>
                    {a.alignment_reasoning.score_reasoning}
                  </p>
                )}

                {a.horizon_floor_status && a.horizon_floor_status !== 'compatible' && (
                  <div style={{ marginTop: '6px' }}>
                    <Badge label={`floor: ${a.horizon_floor_status}`} color="#8A3030" />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                  <input type="number" placeholder="Score" min="0" max="10" step="0.5"
                    value={scoreDisplay}
                    onChange={e => setScoreEdits(prev => ({ ...prev, [a.id]: e.target.value }))}
                    style={{ ...body, fontSize: '15px', color: '#0F1523', width: '80px',
                      padding: '6px 10px', borderRadius: '6px',
                      border: '1.5px solid rgba(76,107,69,0.35)', background: '#FFFFFF', outline: 'none' }} />
                  {tierDisplay && <ExTierBadge tier={tierDisplay} />}
                </div>
              </div>

              {filter !== 'all' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <Btn small onClick={() => approve(a)}>Approve</Btn>
                  <Btn small variant="ghost" onClick={() => contest(a)}>Contest</Btn>
                  <Btn small variant="danger" onClick={() => reject(a)}>Reject</Btn>
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── FLAGS TAB ─────────────────────────────────────────────────
// Replaces Nominations tab. Trust is the default — entries go live
// immediately on /add. This queue shows community flags, not submissions.
//
// Flag levels (actor flags):
//   1 Spam        — stays live, queue only
//   2 Misplaced   — stays live, queue only
//   3 Misleading  — stays live, queue only
//   4 Harmful     — auto-hidden by DB trigger, restore/keep here
//
// Call flags (actor_call_flags):
//   Free-text reason. Resolve = call stays live. Suspend = withdraw call.

const FLAG_CFG = {
  1: { label: 'Spam',       color: '#8A3030', bg: 'rgba(138,48,48,0.06)',  border: 'rgba(138,48,48,0.20)',  urgent: false },
  2: { label: 'Misplaced',  color: '#8A6020', bg: 'rgba(76,107,69,0.06)', border: 'rgba(76,107,69,0.25)', urgent: false },
  3: { label: 'Misleading', color: '#8A6020', bg: 'rgba(76,107,69,0.06)', border: 'rgba(76,107,69,0.25)', urgent: false },
  4: { label: 'Harmful',    color: '#8A3030', bg: 'rgba(138,48,48,0.08)',  border: 'rgba(138,48,48,0.30)',  urgent: true  },
}

function FlagBadge({ level }) {
  const cfg = FLAG_CFG[level] || FLAG_CFG[3]
  return (
    <span style={{
      ...sc, fontSize: '13px', letterSpacing: '0.12em',
      padding: '2px 8px', borderRadius: '40px',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.urgent ? '⚠ ' : ''}{cfg.label}
    </span>
  )
}

// ── Call flags sub-tab ────────────────────────────────────────

function CallFlagsSection({ toast }) {
  const { user } = useAuth()
  const [flags,   setFlags]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('open')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('actor_call_flags')
      .select(`
        id, reason, created_at, resolved, resolved_at, admin_note,
        call:actor_calls (
          id, title, slug, type, scale, domain, visibility,
          taken_on_count, flag_count
        ),
        user:user_id (id)
      `)
      .eq('resolved', filter !== 'open')
      .order('created_at', { ascending: false })
      .limit(100)
    setFlags(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function resolve(flag, suspend = false) {
    const now = new Date().toISOString()
    await supabase.from('actor_call_flags')
      .update({ resolved: true, resolved_at: now })
      .eq('id', flag.id)
    if (suspend && flag.call?.id) {
      // Withdraw: set visibility to 'draft' — effectively unlists the call
      await supabase.from('actor_calls')
        .update({ visibility: 'draft', admin_reviewed: true,
          admin_note: `Withdrawn by admin after flag: ${flag.reason?.slice(0, 120) || 'see flag record'}` })
        .eq('id', flag.call.id)
      toast(`Call withdrawn from community: "${flag.call.title || flag.call.id}"`)
    } else {
      toast('Flag dismissed — call stays live')
    }
    load()
  }

  // Founder-authorised lifecycle actions, routed through the service-role API
  // (which verifies the founder role and runs the re-parent atomically).
  // delete = permanent tombstone (children re-root, participant evidence kept).
  // purge  = true row removal, only offered when nobody has joined.
  async function adminLifecycle(flag, action) {
    if (!flag.call?.id) return
    const name = flag.call.title || flag.call.id
    if (action === 'delete' && !window.confirm(
      `Delete "${name}"?\n\nChildren re-root one notch up. Participant records are kept. This is permanent.`)) return
    if (action === 'purge' && !window.confirm(
      `Permanently remove "${name}"?\n\nOnly allowed because nobody has joined it. The row is gone for good.`)) return
    const r = await actorCallsRaw({ action, userId: user?.id, call_id: flag.call.id })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || d.error) { toast(d.error || 'Action failed'); return }
    await supabase.from('actor_call_flags')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', flag.id)
    toast(action === 'purge'
      ? `Call purged: "${name}"`
      : `Call deleted: "${name}"${d.reparented ? ` · ${d.reparented} re-rooted` : ''}`)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['open','Open'], ['resolved','Resolved']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'}
            onClick={() => setFilter(val)}>{label}</Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {filter === 'open' && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
          marginBottom: '18px', lineHeight: 1.6, maxWidth: '560px' }}>
          Community flags on Challenges and Asks. Dismiss if not valid.
          Withdraw (set draft) if the call violates community standards.
        </div>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading…</p>}
      {!loading && flags.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filter} call flags.</p>
      )}

      {flags.map(flag => {
        const call   = flag.call
        const typeLabel = call?.type === 'ask' ? 'Ask' : 'Challenge'
        const isLive = call?.visibility === 'community' || call?.visibility === 'link_only'

        return (
          <Card key={flag.id} style={{ borderLeft: '3px solid rgba(76,107,69,0.30)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '8px', flexWrap: 'wrap' }}>
                  <Badge label={typeLabel} />
                  {call?.domain && <Badge label={call.domain} color="#2A4A8A" />}
                  {call?.visibility && <Badge label={call.visibility} color={isLive ? '#2A6A3A' : 'rgba(15,21,35,0.4)'} />}
                  {call?.flag_count > 1 && (
                    <Badge label={`${call.flag_count} flags total`} color="#8A3030" />
                  )}
                </div>
                {call?.title && (
                  <div style={{ ...body, fontSize: '17px', color: '#0F1523', marginBottom: '4px' }}>
                    {call.title}
                  </div>
                )}
                {call?.slug && (
                  <div style={{ marginBottom: '8px' }}>
                    <a href={`/stretch/c/${call.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold }}>
                      /stretch/c/{call.slug}
                    </a>
                  </div>
                )}
                {flag.reason && (
                  <div style={{ background: 'rgba(76,107,69,0.04)', border: '1px solid rgba(76,107,69,0.18)',
                    borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                    <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginBottom: '4px' }}>Reason</p>
                    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
                      {flag.reason}
                    </p>
                  </div>
                )}
                <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
                  Flagged {new Date(flag.created_at).toLocaleDateString('en-GB',
                    { day: 'numeric', month: 'long', year: 'numeric' })}
                  {call?.taken_on_count > 0 && ` · ${call.taken_on_count} participant${call.taken_on_count === 1 ? '' : 's'}`}
                </p>
              </div>

              {filter === 'open' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <Btn small onClick={() => resolve(flag, false)}>Dismiss</Btn>
                  <Btn small variant="danger" onClick={() => resolve(flag, true)}>Withdraw call</Btn>
                  <Btn small variant="danger" onClick={() => adminLifecycle(flag, 'delete')}>Delete</Btn>
                  {call?.taken_on_count === 0 && (
                    <Btn small variant="danger" onClick={() => adminLifecycle(flag, 'purge')}>Purge</Btn>
                  )}
                  {call?.slug && (
                    <a href={`/stretch/c/${call.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
                        textAlign: 'center', textDecoration: 'none', marginTop: '2px' }}>
                      View call
                    </a>
                  )}
                </div>
              )}
              {filter !== 'open' && <Badge label="resolved" color="rgba(15,21,35,0.45)" />}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Claim requests sub-tab ────────────────────────────────────
// Admin-fallback claims: claimants who couldn't verify via org email.
// Actions: Approve (sets profile_owner) | Reject (closes the request).

function ClaimRequestsSection({ toast }) {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('pending')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('claim_requests')
      .select(`
        id, note, evidence_url, user_email, status, created_at, admin_note,
        actor:actor_id ( id, name, slug, type, website, image_url, profile_owner )
      `)
      .eq('status', filter)
      .order('created_at', { ascending: true })
      .limit(50)
    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function approve(req) {
    const now = new Date().toISOString()
    // Guard: check actor is still unclaimed
    const { data: actor } = await supabase.from('nextus_actors').select('profile_owner').eq('id', req.actor.id).maybeSingle()
    if (actor?.profile_owner) {
      toast('Actor was already claimed — rejecting this request.')
      await supabase.from('claim_requests').update({ status: 'rejected', reviewed_at: now, admin_note: 'Actor already claimed by the time this was reviewed.' }).eq('id', req.id)
      load(); return
    }
    // Get user_id from the request row
    const { data: fullReq } = await supabase.from('claim_requests').select('user_id').eq('id', req.id).maybeSingle()
    if (!fullReq?.user_id) { toast('Could not find user — approve manually.'); return }

    await supabase.from('nextus_actors').update({ profile_owner: fullReq.user_id, updated_at: now }).eq('id', req.actor.id)
    await supabase.from('claim_requests').update({ status: 'approved', reviewed_at: now }).eq('id', req.id)
    toast(`${req.actor.name} approved — profile_owner set.`)
    load()
  }

  async function reject(req) {
    await supabase.from('claim_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', req.id)
    toast(`Request rejected.`)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['pending','Pending'], ['approved','Approved'], ['rejected','Rejected']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'} onClick={() => setFilter(val)}>{label}</Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>
      {filter === 'pending' && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '18px', lineHeight: 1.6, maxWidth: '560px' }}>
          Admin-fallback claims from people who could not verify via org-domain email.
          Check their evidence, then approve or reject.
        </div>
      )}
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading…</p>}
      {!loading && requests.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filter} requests.</p>}
      {requests.map(req => {
        const a = req.actor
        return (
          <Card key={req.id} style={{ borderLeft: '3px solid rgba(76,107,69,0.30)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {a?.type && <Badge label={a.type} />}
                  {a && <span style={{ ...body, fontSize: '17px', color: '#0F1523' }}>{a.name}</span>}
                  {a?.website && (
                    <a href={a.website} target="_blank" rel="noopener noreferrer"
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold, textDecoration: 'none' }}>
                      {a.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                </div>
                {req.user_email && (
                  <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>
                    Claimed by: <strong>{req.user_email}</strong>
                  </div>
                )}
                {req.note && (
                  <div style={{ background: 'rgba(76,107,69,0.04)', border: '1px solid rgba(76,107,69,0.18)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                    <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginBottom: '4px' }}>Their connection</p>
                    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>{req.note}</p>
                  </div>
                )}
                {req.evidence_url && (
                  <div style={{ marginBottom: '8px' }}>
                    <a href={req.evidence_url} target="_blank" rel="noopener noreferrer"
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold }}>
                      Evidence: {req.evidence_url.slice(0, 80)}
                    </a>
                  </div>
                )}
                <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
                  Submitted {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {filter === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <Btn small onClick={() => approve(req)}>Approve</Btn>
                  <Btn small variant="ghost" onClick={() => reject(req)}>Reject</Btn>
                  {a?.slug && (
                    <a href={`/org/${a.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold, textAlign: 'center', textDecoration: 'none', marginTop: '2px' }}>
                      View profile
                    </a>
                  )}
                </div>
              )}
              {filter !== 'pending' && <Badge label={filter} color={filter === 'approved' ? '#2A6A3A' : 'rgba(15,21,35,0.45)'} />}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Chains tab ────────────────────────────────────────────────
// Reviews problem-chain proposals — supply-side (extractor, surfaced from a
// seeded actor) and demand-side (clustering cron, surfaced from N people who
// arrived with a concern no live chain held). Approving promotes the chain
// into the live vocabulary and closes the loop: aliases seed from the cluster,
// the people who brought it are retro-tagged, and overlapping actors are
// re-tagged via the existing auto-tagger.
function ChainsTab({ toast }) {
  const [proposals, setProposals] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('pending')
  const [busyId,    setBusyId]    = useState(null)
  const [subTab,    setSubTab]    = useState('proposals')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('nextus_problem_chain_proposals')
      .select('*')
      .eq('status', filter)
      .order('people_count', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(100)
    setProposals(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function callPromote(proposalId, action) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { toast('Sign-in expired — reload and retry.'); return null }
    const res = await fetch('/api/chain-promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ proposalId, action }),
    })
    return { status: res.status, body: await res.json().catch(() => ({})) }
  }

  async function approve(p) {
    setBusyId(p.id)
    try {
      const r = await callPromote(p.id, 'approve')
      if (!r) return
      if (r.status === 409) { toast(r.body?.message || 'Slug already exists.'); return }
      if (r.status !== 200 || !r.body?.ok) { toast(r.body?.message || r.body?.error || 'Promotion failed.'); return }

      // Fire the existing actor auto-tagger against overlapping actors so the
      // supply side picks the new chain up. Fire-and-forget — promotion already
      // succeeded; tagging is best-effort and runs long.
      const actorIds = r.body.actor_ids || []
      if (actorIds.length) {
        fetch('/api/nextsteps-tag-actor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor_ids: actorIds }),
        }).catch(() => {})
      }
      const bits = [`"${r.body.chain?.label || p.label}" is live`]
      if (r.body.retagged_tracks) bits.push(`${r.body.retagged_tracks} people re-tagged`)
      if (actorIds.length)        bits.push(`re-tagging ${actorIds.length} actors`)
      toast(bits.join(' · '))
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function reject(p) {
    setBusyId(p.id)
    try {
      const r = await callPromote(p.id, 'reject')
      if (!r) return
      if (r.status !== 200) { toast(r.body?.error || 'Could not reject.'); return }
      toast('Proposal rejected')
      load()
    } finally {
      setBusyId(null)
    }
  }

  const domainLabel = id => DOMAIN_LIST.find(d => d.value === id)?.label || id

  return (
    <div>
      <div style={{ display: 'flex', gap: '0', marginBottom: '22px',
        borderBottom: '1px solid rgba(76,107,69,0.15)' }}>
        {[['proposals','Proposals'], ['supply','Supply & Demand']].map(([val, label]) => (
          <button key={val} type="button" onClick={() => setSubTab(val)}
            style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em',
              padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
              color: subTab === val ? gold : 'rgba(15,21,35,0.45)',
              borderBottom: subTab === val ? `2px solid ${gold}` : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {subTab === 'supply' && <SupplyDemandSection toast={toast} />}

      {subTab === 'proposals' && (
      <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['pending','Pending'], ['approved','Approved'], ['rejected','Rejected']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'}
            onClick={() => setFilter(val)}>{label}</Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {filter === 'pending' && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
          marginBottom: '20px', lineHeight: 1.6, maxWidth: '620px' }}>
          New problem-chains awaiting review. Demand-side proposals carry the number
          of distinct people who arrived with a concern no live chain held, and a
          sample of how they said it. Approving promotes the chain, seeds its aliases,
          re-tags the people who brought it, and re-tags overlapping actors.
        </div>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && proposals.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filter} proposals.</p>
      )}

      {proposals.map(p => {
        const isDemand = p.source === 'demand'
        const samples  = Array.isArray(p.sample_shapes) ? p.sample_shapes : []
        const aliases  = Array.isArray(p.aliases) ? p.aliases : []
        return (
          <Card key={p.id} style={{
            borderLeft: isDemand
              ? '3px solid rgba(42,106,58,0.45)'
              : '3px solid rgba(76,107,69,0.30)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '10px', flexWrap: 'wrap' }}>
              <Badge label={isDemand ? 'demand' : 'supply'} color={isDemand ? '#2A6A3A' : gold} />
              <span style={{ ...body, fontSize: '18px', color: '#0F1523' }}>{p.label}</span>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em',
                color: 'rgba(15,21,35,0.55)' }}>{p.proposed_slug}</span>
              {isDemand && typeof p.people_count === 'number' && (
                <Badge label={`${p.people_count} people`} color="#2A4A8A" />
              )}
              {(p.domains || []).map(d => <Badge key={d} label={domainLabel(d)} color="#2A4A8A" />)}
            </div>

            {p.description && (
              <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)',
                lineHeight: 1.6, marginBottom: '10px' }}>{p.description}</div>
            )}

            {p.rationale && (
              <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                lineHeight: 1.6, marginBottom: '10px', fontStyle: 'normal' }}>{p.rationale}</div>
            )}

            {isDemand && samples.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold,
                  textTransform: 'uppercase', marginBottom: '6px' }}>How people said it</div>
                {samples.map((s, i) => (
                  <div key={i} style={{ ...body, fontSize: '13px', fontStyle: 'italic',
                    color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>“{s}”</div>
                ))}
              </div>
            )}

            {aliases.length > 0 && (
              <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                lineHeight: 1.6, marginBottom: '12px' }}>
                Aliases on promotion: {aliases.join(', ')}
              </div>
            )}

            {filter === 'pending' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Btn small disabled={busyId === p.id} onClick={() => approve(p)}>
                  {busyId === p.id ? 'Working…' : 'Approve + promote'}
                </Btn>
                <Btn small variant="ghost" disabled={busyId === p.id} onClick={() => reject(p)}>
                  Reject
                </Btn>
              </div>
            )}
          </Card>
        )
      })}
      </div>
      )}
    </div>
  )
}

// The unmet-need readout: per active chain, who answers it (actor supply) vs
// who arrives matching it (people demand). Chains with demand and no supply are
// the seeding queue writing itself.
function SupplyDemandSection({ toast }) {
  const [rows,     setRows]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [onlyGaps, setOnlyGaps] = useState(true)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('nextus_chain_supply_demand')
    if (error) { toast('Could not load supply / demand.'); setRows([]); setLoading(false); return }
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const domainLabel = id => DOMAIN_LIST.find(d => d.value === id)?.label || id
  const shown = onlyGaps ? rows.filter(r => Number(r.actor_count) === 0) : rows

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <Btn small variant={onlyGaps ? 'primary' : 'ghost'} onClick={() => setOnlyGaps(true)}>Unmet (no actors)</Btn>
        <Btn small variant={!onlyGaps ? 'primary' : 'ghost'} onClick={() => setOnlyGaps(false)}>All active chains</Btn>
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
        marginBottom: '20px', lineHeight: 1.6, maxWidth: '620px' }}>
        Chains people arrive matching but no live actor answers yet. Where demand has
        outrun supply, this is the seeding queue writing itself — go find who is building toward it.
      </div>

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && shown.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>
          {onlyGaps ? 'No unmet chains — every active chain has at least one actor.' : 'No active chains.'}
        </p>
      )}

      {shown.map(r => {
        const noSupply = Number(r.actor_count) === 0
        return (
          <Card key={r.slug} style={{
            borderLeft: noSupply ? '3px solid rgba(138,48,48,0.50)' : '3px solid rgba(76,107,69,0.30)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ ...body, fontSize: '17px', color: '#0F1523' }}>{r.label}</span>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)' }}>{r.slug}</span>
              {r.is_demand_origin && <Badge label="demand-born" color="#2A6A3A" />}
              {(r.domains || []).map(d => <Badge key={d} label={domainLabel(d)} color="#2A4A8A" />)}
            </div>
            <div style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
              <div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: noSupply ? '#8A3030' : gold }}>Actors</div>
                <div style={{ ...body, fontSize: '18px', color: noSupply ? '#8A3030' : '#0F1523' }}>{r.actor_count}</div>
              </div>
              <div>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: gold }}>People arriving</div>
                <div style={{ ...body, fontSize: '18px', color: '#0F1523' }}>{r.track_count}</div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Practices tab ─────────────────────────────────────────────
// The judgment surface. Sets standing on practices (best | alternative |
// ruled_out | unjudged), backed up with a rationale and sources, and toggles
// whether a ruled-out practice stays open to reconsideration. Reads through the
// founder-authed service endpoint because unjudged candidates aren't publicly
// readable. Shows each practice's redemption door — the better practice for the
// same issue — which is the invitation an actor on a ruled-out practice is
// offered, never a shaming.
const STANDING_LABELS = {
  best:        ['Best',        '#2A6A3A'],
  alternative: ['Alternative', '#2A4A8A'],
  ruled_out:   ['Ruled out',   '#8A3030'],
  unjudged:    ['Unjudged',    'rgba(15,21,35,0.45)'],
}

function PracticesTab({ toast }) {
  const [practices, setPractices] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [busyId,    setBusyId]    = useState(null)
  const [draft,     setDraft]     = useState({})   // practiceId -> { rationale, sources }

  async function authedFetch(opts) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { toast('Sign-in expired — reload and retry.'); return null }
    return fetch('/api/practice-admin', {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    })
  }

  async function load() {
    setLoading(true)
    const res = await authedFetch({ method: 'GET' })
    if (!res) { setLoading(false); return }
    const body = await res.json().catch(() => ({}))
    setPractices(body.practices || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function judge(p, standing) {
    setBusyId(p.id)
    try {
      const d = draft[p.id] || {}
      const sources = (d.sources ?? (p.standing_sources || []).join(', '))
        .split(',').map(s => s.trim()).filter(Boolean)
      const res = await authedFetch({
        method: 'POST',
        body: JSON.stringify({
          practiceId: p.id,
          standing,
          standing_rationale: d.rationale ?? p.standing_rationale ?? '',
          standing_sources: sources,
          reconsideration_open: typeof d.reconsider === 'boolean' ? d.reconsider : p.reconsideration_open,
        }),
      })
      if (!res) return
      const body = await res.json().catch(() => ({}))
      if (!body.ok) { toast(body.error || 'Could not save.'); return }
      toast(`"${p.name}" set to ${STANDING_LABELS[standing]?.[0] || standing}`)
      load()
    } finally {
      setBusyId(null)
    }
  }

  const domainLabel = id => DOMAIN_LIST.find(d => d.value === id)?.label || id
  const shown = filter === 'all' ? practices : practices.filter(p => p.standing === filter)

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[['all','All'], ['unjudged','Unjudged'], ['best','Best'], ['alternative','Alternatives'], ['ruled_out','Ruled out']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'} onClick={() => setFilter(val)}>{label}</Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
        marginBottom: '20px', lineHeight: 1.6, maxWidth: '640px' }}>
        Set where each practice stands. The viable/not-viable line is the grace gate:
        an alternative works but ranks lower; ruled-out failed a gate. Back every judgment
        up with a rationale and sources. Ruled-out shows the practice and the why, never
        the actors doing it, and always shows the door forward.
      </div>

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && shown.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filter === 'all' ? '' : filter + ' '}practices.</p>
      )}

      {shown.map(p => {
        const [slabel, scolor] = STANDING_LABELS[p.standing] || STANDING_LABELS.unjudged
        const d = draft[p.id] || {}
        const reconsider = typeof d.reconsider === 'boolean' ? d.reconsider : p.reconsideration_open
        return (
          <Card key={p.id} style={{ borderLeft: `3px solid ${scolor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <Badge label={slabel} color={scolor} />
              <span style={{ ...body, fontSize: '18px', color: '#0F1523' }}>{p.name}</span>
              <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)' }}>{p.slug}</span>
              {(p.domains || []).map(dm => <Badge key={dm} label={domainLabel(dm)} color="#2A4A8A" />)}
              <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{p.embodiment_count} embodying</span>
            </div>

            {p.statement && (
              <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, marginBottom: '8px' }}>{p.statement}</div>
            )}

            {(p.problem_chains || []).length > 0 && (
              <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginBottom: '8px' }}>
                Answers: {p.problem_chains.join(', ')}
              </div>
            )}

            {(p.tiers || []).length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, textTransform: 'uppercase', marginBottom: '4px' }}>Tier ladder</div>
                {p.tiers.map(t => (
                  <div key={t.id} style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                    {t.position}. {t.label}{t.resource_level ? ` · ${t.resource_level}` : ''}{t.scale ? ` · ${t.scale}` : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Redemption door — the way forward for an actor on this practice */}
            {(p.redemption_door || []).length > 0 && (
              <div style={{ marginBottom: '10px', padding: '8px 12px', background: 'rgba(42,106,58,0.06)', borderRadius: '8px' }}>
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: '#2A6A3A', textTransform: 'uppercase', marginBottom: '4px' }}>Door forward (same issue)</div>
                <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>
                  {p.redemption_door.map(b => b.name).join(' · ')}
                </div>
              </div>
            )}

            {/* Backing */}
            <textarea
              defaultValue={p.standing_rationale || ''}
              placeholder="Rationale — why this standing. Back it up."
              onChange={e => setDraft(s => ({ ...s, [p.id]: { ...s[p.id], rationale: e.target.value } }))}
              style={{ ...body, width: '100%', minHeight: '54px', fontSize: '13px', padding: '8px 10px',
                border: '1px solid rgba(76,107,69,0.25)', borderRadius: '8px', marginBottom: '8px', resize: 'vertical' }}
            />
            <input
              defaultValue={(p.standing_sources || []).join(', ')}
              placeholder="Sources (comma-separated URLs or citations)"
              onChange={e => setDraft(s => ({ ...s, [p.id]: { ...s[p.id], sources: e.target.value } }))}
              style={{ ...body, width: '100%', fontSize: '13px', padding: '8px 10px',
                border: '1px solid rgba(76,107,69,0.25)', borderRadius: '8px', marginBottom: '10px' }}
            />

            <label style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <input type="checkbox" checked={reconsider}
                onChange={e => setDraft(s => ({ ...s, [p.id]: { ...s[p.id], reconsider: e.target.checked } }))} />
              Open to reconsideration (uncheck only for the settled — we don't relitigate flat earth)
            </label>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['best','alternative','ruled_out','unjudged'].map(st => (
                <Btn key={st} small disabled={busyId === p.id} variant={p.standing === st ? 'primary' : 'ghost'}
                  onClick={() => judge(p, st)}>
                  {busyId === p.id ? '…' : STANDING_LABELS[st][0]}
                </Btn>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function FlagsTab({ toast }) {
  const [flags,    setFlags]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('open')
  const [subTab,   setSubTab]   = useState('actors')  // actors | calls | claims

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('nextus_flags')
      .select('*, actor:nextus_actors(id, name, slug, type, domain_id, domains, location_name, website, status)')
      .eq('status', filter)
      .order('flag_level', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)
    setFlags(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function dismiss(flag) {
    await supabase.from('nextus_flags')
      .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
      .eq('id', flag.id)
    toast('Flag dismissed')
    load()
  }

  async function resolve(flag) {
    await supabase.from('nextus_flags')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', flag.id)
    toast('Flag resolved')
    load()
  }

  async function restoreActor(flag) {
    await supabase.from('nextus_actors').update({ status: 'live' }).eq('id', flag.actor_id)
    await resolve(flag)
    toast(`${flag.actor?.name || 'Actor'} restored to live`)
  }

  async function suspendActor(flag) {
    await supabase.from('nextus_actors').update({ status: 'suspended' }).eq('id', flag.actor_id)
    await resolve(flag)
    toast(`${flag.actor?.name || 'Actor'} suspended`)
  }

  const domainLabel = id => DOMAIN_LIST.find(d => d.value === id)?.label || id

  return (
    <div>
      {/* Sub-tab switcher: Actors | Calls | Claims */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '22px',
        borderBottom: '1px solid rgba(76,107,69,0.15)' }}>
        {[['actors', 'Actor Flags'], ['calls', 'Call Flags'], ['claims', 'Claim Requests']].map(([val, label]) => (
          <button key={val} type="button" onClick={() => setSubTab(val)}
            style={{ ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em',
              padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
              color: subTab === val ? gold : 'rgba(15,21,35,0.45)',
              borderBottom: subTab === val ? `2px solid ${gold}` : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {subTab === 'calls'   && <CallFlagsSection toast={toast} />}
      {subTab === 'claims'  && <ClaimRequestsSection toast={toast} />}

      {subTab === 'actors' && (
      <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['open','Open'], ['resolved','Resolved'], ['dismissed','Dismissed']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'}
            onClick={() => setFilter(val)}>{label}</Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {filter === 'open' && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)',
          marginBottom: '20px', lineHeight: 1.6, maxWidth: '560px' }}>
          Flags from the community. Level 4 (Harmful) entries are auto-hidden pending review.
          Dismiss if the flag is not valid. Resolve once you have taken action.
        </div>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && flags.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filter} flags.</p>
      )}

      {flags.map(flag => {
        const actor     = flag.actor
        const isHarmful = flag.flag_level === 4
        const isHidden  = actor?.status === 'suspended'

        return (
          <Card key={flag.id} style={{
            borderLeft: isHarmful
              ? '3px solid rgba(138,48,48,0.50)'
              : '3px solid rgba(76,107,69,0.30)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '8px', flexWrap: 'wrap' }}>
                  <FlagBadge level={flag.flag_level} />
                  {actor && <span style={{ ...body, fontSize: '17px', color: '#0F1523' }}>{actor.name}</span>}
                  {actor?.type && <Badge label={actor.type} />}
                  {isHidden && <Badge label="hidden" color="#8A3030" />}
                  {(actor?.domains?.[0] || actor?.domain_id) && (
                    <Badge label={domainLabel(actor.domains?.[0] || actor.domain_id)} color="#2A4A8A" />
                  )}
                </div>
                {actor?.location_name && (
                  <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>
                    {actor.location_name}
                  </div>
                )}
                {actor?.website && (
                  <div style={{ marginBottom: '8px' }}>
                    <a href={actor.website} target="_blank" rel="noopener noreferrer"
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold }}>
                      {actor.website}
                    </a>
                  </div>
                )}
                {flag.reason && (
                  <div style={{ background: 'rgba(76,107,69,0.04)', border: '1px solid rgba(76,107,69,0.18)',
                    borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                    <p style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginBottom: '4px' }}>Reason</p>
                    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
                      {flag.reason}
                    </p>
                  </div>
                )}
                <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
                  Flagged {new Date(flag.created_at).toLocaleDateString('en-GB',
                    { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {filter === 'open' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  {isHarmful && isHidden && (
                    <>
                      <Btn small onClick={() => restoreActor(flag)}>Restore</Btn>
                      <Btn small variant="danger" onClick={() => suspendActor(flag)}>Keep hidden</Btn>
                    </>
                  )}
                  {!isHarmful && <Btn small onClick={() => resolve(flag)}>Resolve</Btn>}
                  <Btn small variant="ghost" onClick={() => dismiss(flag)}>Dismiss</Btn>
                  {actor && (
                    <a href={`/org/${actor.slug || actor.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
                        textAlign: 'center', textDecoration: 'none' }}>
                      View entry
                    </a>
                  )}
                </div>
              )}
              {filter !== 'open' && <Badge label={filter} color="rgba(15,21,35,0.45)" />}
            </div>
          </Card>
        )
      })}
    </div>
      )}  {/* end subTab === 'actors' */}
    </div>
  )
}

// ── FLOOR TAB ─────────────────────────────────────────────────
// Shows seeded actors below the Actor Profile Floor — missing
// image, thin description, no contact path, no domain placement.
// The pre-seeding quality queue.

const FLOOR_CHECKS = [
  { key: 'no_image',       label: 'No image',        query: { column: 'image_url',    op: 'is',     val: null } },
  { key: 'thin_desc',      label: 'Thin description', desc: 'description shorter than 50 chars' },
  { key: 'no_website',     label: 'No website',       query: { column: 'website',      op: 'is',     val: null } },
  { key: 'no_domain',      label: 'No domain',        desc: 'empty domains array and no domain_id' },
  { key: 'no_tagline',     label: 'No tagline',       query: { column: 'tagline',      op: 'is',     val: null } },
]

function FloorTab({ toast }) {
  const [actors,       setActors]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('all')
  const [sort,         setSort]         = useState('gaps')
  const [outreachModal, setOutreachModal] = useState(null)  // actor | null
  const [outreachEmail, setOutreachEmail] = useState('')
  const [outreachName,  setOutreachName]  = useState('')
  const [outreachSending, setOutreachSending] = useState(false)

  async function load() {
    setLoading(true)
    const q = supabase
      .from('nextus_actors')
      .select('id, name, slug, type, domain_id, domains, image_url, image_provenance, description, tagline, website, story, status, seeded_by, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    const statusFilter = filter === 'staged' ? 'staged' : filter === 'live' ? 'live' : null
    // 'suspended' included so moderated actors stay reachable — Restore and
    // Delete live on these rows.
    const { data } = statusFilter ? await q.eq('status', statusFilter) : await q.in('status', ['staged', 'live', 'suspended'])

    const rows = (data || []).map(a => {
      const gaps = []
      if (!a.image_url)                                   gaps.push('image')
      if (!a.description || a.description.length < 50)   gaps.push('description')
      if (!a.website)                                     gaps.push('website')
      if (!a.tagline)                                     gaps.push('tagline')
      if (!a.story)                                       gaps.push('story')
      const hasDomain = (a.domains || []).length > 0 || a.domain_id
      if (!hasDomain)                                     gaps.push('domain')
      return { ...a, gaps, gapCount: gaps.length }
    }).filter(a => a.gapCount > 0 || a.status === 'suspended')

    const sorted = [...rows]
    if (sort === 'gaps')    sorted.sort((a, b) => b.gapCount - a.gapCount)
    if (sort === 'name')    sorted.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'created') sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setActors(sorted)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, sort])

  async function sendOutreach() {
    if (!outreachModal || !outreachEmail.trim() || outreachSending) return
    setOutreachSending(true)
    try {
      let token = null
      try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
      const r = await fetch('/api/actor-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ actorId: outreachModal.id, toEmail: outreachEmail.trim(), toName: outreachName.trim() || null }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.sent) { toast(`Outreach sent to ${d.to}`); setOutreachModal(null) }
      else toast('Outreach failed: ' + (d.error || `HTTP ${r.status}`))
    } catch (e) {
      toast('Outreach failed: ' + (e?.message || 'network error'))
    } finally {
      setOutreachSending(false)
    }
  }

  async function actorModerate(action, a) {
    if (action === 'admin_remove' && !window.confirm(`Permanently remove ${a.name}? Open challenges close; this is a tombstone, not reversible from here.`)) return
    try {
      let token = null
      try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
      const r = await fetch('/api/actor-remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action, actorId: a.id }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && (d.removed || d.suspended || d.restored)) {
        toast(d.removed ? `${a.name} removed` : d.suspended ? `${a.name} suspended` : `${a.name} restored`)
        load()
      } else toast(d.error || `Failed (${r.status})`)
    } catch (e) { toast(e?.message || 'Failed') }
  }

  const floorCount = actors.length
  const criticalCount = actors.filter(a => a.gaps.includes('image') || a.gaps.includes('description') || a.gaps.includes('domain')).length

  return (
    <div>
      {outreachModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,21,35,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setOutreachModal(null) }}>
          <div style={{ background: '#FAFAF7', border: '1.5px solid rgba(76,107,69,0.3)', borderRadius: '12px', padding: '28px 24px', maxWidth: '440px', width: '100%' }}>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', color: gold, marginBottom: '10px' }}>SEND OUTREACH — {outreachModal.name}</div>
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, marginBottom: '16px' }}>
              Rate-limited to once per 7 days per actor.
            </p>
            <div style={{ marginBottom: '10px' }}><Label>To email</Label><Input type="email" value={outreachEmail} onChange={v => setOutreachEmail(v)} placeholder="contact@example.org" /></div>
            <div style={{ marginBottom: '16px' }}><Label>Recipient name (optional)</Label><Input value={outreachName} onChange={v => setOutreachName(v)} placeholder="Defaults to actor name" /></div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Btn small onClick={sendOutreach} disabled={!outreachEmail.trim() || outreachSending}>{outreachSending ? 'Sending…' : 'Send'}</Btn>
              <Btn small variant="ghost" onClick={() => setOutreachModal(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[['all','All seeded'], ['staged','Staged only'], ['live','Live only']].map(([v, l]) => (
          <Btn key={v} small variant={filter === v ? 'primary' : 'ghost'} onClick={() => setFilter(v)}>{l}</Btn>
        ))}
        <span style={{ flex: 1 }} />
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', border: '1px solid rgba(76,107,69,0.3)', borderRadius: '4px', padding: '4px 8px', background: 'transparent', color: gold, cursor: 'pointer' }}>
          <option value="gaps">Sort by gap count</option>
          <option value="name">Sort by name</option>
          <option value="created">Sort by date</option>
        </select>
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {!loading && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
            <strong style={{ color: dark }}>{floorCount}</strong> entries below floor
          </div>
          {criticalCount > 0 && (
            <div style={{ ...body, fontSize: '13px', color: '#8A3030' }}>
              <strong>{criticalCount}</strong> missing image, description, or domain (blocks publishing)
            </div>
          )}
        </div>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading…</p>}
      {!loading && actors.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>All seeded actors are above the floor. Good work.</p>
      )}

      {actors.map(a => (
        <Card key={a.id} style={{ borderLeft: (a.gaps.includes('image') || a.gaps.includes('domain')) ? '3px solid rgba(138,48,48,0.50)' : '3px solid rgba(76,107,69,0.30)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                {a.type && <Badge label={a.type} />}
                <span style={{ ...body, fontSize: '16px', color: dark }}>{a.name}</span>
                <Badge label={a.status} color={a.status === 'live' ? '#2A6A3A' : 'rgba(15,21,35,0.45)'} />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {a.gaps.map(g => (
                  <span key={g} style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '20px',
                    background: ['image','domain','description'].includes(g) ? 'rgba(138,48,48,0.08)' : 'rgba(76,107,69,0.08)',
                    border: ['image','domain','description'].includes(g) ? '1px solid rgba(138,48,48,0.25)' : '1px solid rgba(76,107,69,0.25)',
                    color: ['image','domain','description'].includes(g) ? '#8A3030' : '#8A6020' }}>
                    missing {g}
                  </span>
                ))}
              </div>
              {a.website && (
                <a href={a.website} target="_blank" rel="noopener noreferrer"
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold }}>
                  {a.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              {a.slug && (
                <a href={`/org/${a.slug}/manage`} target="_blank" rel="noopener noreferrer"
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold, textDecoration: 'none', textAlign: 'center' }}>
                  Edit
                </a>
              )}
              {a.slug && (
                <a href={`/org/${a.slug}`} target="_blank" rel="noopener noreferrer"
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none', textAlign: 'center' }}>
                  View
                </a>
              )}
              <button type="button" onClick={() => { setOutreachModal(a); setOutreachEmail(''); setOutreachName('') }}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#2A6A3A', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '2px 0' }}>
                Outreach
              </button>
              {a.status === 'suspended' ? (
                <button type="button" onClick={() => actorModerate('admin_restore', a)}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#2A6A3A', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '2px 0' }}>
                  Restore
                </button>
              ) : (
                <button type="button" onClick={() => actorModerate('admin_suspend', a)}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#8A7030', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '2px 0' }}>
                  Suspend
                </button>
              )}
              <button type="button" onClick={() => actorModerate('admin_remove', a)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#8A3030', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '2px 0' }}>
                Delete
              </button>
              {a.image_provenance === 'hotlink' && (
                <button type="button" onClick={async () => {
                  let token = null
                  try { token = (await supabase.auth.getSession()).data.session?.access_token || null } catch {}
                  const r = await fetch('/api/actor-image-upload', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ actorId: a.id }) })
                  const d = await r.json()
                  d.uploaded ? toast('Image uploaded to storage') : toast('Upload failed: ' + d.error)
                  load()
                }}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: '#5F8DAA', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '2px 0' }}>
                  Upload img
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── DOMAIN DATA TAB ───────────────────────────────────────────
// Preserved from original

function DomainDataTab({ toast }) {
  const [domains, setDomains]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({})

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nextus_domains').select('*').order('name')
    setDomains(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    const { error } = await supabase.from('nextus_domains').update(form).eq('id', editing)
    if (error) { toast('Error: ' + error.message); return }
    toast('Domain updated')
    setEditing(null)
    load()
  }

  return (
    <div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {domains.map(d => (
        <Card key={d.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...body, fontSize: '17px', color: '#0F1523', marginBottom: '4px' }}>{d.name}</div>
              {editing === d.id ? (
                <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                  <div><label style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, display: 'block', marginBottom: '4px' }}>Horizon goal</label>
                    <textarea value={form.horizon_goal || ''} onChange={e => setForm(f => ({ ...f, horizon_goal: e.target.value }))} rows={2}
                      style={{ ...body, fontSize: '14px', color: '#0F1523', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(76,107,69,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.55, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn small onClick={save}>Save</Btn>
                    <Btn small variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                  </div>
                </div>
              ) : (
                <div>
                  {d.horizon_goal && <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: '4px 0 0' }}>{d.horizon_goal}</p>}
                </div>
              )}
            </div>
            {editing !== d.id && (
              <Btn small variant="ghost" onClick={() => { setEditing(d.id); setForm({ horizon_goal: d.horizon_goal }) }}>Edit</Btn>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── INDICATORS TAB ────────────────────────────────────────────
//
// Founder data console for the data-sourcing layer (Module 11).
//
// Four sub-views, sub-nav across the top:
//   • Catalog — list/edit nextus_domain_indicators rows. Add new rows.
//                 Filterable by domain. Inline edit of target_value,
//                 floor_value, rollup_weight, is_headline, headline_order,
//                 status, methodology_note. Status flip to 'deprecated'
//                 instead of hard delete (catalog rows referenced by
//                 historical values cannot be safely deleted).
//   • Values — for a chosen indicator, recent rows from
//                 nextus_domain_indicator_values, with fetch dates and
//                 confidence. Read-only. Cron writes; no human writes.
//   • Cron Log — recent nextus_indicator_fetch_log rows. Filter by status.
//                 Read-only audit trail.
//   • Signals — nextus_contributor_signals, filterable by domain. Editable
//                 vetting_status (self_submitted / reviewed / flagged) and
//                 hide-by-flag for misuse moderation.
//
// All RLS handled by the schema's existing policies — founder JWT carries
// the role claim, and write paths use the user's session, not service-role.

function IndicatorsTab({ toast }) {
  const [view, setView] = useState('catalog')

  return (
    <div>
      {/* Sub-nav */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(76,107,69,0.20)',
        paddingBottom: '8px',
      }}>
        {[
          ['catalog',  'Catalog'],
          ['values',   'Values'],
          ['cron-log', 'Cron Log'],
          ['signals',  'Signals'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              ...sc,
              fontSize: '13px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '8px 14px',
              background: view === id ? gold : 'transparent',
              color: view === id ? '#FFFFFF' : gold,
              border: `1px solid ${gold}`,
              borderRadius: '40px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'catalog'  && <IndicatorCatalogView  toast={toast} />}
      {view === 'values'   && <IndicatorValuesView   toast={toast} />}
      {view === 'cron-log' && <IndicatorCronLogView  toast={toast} />}
      {view === 'signals'  && <IndicatorSignalsView  toast={toast} />}
    </div>
  )
}

// ─── Catalog view ─────────────────────────────────────────────

function IndicatorCatalogView({ toast }) {
  const [rows, setRows]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterDomain, setFilterDomain] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')
  const [editing, setEditing]           = useState(null)
  const [form, setForm]                 = useState({})
  const [adding, setAdding]             = useState(false)
  const [valueCounts, setValueCounts]   = useState({})

  async function load() {
    setLoading(true)
    let q = supabase.from('nextus_domain_indicators').select('*').order('domain_id').order('headline_order', { ascending: true, nullsFirst: false }).order('name')
    if (filterDomain) q = q.eq('domain_id', filterDomain)
    if (filterStatus) q = q.eq('status', filterStatus)
    const { data } = await q
    setRows(data || [])
    setLoading(false)

    // Best-effort: count value rows per indicator so we can show "12 values"
    // as a freshness indicator. One round-trip per page load is acceptable
    // for a founder-only console.
    if (data && data.length > 0) {
      const ids = data.map(r => r.id)
      const { data: vals } = await supabase
        .from('nextus_domain_indicator_values')
        .select('indicator_id', { count: 'exact', head: false })
        .in('indicator_id', ids)
      const counts = {}
      for (const v of (vals || [])) {
        counts[v.indicator_id] = (counts[v.indicator_id] || 0) + 1
      }
      setValueCounts(counts)
    } else {
      setValueCounts({})
    }
  }

  useEffect(() => { load() }, [filterDomain, filterStatus])

  function startEdit(row) {
    setAdding(false)
    setEditing(row.id)
    setForm({
      name:               row.name || '',
      unit:               row.unit || '',
      domain_id:          row.domain_id,
      subdomain_slug:     row.subdomain_slug || '',
      tier:               row.tier,
      source_name:        row.source_name || '',
      source_url:         row.source_url || '',
      endpoint_url:       row.endpoint_url || '',
      native_resolution:  row.native_resolution,
      refresh_cadence:    row.refresh_cadence,
      direction_preferred:row.direction_preferred,
      methodology_note:   row.methodology_note || '',
      status:             row.status,
      is_headline:        row.is_headline,
      headline_order:     row.headline_order ?? '',
      target_value:       row.target_value ?? '',
      floor_value:        row.floor_value ?? '',
      rollup_weight:      row.rollup_weight ?? 1.0,
    })
  }

  function startAdd() {
    setEditing(null)
    setAdding(true)
    setForm({
      name:               '',
      unit:               '',
      domain_id:          filterDomain || 'nature',
      subdomain_slug:     '',
      tier:               'api',
      source_name:        '',
      source_url:         '',
      endpoint_url:       '',
      native_resolution:  'planetary',
      refresh_cadence:    'daily',
      direction_preferred:'down',
      methodology_note:   '',
      status:             'active',
      is_headline:        false,
      headline_order:     '',
      target_value:       '',
      floor_value:        '',
      rollup_weight:      1.0,
    })
  }

  async function save() {
    const payload = { ...form }
    // Empty strings → null for numeric / nullable fields
    for (const key of ['headline_order', 'target_value', 'floor_value', 'subdomain_slug', 'source_url', 'endpoint_url', 'methodology_note', 'unit']) {
      if (payload[key] === '' || payload[key] === undefined) payload[key] = null
    }
    if (payload.rollup_weight === '' || payload.rollup_weight === undefined) payload.rollup_weight = 1.0
    payload.updated_at = new Date().toISOString()

    if (adding) {
      const { error } = await supabase.from('nextus_domain_indicators').insert(payload)
      if (error) { toast('Insert error: ' + error.message); return }
      toast('Indicator added')
      setAdding(false)
    } else {
      const { error } = await supabase.from('nextus_domain_indicators').update(payload).eq('id', editing)
      if (error) { toast('Update error: ' + error.message); return }
      toast('Indicator updated')
      setEditing(null)
    }
    setForm({})
    load()
  }

  async function deprecate(row) {
    if (!confirm(`Mark "${row.name}" as deprecated? Historical values stay; future cron skips this row.`)) return
    const { error } = await supabase
      .from('nextus_domain_indicators')
      .update({ status: 'deprecated', updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) { toast('Error: ' + error.message); return }
    toast('Indicator deprecated')
    load()
  }

  async function reactivate(row) {
    const { error } = await supabase
      .from('nextus_domain_indicators')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) { toast('Error: ' + error.message); return }
    toast('Indicator re-activated')
    load()
  }

  return (
    <div>
      {/* Filters + Add button */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          value={filterDomain}
          onChange={setFilterDomain}
          options={DOMAINS_WITH_EMPTY}
          style={{ maxWidth: '220px' }}
        />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'active',     label: 'Active' },
            { value: 'proposed',   label: 'Proposed' },
            { value: 'deprecated', label: 'Deprecated' },
            { value: '',           label: 'All statuses' },
          ]}
          style={{ maxWidth: '180px' }}
        />
        <div style={{ flex: 1 }} />
        <Btn small onClick={startAdd}>+ Add indicator</Btn>
      </div>

      {/* Add form */}
      {adding && (
        <Card style={{ borderColor: gold, borderWidth: '2px' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginBottom: '12px', fontWeight: 600 }}>
            ADD NEW INDICATOR
          </div>
          <IndicatorForm form={form} setForm={setForm} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <Btn small onClick={save}>Add</Btn>
            <Btn small variant="ghost" onClick={() => { setAdding(false); setForm({}) }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>
          No indicators match these filters.
        </p>
      )}

      {/* Catalog rows */}
      {rows.map(row => (
        <Card key={row.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{ ...body, fontSize: '17px', color: '#0F1523' }}>{row.name}</span>
                <Badge label={DOMAIN_LIST.find(d => d.value === row.domain_id)?.label || row.domain_id} />
                {row.is_headline && <Badge label={`HEADLINE${row.headline_order != null ? ' #' + row.headline_order : ''}`} color="rgba(42, 107, 94, 0.85)" />}
                {row.status === 'deprecated' && <Badge label="DEPRECATED" color="rgba(138, 48, 48, 0.85)" />}
                {row.status === 'proposed'   && <Badge label="PROPOSED" color="rgba(15,21,35,0.55)" />}
              </div>
              <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', marginBottom: '6px' }}>
                {row.source_name}{row.unit ? ` · ${row.unit}` : ''} · {row.tier} · {row.refresh_cadence}{row.direction_preferred !== 'context' ? ` · ${row.direction_preferred}` : ' · context'}
              </div>
              {(row.target_value != null || row.floor_value != null) && (
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: gold, marginBottom: '6px' }}>
                  TARGET {row.target_value ?? '—'} · FLOOR {row.floor_value ?? '—'} · WEIGHT {row.rollup_weight ?? 1.0}
                </div>
              )}
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)' }}>
                {valueCounts[row.id] || 0} VALUE ROWS COLLECTED
              </div>
              {editing === row.id && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(76,107,69,0.20)' }}>
                  <IndicatorForm form={form} setForm={setForm} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <Btn small onClick={save}>Save</Btn>
                    <Btn small variant="ghost" onClick={() => { setEditing(null); setForm({}) }}>Cancel</Btn>
                  </div>
                </div>
              )}
            </div>
            {editing !== row.id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                <Btn small variant="ghost" onClick={() => startEdit(row)}>Edit</Btn>
                {row.status === 'active' && (
                  <Btn small variant="ghost" onClick={() => deprecate(row)}>Deprecate</Btn>
                )}
                {row.status === 'deprecated' && (
                  <Btn small variant="ghost" onClick={() => reactivate(row)}>Reactivate</Btn>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─── Reusable indicator edit form ─────────────────────────────

function IndicatorForm({ form, setForm }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fieldLabel = { ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, display: 'block', marginBottom: '4px', fontWeight: 600 }
  const fieldInput = { ...body, fontSize: '13px', color: '#0F1523', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(76,107,69,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' }
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
        <div>
          <label style={fieldLabel}>NAME *</label>
          <input type="text" value={form.name || ''} onChange={e => set('name', e.target.value)} style={fieldInput} />
        </div>
        <div>
          <label style={fieldLabel}>UNIT</label>
          <input type="text" value={form.unit || ''} onChange={e => set('unit', e.target.value)} style={fieldInput} placeholder="e.g. ppm, %, count" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={fieldLabel}>DOMAIN *</label>
          <Select
            value={form.domain_id || ''}
            onChange={v => set('domain_id', v)}
            options={DOMAIN_LIST}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={fieldLabel}>SUBDOMAIN SLUG</label>
          <input type="text" value={form.subdomain_slug || ''} onChange={e => set('subdomain_slug', e.target.value)} style={fieldInput} placeholder="e.g. earth, air, water" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div>
          <label style={fieldLabel}>TIER *</label>
          <Select
            value={form.tier || 'api'}
            onChange={v => set('tier', v)}
            options={[
              { value: 'api',         label: 'API' },
              { value: 'scrape',      label: 'Scrape' },
              { value: 'contributor', label: 'Contributor' },
            ]}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={fieldLabel}>RESOLUTION *</label>
          <Select
            value={form.native_resolution || 'planetary'}
            onChange={v => set('native_resolution', v)}
            options={[
              { value: 'local',     label: 'Local' },
              { value: 'regional',  label: 'Regional' },
              { value: 'planetary', label: 'Planetary' },
            ]}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={fieldLabel}>CADENCE *</label>
          <Select
            value={form.refresh_cadence || 'daily'}
            onChange={v => set('refresh_cadence', v)}
            options={[
              { value: 'daily',        label: 'Daily' },
              { value: 'weekly',       label: 'Weekly' },
              { value: 'monthly',      label: 'Monthly' },
              { value: 'annual',       label: 'Annual' },
              { value: 'event-driven', label: 'Event-driven' },
            ]}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div>
        <label style={fieldLabel}>SOURCE NAME *</label>
        <input type="text" value={form.source_name || ''} onChange={e => set('source_name', e.target.value)} style={fieldInput} placeholder="e.g. NOAA Global Monitoring Laboratory" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={fieldLabel}>SOURCE URL</label>
          <input type="text" value={form.source_url || ''} onChange={e => set('source_url', e.target.value)} style={fieldInput} placeholder="https://" />
        </div>
        <div>
          <label style={fieldLabel}>ENDPOINT URL</label>
          <input type="text" value={form.endpoint_url || ''} onChange={e => set('endpoint_url', e.target.value)} style={fieldInput} placeholder="https://api…" />
        </div>
      </div>

      <div>
        <label style={fieldLabel}>METHODOLOGY NOTE</label>
        <textarea value={form.methodology_note || ''} onChange={e => set('methodology_note', e.target.value)} rows={2} style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.55 }} />
      </div>

      <div style={{ paddingTop: '8px', borderTop: '1px dashed rgba(76,107,69,0.20)' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, fontWeight: 600, marginBottom: '10px' }}>
          ROLLUP &amp; STATUS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={fieldLabel}>DIRECTION *</label>
            <Select
              value={form.direction_preferred || 'context'}
              onChange={v => set('direction_preferred', v)}
              options={[
                { value: 'up',      label: 'Up (higher better)' },
                { value: 'down',    label: 'Down (lower better)' },
                { value: 'context', label: 'Context (no rollup)' },
              ]}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={fieldLabel}>TARGET VALUE</label>
            <input type="number" step="any" value={form.target_value ?? ''} onChange={e => set('target_value', e.target.value)} style={fieldInput} placeholder="scores 10" />
          </div>
          <div>
            <label style={fieldLabel}>FLOOR VALUE</label>
            <input type="number" step="any" value={form.floor_value ?? ''} onChange={e => set('floor_value', e.target.value)} style={fieldInput} placeholder="scores 0" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={fieldLabel}>STATUS *</label>
            <Select
              value={form.status || 'active'}
              onChange={v => set('status', v)}
              options={[
                { value: 'active',     label: 'Active' },
                { value: 'proposed',   label: 'Proposed' },
                { value: 'deprecated', label: 'Deprecated' },
              ]}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={fieldLabel}>ROLLUP WEIGHT</label>
            <input type="number" step="0.1" value={form.rollup_weight ?? 1.0} onChange={e => set('rollup_weight', e.target.value)} style={fieldInput} />
          </div>
          <div>
            <label style={fieldLabel}>HEADLINE</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
              <label style={{ ...body, fontSize: '13px', color: '#0F1523', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form.is_headline} onChange={e => set('is_headline', e.target.checked)} />
                <span>Headline</span>
              </label>
              {form.is_headline && (
                <input type="number" min="0" max="20" value={form.headline_order ?? ''} onChange={e => set('headline_order', e.target.value)} style={{ ...fieldInput, width: '60px' }} placeholder="#" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Values view — recent rows for a chosen indicator ──────────

function IndicatorValuesView({ toast }) {
  const [indicators, setIndicators] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    supabase
      .from('nextus_domain_indicators')
      .select('id, name, domain_id, unit, source_name')
      .eq('status', 'active')
      .order('domain_id')
      .order('name')
      .then(({ data }) => setIndicators(data || []))
  }, [])

  useEffect(() => {
    if (!selectedId) { setRows([]); return }
    setLoading(true)
    supabase
      .from('nextus_domain_indicator_values')
      .select('id, value_numeric, value_text, observed_at, fetched_at, is_current, confidence, focus_id')
      .eq('indicator_id', selectedId)
      .order('observed_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRows(data || [])
        setLoading(false)
      })
  }, [selectedId])

  const indicatorOptions = [
    { value: '', label: 'Choose an indicator…' },
    ...indicators.map(i => ({
      value: i.id,
      label: `${DOMAIN_LIST.find(d => d.value === i.domain_id)?.label || i.domain_id}: ${i.name}`,
    })),
  ]

  const selected = indicators.find(i => i.id === selectedId)

  return (
    <div>
      <div style={{ marginBottom: '20px', maxWidth: '480px' }}>
        <Select value={selectedId} onChange={setSelectedId} options={indicatorOptions} />
      </div>

      {!selectedId && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>
          Pick an indicator above to see its recent value history. Cron-fed; no human writes.
        </p>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading…</p>}

      {selectedId && !loading && rows.length === 0 && (
        <Card>
          <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)' }}>
            No values collected yet. Either the cron has not run since this indicator was added, or the source handler is not implemented (check the Cron Log view).
          </div>
        </Card>
      )}

      {selectedId && rows.length > 0 && (
        <div>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginBottom: '10px', fontWeight: 600 }}>
            {rows.length} VALUE ROW{rows.length === 1 ? '' : 'S'} · MOST RECENT 50
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.20)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 140px 80px', padding: '10px 14px', borderBottom: '1px solid rgba(76,107,69,0.20)', background: 'rgba(76,107,69,0.04)', ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, fontWeight: 600 }}>
              <div>OBSERVED</div>
              <div>VALUE</div>
              <div>FETCHED</div>
              <div>CONFIDENCE</div>
              <div>CURRENT</div>
            </div>
            {rows.map(r => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 140px 80px', padding: '10px 14px', borderBottom: '1px solid rgba(76,107,69,0.10)', ...body, fontSize: '13px', color: '#0F1523' }}>
                <div style={{ color: 'rgba(15,21,35,0.72)' }}>{formatTimestamp(r.observed_at)}</div>
                <div>{r.value_numeric != null ? `${r.value_numeric}${selected?.unit ? ' ' + selected.unit : ''}` : (r.value_text || '—')}</div>
                <div style={{ color: 'rgba(15,21,35,0.55)', fontSize: '13px' }}>{formatTimestamp(r.fetched_at)}</div>
                <div style={{ color: 'rgba(15,21,35,0.55)', fontSize: '13px' }}>{r.confidence || '—'}</div>
                <div>{r.is_current ? <Badge label="✓" color="rgba(42, 107, 94, 0.85)" /> : null}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cron log view ────────────────────────────────────────────

function IndicatorCronLogView({ toast }) {
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [indicatorMap, setIndicatorMap] = useState({})

  async function load() {
    setLoading(true)

    // Names lookup so we can show "what failed" not just an indicator UUID.
    const { data: indicators } = await supabase
      .from('nextus_domain_indicators')
      .select('id, name, domain_id')
    const map = {}
    for (const i of (indicators || [])) map[i.id] = i
    setIndicatorMap(map)

    let q = supabase
      .from('nextus_indicator_fetch_log')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(200)
    if (filterStatus) q = q.eq('status', filterStatus)
    const { data } = await q
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus])

  const statusColour = {
    'ok':              'rgba(42, 107, 94, 0.85)',
    'skipped':         'rgba(15,21,35,0.55)',
    'failed':          'rgba(138, 48, 48, 0.85)',
    'not-implemented': 'rgba(38,36,32, 0.85)',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: '',                label: 'All statuses' },
            { value: 'ok',              label: 'OK' },
            { value: 'skipped',         label: 'Skipped' },
            { value: 'failed',          label: 'Failed' },
            { value: 'not-implemented', label: 'Not implemented' },
          ]}
          style={{ maxWidth: '220px' }}
        />
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>
          No log entries match these filters.
        </p>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(76,107,69,0.20)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 100px 1fr 80px 80px', padding: '10px 14px', borderBottom: '1px solid rgba(76,107,69,0.20)', background: 'rgba(76,107,69,0.04)', ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, fontWeight: 600 }}>
            <div>RUN AT</div>
            <div>STATUS</div>
            <div>INDICATOR / MESSAGE</div>
            <div>HTTP</div>
            <div>MS</div>
          </div>
          {rows.map(r => {
            const ind = r.indicator_id ? indicatorMap[r.indicator_id] : null
            return (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '160px 100px 1fr 80px 80px', padding: '10px 14px', borderBottom: '1px solid rgba(76,107,69,0.10)', ...body, fontSize: '13px', color: '#0F1523' }}>
                <div style={{ color: 'rgba(15,21,35,0.72)', fontSize: '13px' }}>{formatTimestamp(r.run_at)}</div>
                <div>
                  <Badge label={r.status.toUpperCase()} color={statusColour[r.status] || gold} />
                </div>
                <div style={{ minWidth: 0 }}>
                  {ind ? (
                    <div>
                      <div style={{ color: '#0F1523', fontSize: '13px' }}>{ind.name}</div>
                      <div style={{ color: 'rgba(15,21,35,0.55)', fontSize: '13px' }}>{DOMAIN_LIST.find(d => d.value === ind.domain_id)?.label || ind.domain_id}</div>
                      {r.message && <div style={{ color: 'rgba(138, 48, 48, 0.85)', fontSize: '13px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.message}</div>}
                    </div>
                  ) : (
                    <div style={{ color: 'rgba(15,21,35,0.55)', fontStyle: 'italic' }}>{r.message || '—'}</div>
                  )}
                </div>
                <div style={{ color: 'rgba(15,21,35,0.55)', fontSize: '13px' }}>{r.http_status ?? '—'}</div>
                <div style={{ color: 'rgba(15,21,35,0.55)', fontSize: '13px' }}>{r.duration_ms ?? '—'}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Contributor signals view ─────────────────────────────────

function IndicatorSignalsView({ toast }) {
  const [rows, setRows]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterDomain, setFilterDomain] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  async function load() {
    setLoading(true)
    let q = supabase
      .from('nextus_contributor_signals')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(100)
    if (filterDomain) q = q.eq('domain_id', filterDomain)
    if (filterStatus) q = q.eq('vetting_status', filterStatus)
    const { data } = await q
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterDomain, filterStatus])

  async function setVetting(row, status) {
    const { error } = await supabase
      .from('nextus_contributor_signals')
      .update({ vetting_status: status })
      .eq('id', row.id)
    if (error) { toast('Error: ' + error.message); return }
    toast(`Marked as ${status}`)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Select value={filterDomain} onChange={setFilterDomain} options={DOMAINS_WITH_EMPTY} style={{ maxWidth: '220px' }} />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: '',               label: 'All vetting statuses' },
            { value: 'self_submitted', label: 'Self-submitted' },
            { value: 'reviewed',       label: 'Reviewed' },
            { value: 'flagged',        label: 'Flagged' },
          ]}
          style={{ maxWidth: '220px' }}
        />
      </div>

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>
          No contributor signals match these filters.
        </p>
      )}

      {rows.map(r => (
        <Card key={r.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '6px' }}>
                <Badge label={DOMAIN_LIST.find(d => d.value === r.domain_id)?.label || r.domain_id} />
                <Badge label={r.signal_type.toUpperCase()} color="rgba(15,21,35,0.55)" />
                <Badge
                  label={r.vetting_status.replace(/_/g, ' ').toUpperCase()}
                  color={
                    r.vetting_status === 'reviewed' ? 'rgba(42, 107, 94, 0.85)' :
                    r.vetting_status === 'flagged'  ? 'rgba(138, 48, 48, 0.85)' :
                    'rgba(38,36,32, 0.85)'
                  }
                />
                <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.55)' }}>
                  {formatTimestamp(r.submitted_at)}
                </span>
              </div>
              <p style={{ ...body, fontSize: '14px', color: '#0F1523', lineHeight: 1.6, margin: 0 }}>
                {r.signal_text}
              </p>
              {r.signal_value_numeric != null && (
                <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.10em', color: gold, marginTop: '6px' }}>
                  VALUE: {r.signal_value_numeric}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              {r.vetting_status !== 'reviewed' && <Btn small variant="ghost" onClick={() => setVetting(r, 'reviewed')}>Mark reviewed</Btn>}
              {r.vetting_status !== 'flagged'  && <Btn small variant="ghost" onClick={() => setVetting(r, 'flagged')}>Flag</Btn>}
              {r.vetting_status === 'flagged'  && <Btn small variant="ghost" onClick={() => setVetting(r, 'self_submitted')}>Unflag</Btn>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// Helper used by the indicator sub-views.
function formatTimestamp(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso.slice(0, 16).replace('T', ' ')
  }
}

// ── SUBDOMAINS TAB ────────────────────────────────────────────
// Preserved from original (condensed but complete)

function SubdomainsTab({ toast }) {
  const [subdomains, setSubdomains] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterDomain, setFilterDomain] = useState('')

  async function load() {
    setLoading(true)
    let q = supabase.from('nextus_subdomains').select('*').order('domain_id').order('name')
    if (filterDomain) q = q.eq('domain_id', filterDomain)
    const { data } = await q
    setSubdomains(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterDomain])

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Select value={filterDomain} onChange={setFilterDomain} options={DOMAINS_WITH_EMPTY} style={{ maxWidth: '240px' }} />
      </div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && subdomains.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No subdomains found.</p>}
      {subdomains.map(s => (
        <Card key={s.id} style={{ padding: '12px 18px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...body, fontSize: '16px', color: '#0F1523' }}>{s.name}</span>
            <Badge label={DOMAIN_LIST.find(d => d.value === s.domain_id)?.label || s.domain_id} color="rgba(15,21,35,0.55)" />
          </div>
          {s.description && <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '4px', lineHeight: 1.55 }}>{s.description}</p>}
        </Card>
      ))}
    </div>
  )
}

// ── NEEDS TAB ─────────────────────────────────────────────────
// Preserved from original

function NeedsTab({ toast }) {
  const [needs, setNeeds]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterStatus, setFilterStatus] = useState('open')

  async function load() {
    setLoading(true)
    let q = supabase.from('nextus_needs').select('*, nextus_actors(name)').order('created_at', { ascending: false }).limit(100)
    if (filterStatus) q = q.eq('status', filterStatus)
    const { data } = await q
    setNeeds(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus] )

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
        {[['open','Open'], ['fulfilled','Fulfilled'], ['closed','Closed'], ['','All']].map(([val, label]) => (
          <Btn key={label} small variant={filterStatus === val ? 'primary' : 'ghost'} onClick={() => setFilterStatus(val)}>{label}</Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && needs.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filterStatus} needs.</p>}
      {needs.map(n => (
        <Card key={n.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ ...body, fontSize: '16px', color: '#0F1523' }}>{n.title || n.description?.slice(0, 60)}</span>
                <Badge label={n.status} color={n.status === 'open' ? '#2A6B3A' : 'rgba(15,21,35,0.55)'} />
              </div>
              {n.nextus_actors?.name && <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: gold }}>{n.nextus_actors.name}</div>}
              {n.description && <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '4px', lineHeight: 1.6 }}>{n.description.slice(0, 200)}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── CONTRIBUTIONS TAB ─────────────────────────────────────────
// Preserved from original — integrity warning badge preserved.

function ContributionsTab({ toast }) {
  const [contribs, setContribs]               = useState([])
  const [loading, setLoading]                 = useState(true)
  const [filterConfirmed, setFilterConfirmed] = useState('')
  const [filterOutcome, setFilterOutcome]     = useState('')
  const [filterType, setFilterType]           = useState('')

  async function fetchContribs() {
    setLoading(true)
    let q = supabase.from('nextus_contributions').select('*, nextus_actors(name, domain_id)').order('created_at', { ascending: false }).limit(100)
    if (filterConfirmed === 'confirmed')   q = q.eq('confirmed_by_actor', true)
    if (filterConfirmed === 'unconfirmed') q = q.eq('confirmed_by_actor', false)
    if (filterOutcome === 'missing')       q = q.eq('outcome_reported', false).eq('confirmed_by_actor', true)
    if (filterType) q = q.eq('contribution_type', filterType)
    const { data } = await q
    setContribs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchContribs() }, [filterConfirmed, filterOutcome, filterType])

  const typeColor = { hours: '#2A4A8A', capital: '#2A6B3A', skills: gold, resources: '#6B2A6B', community: '#2A6B6B', other: 'rgba(15,21,35,0.55)' }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <Select value={filterConfirmed} onChange={setFilterConfirmed} options={[{ value: '', label: 'All contributions' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'unconfirmed', label: 'Unconfirmed' }]} />
        <Select value={filterOutcome} onChange={setFilterOutcome} options={[{ value: '', label: 'All outcomes' }, { value: 'missing', label: 'Outcome report missing' }]} />
        <Select value={filterType} onChange={setFilterType} options={[{ value: '', label: 'All types' }, ...['hours','capital','skills','resources','community','other'].map(t => ({ value: t, label: t }))]} />
        <Btn onClick={fetchContribs} small>Refresh</Btn>
      </div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && contribs.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No contributions found.</p>}
      {contribs.map(c => (
        <Card key={c.id}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge label={c.contribution_type} color={typeColor[c.contribution_type]} />
                {c.amount && <span style={{ ...sc, fontSize: '13px', color: gold }}>{c.contribution_type === 'capital' ? `${c.currency} ${c.amount}` : `${c.amount} hrs`}</span>}
                {c.confirmed_by_actor ? <Badge label="confirmed" color="#2A6B3A" /> : <Badge label="unconfirmed" color="rgba(15,21,35,0.55)" />}
                {/* Integrity warning — preserved from original */}
                {c.confirmed_by_actor && !c.outcome_reported && <Badge label="outcome missing" color="#8A3030" />}
              </div>
              <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
                To: {c.nextus_actors?.name || c.actor_id}{c.contribution_date && ' · ' + c.contribution_date}
              </div>
              {c.description && <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '4px', lineHeight: 1.6 }}>{c.description.slice(0, 160)}{c.description.length > 160 ? '...' : ''}</p>}
              {c.outcome_report && <p style={{ ...body, fontSize: '14px', color: '#2A6B3A', marginTop: '4px' }}>Outcome: {c.outcome_report.slice(0, 160)}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── REMAINING TABS (all preserved) ────────────────────────────

function WaitlistTab({ toast }) {
  const [entries, setEntries]   = useState([])
  const [loading, setLoading]   = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('nextus_waitlist').select('*').order('created_at', { ascending: false }).limit(200)
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function remove(entry) {
    if (!window.confirm(`Remove ${entry.email} from the waitlist? This cannot be undone.`)) return
    const { error } = await supabase.from('nextus_waitlist').delete().eq('id', entry.id)
    if (error) { toast(`Could not remove: ${error.message}`); return }
    toast(`${entry.email} removed`)
    setEntries(es => es.filter(e => e.id !== entry.id))
  }

  return (
    <div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>
        {entries.length} entries
      </div>
      {entries.map(e => (
        <Card key={e.id} style={{ padding: '10px 16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>{e.email}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {e.source && <Badge label={e.source} color="rgba(15,21,35,0.55)" />}
              <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{e.created_at?.slice(0, 10)}</span>
              <Btn small variant="ghost" onClick={() => remove(e)}>Remove</Btn>
            </div>
          </div>
          {e.note && <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', margin: '4px 0 0', lineHeight: 1.5 }}>{e.note}</p>}
        </Card>
      ))}
    </div>
  )
}

function ResourcesTab({ toast }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterStatus, setFilterStatus] = useState('active')

  async function load() {
    const { data } = await supabase.from('crisis_resources').select('*')
      .eq('status', filterStatus || 'active').order('country_code').limit(200)
    setResources(data || [])
    setLoading(false)
  }

  async function setStatus(id, status) {
    await supabase.from('crisis_resources').update({ status }).eq('id', id)
    toast(`Marked ${status}`)
    load()
  }

  useEffect(() => { setLoading(true); load() }, [filterStatus])

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        {[['active','Active'], ['unverified','Unverified'], ['dead','Dead']].map(([val, label]) => (
          <Btn key={val} small variant={filterStatus === val ? 'primary' : 'ghost'} onClick={() => setFilterStatus(val)}>{label}</Btn>
        ))}
      </div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {resources.map(r => (
        <Card key={r.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <div style={{ ...body, fontSize: '16px', color: '#0F1523', marginBottom: '2px' }}>{r.name}</div>
              <div style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}>{r.country_code}{r.region ? ` · ${r.region}` : ''}</div>
              {r.phone && <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', marginTop: '4px' }}>{r.phone}</div>}
              {r.description && <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '4px', lineHeight: 1.5 }}>{r.description}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
              {r.status !== 'active'      && <Btn small onClick={() => setStatus(r.id, 'active')}>Active</Btn>}
              {r.status !== 'unverified'  && <Btn small variant="ghost" onClick={() => setStatus(r.id, 'unverified')}>Unverified</Btn>}
              {r.status !== 'dead'        && <Btn small variant="ghost" onClick={() => setStatus(r.id, 'dead')}>Dead</Btn>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function GroupsTab({ toast }) {
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('groups').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setGroups(data || []); setLoading(false) })
  }, [])

  return (
    <div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {groups.map(g => (
        <Card key={g.id}>
          <div style={{ ...body, fontSize: '16px', color: '#0F1523', marginBottom: '2px' }}>{g.name}</div>
          <div style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}>{g.type} · {g.created_at?.slice(0, 10)}</div>
        </Card>
      ))}
    </div>
  )
}

function MembersTab({ toast }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('group_members').select('*, groups(name), users(email)').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setMembers(data || []); setLoading(false) })
  }, [])

  return (
    <div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {members.map(m => (
        <Card key={m.id} style={{ padding: '10px 16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>{m.users?.email}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge label={m.groups?.name || m.group_id} />
              <Badge label={m.role || 'member'} color="rgba(15,21,35,0.55)" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function EntitlementsTab({ toast }) {
  const [entitlements, setEntitlements] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    supabase.from('entitlements').select('*, users(email)').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setEntitlements(data || []); setLoading(false) })
  }, [])

  return (
    <div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {entitlements.map(e => (
        <Card key={e.id} style={{ padding: '10px 16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>{e.users?.email || e.user_id}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge label={e.entitlement_type} />
              {e.expires_at && <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>exp: {e.expires_at?.slice(0,10)}</span>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function UsersTab({ toast }) {
  const navigate            = useNavigate()
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    let q = supabase.from('users').select('id, email, first_name, last_name, status, created_at, beta_access').order('created_at', { ascending: false }).limit(100)
    if (search) q = q.ilike('email', `%${search}%`)
    const { data } = await q
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleBetaAccess(user) {
    const next = !user.beta_access
    await supabase.from('users').update({ beta_access: next }).eq('id', user.id)
    toast(`${user.email} beta access ${next ? 'granted' : 'removed'}`)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <Input value={search} onChange={setSearch} placeholder="Search by email..." onKeyDown={e => e.key === 'Enter' && load()} style={{ maxWidth: '320px' }} />
        <Btn small onClick={load}>Search</Btn>
      </div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {users.map(u => (
        <Card key={u.id} onClick={() => navigate(`/profile/${u.id}`)} style={{ padding: '10px 16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>{u.email}</span>
              {u.first_name && <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginLeft: '8px' }}>{u.first_name} {u.last_name}</span>}
            </div>
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {u.beta_access && <Badge label="beta" color="#2A4A8A" />}
              <Btn small variant="ghost" onClick={() => toggleBetaAccess(u)}>
                {u.beta_access ? 'Remove beta' : 'Grant beta'}
              </Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function GrantsTab() {
  const [grants, setGrants]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('access').select('*, users(email)').order('granted_at', { ascending: false }).limit(200)
      .then(({ data }) => { setGrants(data || []); setLoading(false) })
  }, [])

  return (
    <div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {grants.map(g => (
        <Card key={g.id} style={{ padding: '10px 16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>{g.users?.email || g.user_id}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge label={g.tier || 'access'} />
              <Badge label={g.source || 'admin'} color="rgba(15,21,35,0.55)" />
              <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>{g.granted_at?.slice(0,10)}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────

export function AdminConsolePage() {
  const { user, loading } = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('Platform')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => setToast(msg), [])

  useEffect(() => {
    if (!loading && (!user || !isFounder(user))) {
      navigate('/dashboard')
    }
  }, [user, loading, navigate])

  if (loading || !user || !isFounder(user)) {
    return <div style={{ background: '#FAFAF7', minHeight: '100dvh' }}><Nav /></div>
  }

  return (
    <div style={{ background: bg, minHeight: '100dvh' }}>
      <Nav />
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '96px 40px 120px' }}>
        <Eyebrow>Admin</Eyebrow>
        <h1 style={{ ...body, fontSize: 'clamp(32px,4vw,48px)', fontWeight: 400,
          color: '#0F1523', marginBottom: '8px', lineHeight: 1.08 }}>
          Console
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)',
          marginBottom: '48px' }}>
          Platform health, actors, domains, needs, contributions, waitlist, access.
          Horizon Floor checks on all actor saves.
        </p>
        <p style={{ ...body, fontSize: '15px', marginBottom: '40px' }}>
          <a href="/me/export" style={{ color: 'rgba(15,21,35,0.75)' }}>Horizon Export · your personal work as one document →</a>
        </p>

        <TabBar active={tab} setActive={setTab} />

        {tab === 'Now'           && <NowTab onNavigate={setTab} />}
        {tab === 'Platform'      && <PlatformTab onNavigate={setTab} />}
        {tab === 'Actors'        && <ActorsTab       toast={showToast} />}
        {tab === 'Add'           && <AddTab          toast={showToast} />}
        {tab === 'Seed'          && <SeedTab         toast={showToast} />}
        {tab === 'Place'         && <PlaceTab        toast={showToast} />}
        {tab === 'Flags'         && <FlagsTab        toast={showToast} />}
        {tab === 'Moments'       && <MomentsReviewQueue toast={showToast} />}
        {tab === 'Chains'        && <ChainsTab       toast={showToast} />}
        {tab === 'Practices'     && <PracticesTab    toast={showToast} />}
        {tab === 'Prism'         && <PrismTab />}
        {tab === 'Floor'         && <FloorTab         toast={showToast} />}
        {tab === 'Domain Data'   && <DomainDataTab   toast={showToast} />}
        {tab === 'Indicators'    && <IndicatorsTab   toast={showToast} />}
        {tab === 'Subdomains'    && <SubdomainsTab   toast={showToast} />}
        {tab === 'Needs'         && <NeedsTab        toast={showToast} />}
        {tab === 'Contributions' && <ContributionsTab toast={showToast} />}
        {tab === 'Waitlist'      && <WaitlistTab     toast={showToast} />}
        {tab === 'Resources'     && <ResourcesTab    toast={showToast} />}
        {tab === 'Groups'        && <GroupsTab       toast={showToast} />}
        {tab === 'Members'       && <MembersTab      toast={showToast} />}
        {tab === 'Entitlements'  && <EntitlementsTab toast={showToast} />}
        {tab === 'Users'         && <UsersTab        toast={showToast} />}
        {tab === 'Grants'        && <GrantsTab />}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
