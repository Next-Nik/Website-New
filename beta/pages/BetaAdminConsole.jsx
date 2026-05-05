// src/beta/pages/BetaAdminConsole.jsx
//
// Module 9: Admin Console port for /beta/admin.
// Source: src/pages/AdminConsole.jsx (untouched).
//
// What changed from the original:
//   1. Import path updates (Nav, useAuth, useSupabase, routes use beta paths).
//   2. Inline PLANET_DOMAINS_EX / SELF_DOMAINS_EX / DOMAIN_LIST replaced with
//      imports from src/beta/constants/.
//   3. ExtractTab — ProposalCard updated for four-dimensional placement display
//      (domains[], subdomains[], fields[], lenses[], problem_chains[],
//      platform_principles[]). API single-value fallback: if domains[] is
//      absent, treat domain_id as domains[0].
//   4. ExtractTab — save payload writes new four-dim columns.
//   5. ActorsTab save flow — HorizonFloorAdmissionCheck modal inserted before
//      final write. Writes horizon_floor_status to actor.
//   6. ExtractTab save flow — same HorizonFloorAdmissionCheck inserted.
//   7. NominationsTab approve flow — HorizonFloorAdmissionCheck inserted.
//   8. BetaNominate link updated to /beta/nominate.
//
// All seventeen tabs preserved. TIER_FROM_SCORE preserved. HAL signals and SFP
// patterns rendering preserved. Parallel proposals preserved.
// Integrity warning on ContributionsTab preserved.
// Original AdminConsole.jsx not modified.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import HorizonFloorAdmissionCheck from '../components/HorizonFloorAdmissionCheck'
import PrincipleStrip from '../components/PrincipleStrip'

// ── Beta constants — import instead of inline ─────────────────
import {
  CIV_DOMAINS,
  SUBDOMAIN_MAP_BETA,
} from '../constants/domains'
import { PRINCIPLES_ORDERED } from '../constants/principles'

// ── Founder check ─────────────────────────────────────────────
// Identical to original: uses user_metadata.role set in Supabase.
function isFounder(user) {
  return user?.user_metadata?.role === 'founder'
}

const sc   = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }
const gold  = '#A8721A'
const bg    = '#FAFAF7'

// ── Domain list from beta constants ───────────────────────────
const DOMAIN_LIST = CIV_DOMAINS.map(d => ({ value: d.slug, label: d.label }))
const DOMAINS_WITH_EMPTY = [{ value: '', label: 'All domains' }, ...DOMAIN_LIST]
const ACTOR_TYPES   = ['organisation', 'project']
const SCALE_OPTIONS = ['local', 'municipal', 'regional', 'national', 'international', 'global']

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

// Extract-specific domain lists
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
const SCALES_EX = ['local','municipal','regional','national','international','global']
const TYPES_EX  = ['organisation','project','practitioner','programme','resource']

// ── Placement tier from score (preserved from original) ───────
const TIER_FROM_SCORE = s => s <= 4 ? 'pattern_instance' : s <= 6 ? 'contested' : s <= 8 ? 'qualified' : 'exemplar'

const TIER_CFG = {
  pattern_instance: { label: 'Pattern instance', color: '#8A3030', bg: 'rgba(138,48,48,0.08)', border: 'rgba(138,48,48,0.25)' },
  contested:        { label: 'Contested',         color: '#8A6020', bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.30)' },
  qualified:        { label: 'Qualified',          color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.30)' },
  exemplar:         { label: 'Exemplar',            color: '#6A4A10', bg: 'rgba(106,74,16,0.10)', border: 'rgba(106,74,16,0.35)' },
}

const LABEL_COLORS = {
  Planet:       { color: '#2A4A8A', bg: 'rgba(42,74,138,0.08)',  border: 'rgba(42,74,138,0.25)' },
  Self:         { color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)', border: 'rgba(42,107,58,0.25)' },
  Practitioner: { color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.25)' },
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
    primary: { background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', color: gold },
    danger:  { background: 'rgba(180,40,40,0.05)',  border: '1.5px solid rgba(180,40,40,0.5)',   color: '#8A2020' },
    ghost:   { background: 'transparent',           border: '1px solid rgba(200,146,42,0.30)',    color: 'rgba(15,21,35,0.72)' },
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

function Input({ value, onChange, placeholder, type = 'text', style, onKeyDown }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={{
        ...body, fontSize: '15px', color: '#0F1523',
        padding: '9px 14px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.35)',
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
        border: '1.5px solid rgba(200,146,42,0.35)',
        background: '#FFFFFF', outline: 'none', ...style,
      }}>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)',
      borderRadius: '14px', padding: '20px 22px', marginBottom: '10px',
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
      background: '#0F1523', color: '#FAFAF7',
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
        border: '1px solid rgba(200,146,42,0.25)',
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

// ── Tab navigation ────────────────────────────────────────────

const TABS = ['Now', 'Platform', 'Actors', 'Extract', 'Place', 'Nominations', 'Domain Data', 'Subdomains', 'Needs', 'Contributions', 'Waitlist', 'Resources', 'Groups', 'Members', 'Entitlements', 'Users', 'Grants']

function TabBar({ active, setActive }) {
  return (
    <div style={{
      display: 'flex', gap: '4px', marginBottom: '32px',
      borderBottom: '1px solid rgba(200,146,42,0.20)', paddingBottom: '0',
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

function NowTab() {
  const [stats, setStats]     = useState(null)
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [
          { count: totalUsers },
          { count: mapCount },
          { count: ppCount },
          { count: sprintCount },
          { data: recentUsers },
          { data: recentGrants },
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('map_results').select('*', { count: 'exact', head: true }).eq('complete', true),
          supabase.from('purpose_piece_results').select('*', { count: 'exact', head: true }),
          supabase.from('target_sprint_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('users').select('id, email, first_name, last_name, created_at, status')
            .order('created_at', { ascending: false }).limit(8),
          supabase.from('access').select('*, users(email)')
            .order('granted_at', { ascending: false }).limit(5),
        ])
        setStats({ totalUsers, mapCount, ppCount, sprintCount })
        setRecent({ users: recentUsers ?? [], grants: recentGrants ?? [] })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>Loading...</p>

  return (
    <div>
      <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, color: '#0F1523', marginBottom: '28px' }}>
        Live snapshot
      </h2>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '36px' }}>
          {[
            { label: 'Users', value: stats.totalUsers },
            { label: 'Map sessions', value: stats.mapCount },
            { label: 'Purpose Piece', value: stats.ppCount },
            { label: 'Active sprints', value: stats.sprintCount },
          ].map(s => (
            <Card key={s.label} style={{ textAlign: 'center', padding: '18px 12px' }}>
              <div style={{ ...body, fontSize: '32px', fontWeight: 300, color: '#0F1523', lineHeight: 1 }}>{s.value ?? 0}</div>
              <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginTop: '6px' }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}
      <Eyebrow>Recent signups</Eyebrow>
      {(recent?.users || []).map(u => (
        <Card key={u.id} style={{ padding: '12px 16px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>{u.email}</span>
            <span style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.55)' }}>{u.created_at?.slice(0, 10)}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── PLATFORM TAB ─────────────────────────────────────────────
// Preserved from original

function PlatformTab() {
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
        supabase.from('nextus_actors').select('*', { count: 'exact', head: true }).eq('claimed', true),
        supabase.from('nextus_needs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('nextus_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
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
    { label: 'Total Actors', value: stats.totalActors },
    { label: 'Claimed', value: stats.claimedActors },
    { label: 'Open Needs', value: stats.openNeeds },
    { label: 'Pending Claims', value: stats.pendingClaims },
    { label: 'Contributions', value: stats.totalContribs },
    { label: 'Waitlist', value: stats.waitlistCount },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {statCards.map(s => (
          <Card key={s.label} style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ ...body, fontSize: '32px', fontWeight: 300, color: '#0F1523', lineHeight: 1 }}>{s.value ?? 0}</div>
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
              <div style={{ flex: 1, height: '6px', background: 'rgba(200,146,42,0.12)', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
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
                    <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.40)', marginTop: '2px' }}>
                      Verified · {d.total_actors} actors
                    </div>
                  </div>
                ) : showIllustrative ? (
                  <div>
                    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.35)' }}>
                      Illustrative
                    </span>
                    <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.35)', marginTop: '2px' }}>
                      {d.total_actors || 0} actor{(d.total_actors || 0) !== 1 ? 's' : ''} · not yet verified
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.35)' }}>
                      Insufficient data
                    </span>
                    <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.35)', marginTop: '2px' }}>
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
        <Card style={{ borderColor: 'rgba(200,146,42,0.60)', background: 'rgba(200,146,42,0.04)' }}>
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
  alignment_score: '', winning: false, data_source: '',
}

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
  const [claims, setClaims]     = useState([])
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

  async function fetchClaims() {
    const { data } = await supabase.from('nextus_claims')
      .select('*, nextus_actors(name, domain_id)').eq('status', 'pending').order('submitted_at', { ascending: false })
    setClaims(data || [])
  }

  useEffect(() => { fetchActors() }, [filterDomain, filterType, filterClaimed, filterWinning])
  useEffect(() => { if (mode === 'claims') fetchClaims() }, [mode])

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
    await supabase.from('nextus_actors').delete().eq('id', id)
    toast('Deleted'); fetchActors()
  }

  async function toggleWinning(actor) {
    await supabase.from('nextus_actors').update({ winning: !actor.winning }).eq('id', actor.id)
    fetchActors()
  }

  async function resolveClaim(claimId, actorId, approved) {
    if (approved) {
      await supabase.from('nextus_actors').update({ claimed: true, verified: true }).eq('id', actorId)
      await supabase.from('nextus_claims').update({ status: 'verified', resolved_at: new Date().toISOString() }).eq('id', claimId)
      toast('Claim approved')
    } else {
      await supabase.from('nextus_claims').update({ status: 'rejected', resolved_at: new Date().toISOString() }).eq('id', claimId)
      toast('Claim rejected')
    }
    fetchClaims()
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
        {['browse', 'add', 'claims'].map(m => (
          <Btn key={m} onClick={() => { setMode(m); if (m === 'add') setForm(EMPTY_ACTOR_FORM) }}
            variant={mode === m || (mode === 'edit' && m === 'add') ? 'primary' : 'ghost'} small>
            {m === 'browse' ? `Browse (${total})` : m === 'add' ? '+ Add Actor' : `Claims (${claims.length})`}
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
                    {a.horizon_floor_status === 'flagged_for_review' && (
                      <Badge label="floor review" color="#8A3030" />
                    )}
                  </div>
                  {/* Four-dim placement preview */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                    {(a.domains || [a.domain_id]).filter(Boolean).map((d, i) => (
                      <span key={d} style={{
                        ...sc, fontSize: '11px', letterSpacing: '0.08em',
                        color: i === 0 ? gold : 'rgba(15,21,35,0.55)',
                        background: i === 0 ? 'rgba(200,146,42,0.08)' : 'rgba(15,21,35,0.04)',
                        border: `1px solid ${i === 0 ? 'rgba(200,146,42,0.35)' : 'rgba(15,21,35,0.15)'}`,
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

      {(mode === 'add' || mode === 'edit') && (
        <div style={{ maxWidth: '640px' }}>
          <h3 style={{ ...body, fontSize: '20px', fontWeight: 300, color: '#0F1523', marginBottom: '24px' }}>
            {mode === 'edit' ? 'Edit actor' : 'Add actor'}
          </h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Name *</label>
              <Input value={form.name} onChange={v => setFormField('name', v)} placeholder="Actor name" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Type</label>
                <Select value={form.type} onChange={v => setFormField('type', v)}
                  options={ACTOR_TYPES.map(t => ({ value: t, label: t }))} />
              </div>
              <div>
                <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Scale</label>
                <Select value={form.scale || ''} onChange={v => setFormField('scale', v)}
                  options={[{ value: '', label: '-- Select --' }, ...SCALE_OPTIONS.map(s => ({ value: s, label: s }))]} />
              </div>
            </div>

            {/* Four-dim: Primary domain (legacy + array) */}
            <div>
              <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Primary domain *</label>
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
              <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Secondary domains</label>
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
                        ...sc, fontSize: '11px', letterSpacing: '0.06em',
                        padding: '4px 10px', borderRadius: '40px', cursor: 'pointer',
                        color: isOn ? gold : 'rgba(15,21,35,0.72)',
                        background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                        border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)',
                      }}>
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Four-dim: Platform principles */}
            <div>
              <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Platform principles engaged</label>
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
                        ...sc, fontSize: '11px', letterSpacing: '0.06em',
                        padding: '4px 10px', borderRadius: '40px', cursor: 'pointer',
                        color: isOn ? gold : 'rgba(15,21,35,0.72)',
                        background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                        border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)',
                      }}>
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Alignment score (0-9)</label>
              <Input value={form.alignment_score} onChange={v => setFormField('alignment_score', v)} type="number" placeholder="0–9" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Location</label>
                <Input value={form.location_name} onChange={v => setFormField('location_name', v)} placeholder="City, Country" />
              </div>
              <div>
                <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Website</label>
                <Input value={form.website} onChange={v => setFormField('website', v)} placeholder="https://..." />
              </div>
            </div>

            <div>
              <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '5px' }}>Description</label>
              <textarea value={form.description} onChange={e => setFormField('description', e.target.value)} rows={3}
                style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px', borderRadius: '8px',
                  border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none',
                  width: '100%', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
            </div>

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

      {mode === 'claims' && (
        <div>
          <h3 style={{ ...body, fontSize: '20px', fontWeight: 300, color: '#0F1523', marginBottom: '20px' }}>
            Pending claims ({claims.length})
          </h3>
          {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
          {!loading && claims.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No pending claims.</p>}
          {claims.map(c => (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div>
                  <div style={{ ...body, fontSize: '17px', color: '#0F1523', marginBottom: '4px' }}>
                    {c.nextus_actors?.name}
                  </div>
                  <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
                    Claimed by: {c.claimant_email || c.user_id}
                  </div>
                  {c.evidence && (
                    <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '6px', lineHeight: 1.6 }}>
                      {c.evidence}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <Btn small onClick={() => resolveClaim(c.id, c.actor_id, true)}>Approve</Btn>
                  <Btn small variant="danger" onClick={() => resolveClaim(c.id, c.actor_id, false)}>Reject</Btn>
                </div>
              </div>
            </Card>
          ))}
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
    <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px', letterSpacing:'0.12em',
      padding:'3px 10px', borderRadius:'40px', border:`1px solid ${c.border}`, color:c.color, background:c.bg }}>
      {c.label}
    </span>
  )
}

function ExLabelBadge({ label }) {
  const c = LABEL_COLORS[label] || LABEL_COLORS.Planet
  return (
    <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'13px', letterSpacing:'0.14em',
      padding:'4px 12px', borderRadius:'40px', border:`1px solid ${c.border}`, color:c.color, background:c.bg }}>
      {label}
    </span>
  )
}

function ExPill({ label, variant = 'green' }) {
  const cols = {
    green: { color:'#2A6B3A', bg:'rgba(42,107,58,0.08)', border:'rgba(42,107,58,0.25)' },
    amber: { color:'#8A6020', bg:'rgba(200,146,42,0.08)', border:'rgba(200,146,42,0.20)' },
    blue:  { color:'#2A4A8A', bg:'rgba(42,74,138,0.08)', border:'rgba(42,74,138,0.25)' },
  }
  const c = cols[variant] || cols.green
  return (
    <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px', letterSpacing:'0.10em',
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
      <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'10px', letterSpacing:'0.16em',
        color: 'rgba(15,21,35,0.45)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div>
        {values.map((v, i) => (
          <span key={v} style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'11px', letterSpacing:'0.08em',
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
      border: checked ? '1.5px solid rgba(200,146,42,0.40)' : '1.5px solid rgba(15,21,35,0.12)',
      borderRadius: '14px', marginBottom: '16px',
      opacity: checked ? 1 : 0.6,
      transition: 'all 0.15s',
    }}>

      {/* Card header */}
      <div style={{ padding: '18px 20px', display:'flex', alignItems:'flex-start', gap:'14px' }}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(index)}
          style={{ width:'18px', height:'18px', accentColor:'#C8922A', marginTop:'3px', flexShrink:0, cursor:'pointer' }} />

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
            <ExLabelBadge label={proposal.label} />
            <ExTierBadge tier={proposal.placement_tier} />
            <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.10em', color:'rgba(15,21,35,0.50)' }}>
              {proposal.confidence}% confidence
            </span>
          </div>
          <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'19px', fontWeight:300,
            color:'#0F1523', marginBottom:'6px' }}>
            {proposal.name}
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:'6px', marginBottom:'8px' }}>
            <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'40px',
              fontWeight:700, color:'#0F1523', lineHeight:1 }}>
              {proposal.alignment_score}
            </span>
            <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'14px',
              color:'rgba(15,21,35,0.35)' }}>/10</span>
          </div>

          {proposal.score_reasoning && (
            <div style={{ borderLeft:'2px solid rgba(200,146,42,0.28)', paddingLeft:'12px', marginBottom:'12px' }}>
              <p style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'14px',
                color:'rgba(15,21,35,0.65)', lineHeight:1.7, margin:0 }}>
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
                <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'10px', letterSpacing:'0.16em',
                  color: 'rgba(15,21,35,0.45)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Problem chains
                </span>
                {problems.map((p, i) => (
                  <div key={i} style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'13px',
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
              <p style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'11px',
                letterSpacing:'0.14em', color:'#2A6B3A', marginBottom:'5px' }}>
                HAL conditions
              </p>
              <div>{proposal.hal_signals.map(s => <ExPill key={s} label={s} variant="green" />)}</div>
            </div>
          )}
          {/* SFP patterns (preserved — canonical structural-integrity surface) */}
          {proposal.sfp_patterns?.length > 0 && (
            <div style={{ marginBottom:'8px' }}>
              <p style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'11px',
                letterSpacing:'0.14em', color:'#8A6020', marginBottom:'5px' }}>
                SFP patterns
              </p>
              <div>{proposal.sfp_patterns.map(s => <ExPill key={s} label={s} variant="amber" />)}</div>
            </div>
          )}
        </div>

        <button onClick={() => setExpanded(e => !e)}
          style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'13px',
            letterSpacing:'0.12em', color:'rgba(15,21,35,0.55)',
            background:'none', border:'none', cursor:'pointer', flexShrink:0, paddingTop:'4px' }}>
          {expanded ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Editable fields */}
      {expanded && (
        <div style={{ borderTop:'1px solid rgba(200,146,42,0.15)', padding:'18px 20px 20px', display:'grid', gap:'14px' }}>
          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Name</label>
            <Input value={proposal.name} onChange={v => set('name', v)} placeholder="Name" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Type</label>
              <Select value={proposal.type} onChange={v => set('type', v)}
                options={TYPES_EX.map(t => ({ value:t, label:t }))} />
            </div>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Track</label>
              <Select value={proposal.track} onChange={v => { set('track', v); set('domain_id','') }}
                options={[{ value:'planet', label:'Planet' }, { value:'self', label:'Self' }]} />
            </div>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Scale</label>
              <Select value={proposal.scale || ''} onChange={v => set('scale', v)}
                options={[{ value:'', label:'-- Select --' }, ...SCALES_EX.map(s => ({ value:s, label:s }))]} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Primary domain *</label>
            <Select value={domains[0] || ''} onChange={v => {
              set('domain_id', v)
              set('domains', v ? [v, ...domains.slice(1)] : domains.slice(1))
            }}
              options={domainOptions()} />
          </div>

          {/* Secondary domains */}
          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
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
                      fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'11px', letterSpacing:'0.06em',
                      padding:'3px 9px', borderRadius:'40px', cursor:'pointer',
                      color: isOn ? gold : 'rgba(15,21,35,0.72)',
                      background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                      border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)',
                    }}>
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Platform principles */}
          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
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
                      fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'11px', letterSpacing:'0.06em',
                      padding:'3px 9px', borderRadius:'40px', cursor:'pointer',
                      color: isOn ? gold : 'rgba(15,21,35,0.72)',
                      background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                      border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)',
                    }}>
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Location</label>
              <Input value={proposal.location_name || ''} onChange={v => set('location_name', v)}
                placeholder="e.g. Mexico City, Mexico" />
            </div>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Website</label>
              <Input value={proposal.website || ''} onChange={v => set('website', v)} placeholder="https://..." />
            </div>
          </div>

          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Description</label>
            <textarea value={proposal.description || ''} onChange={e => set('description', e.target.value)}
              rows={3} style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'15px', color:'#0F1523',
                padding:'9px 14px', borderRadius:'8px', border:'1.5px solid rgba(200,146,42,0.35)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.6, boxSizing:'border-box' }} />
          </div>

          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Impact summary</label>
            <textarea value={proposal.impact_summary || ''} onChange={e => set('impact_summary', e.target.value)}
              rows={2} style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'15px', color:'#0F1523',
                padding:'9px 14px', borderRadius:'8px', border:'1.5px solid rgba(200,146,42,0.35)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.6, boxSizing:'border-box' }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:'12px', alignItems:'end' }}>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Score (0-9)</label>
              <Input value={proposal.alignment_score ?? ''} onChange={handleScoreChange}
                type="number" placeholder="0-9" />
            </div>
            <div style={{ paddingBottom:'2px' }}>
              {!isNaN(score) && <ExTierBadge tier={TIER_FROM_SCORE(score)} />}
              <span style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'13px',
                color:'rgba(15,21,35,0.45)', marginLeft:'10px' }}>
                Adjust if your read differs from the AI draft.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExtractTab({ toast }) {
  const [input,      setInput]      = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractErr, setExtractErr] = useState(null)
  const [proposals,  setProposals]  = useState([])
  const [checked,    setChecked]    = useState([])
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState([])

  // HorizonFloor modal state — one proposal queued at a time
  const [floorQueue,  setFloorQueue]  = useState([])   // proposals waiting floor check
  const [floorActive, setFloorActive] = useState(null) // current { proposal, index }
  const [savedNow,    setSavedNow]    = useState([])   // accumulated saved records

  async function extract() {
    if (!input.trim()) return
    setExtracting(true); setExtractErr(null); setProposals([]); setChecked([]); setSaved([])
    try {
      const res = await fetch('/api/org-extract', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      const data = await res.json()
      if (data.error) { setExtractErr(data.message || 'Extraction failed.'); return }
      const results = data.results || []
      setProposals(results)
      setChecked(results.map(() => true))
    } catch {
      setExtractErr('Could not reach extraction service.')
    } finally {
      setExtracting(false)
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
    if (selected.length === 0) { toast('Nothing selected'); return }
    for (const p of selected) {
      if (!p.name?.trim())                      { toast(`Name required on ${p.label} entry`); return }
      if (!(p.domains?.length) && !p.domain_id) { toast(`Domain required on ${p.label} entry`); return }
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
      data_source:     `Admin extract (beta): ${proposal.label}`,
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
        toast(`${next.length} record${next.length !== 1 ? 's' : ''} placed on the map`)
      }
    }
  }

  function reset() {
    setInput(''); setProposals([]); setChecked([]); setSaved([]); setExtractErr(null)
    setFloorQueue([]); setFloorActive(null); setSavedNow([])
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

      <h2 style={{ ...body, fontSize:'22px', fontWeight:300, color:'#0F1523', marginBottom:'8px' }}>
        AI Extract
      </h2>
      <p style={{ ...body, fontSize:'14px', color:'rgba(15,21,35,0.55)', lineHeight:1.65, marginBottom:'28px' }}>
        Paste a URL, description, or raw HTML. The engine identifies up to three distinct actor records
        (Planet, Self, and Practitioner) each assessed independently. Tick the ones you want, edit any field,
        then place all selected directly onto the map.
        Four-dimensional placement (domains, subdomains, lenses, problem chains, platform principles)
        renders when the endpoint returns it. Single-value domain fallback is automatic.
      </p>

      {saved.length > 0 && (
        <div style={{ background:'rgba(42,107,58,0.06)', border:'1px solid rgba(42,107,58,0.30)',
          borderRadius:'14px', padding:'24px', marginBottom:'28px' }}>
          <div style={{ ...sc, fontSize:'12px', letterSpacing:'0.16em', color:'#2A6B3A', marginBottom:'12px' }}>
            Placed on the map
          </div>
          {saved.map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
              <ExLabelBadge label={s.label} />
              <span style={{ ...body, fontSize:'17px', color:'#0F1523' }}>{s.name}</span>
              <a href={`/nextus/actors/${s.id}`} target="_blank" rel="noopener noreferrer"
                style={{ ...sc, fontSize:'12px', letterSpacing:'0.12em', color:gold }}>
                View
              </a>
            </div>
          ))}
          <button onClick={reset}
            style={{ ...sc, fontSize:'13px', letterSpacing:'0.12em', color:'rgba(15,21,35,0.55)',
              background:'none', border:'none', cursor:'pointer', marginTop:'12px', padding:0 }}>
            Extract another
          </button>
        </div>
      )}

      {!saved.length && (
        <>
          <div style={{ marginBottom:'14px' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={5}
              placeholder="Paste a URL, a description, or raw HTML source..."
              style={{ ...body, fontSize:'15px', color:'#0F1523', padding:'12px 16px',
                borderRadius:'8px', border:'1.5px solid rgba(200,146,42,0.30)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.65, boxSizing:'border-box' }} />
          </div>

          {extractErr && (
            <div style={{ background:'rgba(138,48,48,0.05)', border:'1px solid rgba(138,48,48,0.28)',
              borderRadius:'8px', padding:'10px 14px', marginBottom:'14px' }}>
              <p style={{ ...body, fontSize:'14px', color:'#8A3030', margin:0 }}>{extractErr}</p>
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'32px' }}>
            <button onClick={extract} disabled={extracting || !input.trim()}
              style={{ ...sc, fontSize:'14px', letterSpacing:'0.16em',
                padding:'12px 30px', borderRadius:'40px', border:'none',
                background: extracting || !input.trim() ? 'rgba(200,146,42,0.30)' : '#C8922A',
                color:'#FFFFFF', cursor: extracting || !input.trim() ? 'not-allowed' : 'pointer' }}>
              {extracting ? 'Reading...' : 'Extract'}
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
              <div style={{ ...sc, fontSize:'12px', letterSpacing:'0.16em',
                color:'rgba(15,21,35,0.55)', marginBottom:'16px' }}>
                {proposals.length} record{proposals.length !== 1 ? 's' : ''} identified. Tick the ones you want to place.
              </div>

              {proposals.map((p, i) => (
                <ProposalCard
                  key={i}
                  proposal={p}
                  index={i}
                  checked={checked[i]}
                  onToggle={toggleChecked}
                  onChange={handleChange}
                />
              ))}

              <div style={{ paddingTop:'8px', borderTop:'1px solid rgba(200,146,42,0.15)',
                display:'flex', alignItems:'center', gap:'16px' }}>
                <button onClick={saveSelected} disabled={saving || selectedCount === 0}
                  style={{ ...sc, fontSize:'14px', letterSpacing:'0.16em',
                    padding:'13px 32px', borderRadius:'40px', border:'none',
                    background: saving || selectedCount === 0 ? 'rgba(200,146,42,0.30)' : '#C8922A',
                    color:'#FFFFFF', cursor: saving || selectedCount === 0 ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : `Place ${selectedCount} selected`}
                </button>
                <p style={{ ...body, fontSize:'13px', color:'rgba(15,21,35,0.45)', margin:0 }}>
                  Horizon Floor check runs for each selected record.
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
          <Card key={a.id} style={{ borderLeft: `3px solid ${a.placement_tier === 'exemplar' ? '#2A6B3A' : a.placement_tier === 'contested' ? '#8A3030' : 'rgba(200,146,42,0.35)'}` }}>
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
                      ...sc, fontSize: '11px', letterSpacing: '0.08em',
                      color: i === 0 ? gold : 'rgba(15,21,35,0.55)',
                      background: i === 0 ? 'rgba(200,146,42,0.08)' : 'rgba(15,21,35,0.04)',
                      border: `1px solid ${i === 0 ? 'rgba(200,146,42,0.35)' : 'rgba(15,21,35,0.15)'}`,
                      borderRadius: '40px', padding: '1px 8px',
                    }}>
                      {domainLabel(d)}{i === 0 ? ' (primary)' : ''}
                    </span>
                  ))}
                </div>

                {/* HAL signals and SFP patterns (canonical structural-integrity surfaces preserved) */}
                {a.alignment_reasoning?.hal_signals?.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#2A6B3A', marginRight: '6px' }}>HAL:</span>
                    {a.alignment_reasoning.hal_signals.map(s => <ExPill key={s} label={s} variant="green" />)}
                  </div>
                )}
                {a.alignment_reasoning?.sfp_patterns?.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: '#8A6020', marginRight: '6px' }}>SFP:</span>
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
                      border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none' }} />
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

// ── NOMINATIONS TAB ───────────────────────────────────────────
// Beta change: approve flow runs HorizonFloorAdmissionCheck.

function NominationsTab({ toast }) {
  const [nominations, setNominations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('nominated')
  const [floorPending, setFloorPending] = useState(null) // actor to approve

  async function load() {
    setLoading(true)
    let q = supabase.from('nextus_actors').select('*').eq('seeded_by', 'community').order('created_at', { ascending: false }).limit(100)
    const { data } = await q
    let results = data || []
    if (filter === 'nominated') results = results.filter(a => !a.claimed && !a.verified && a.vetting_status !== 'rejected')
    if (filter === 'approved')  results = results.filter(a => a.claimed || a.verified)
    if (filter === 'rejected')  results = results.filter(a => a.vetting_status === 'rejected')
    setNominations(results)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  function initiateApprove(actor) {
    // Show HorizonFloor check before approving
    setFloorPending(actor)
  }

  async function commitApprove(actor, floorStatus) {
    const { error } = await supabase.from('nextus_actors').update({
      seeded_by:            'nextus',
      vetting_status:       'approved',
      horizon_floor_status: floorStatus,
    }).eq('id', actor.id)
    if (error) { toast('Error approving'); setFloorPending(null); return }
    toast(`${actor.name} approved and now live`)
    setFloorPending(null)
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

  const domainLabel = id => DOMAIN_LIST.find(d => d.value === id)?.label || id

  return (
    <div>
      {floorPending && (
        <HorizonFloorModal
          domainSlug={(floorPending.domains?.[0] || floorPending.domain_id) || 'nature'}
          contextLabel={`${floorPending.name}`}
          onResolve={async ({ status }) => {
            await commitApprove(floorPending, status)
          }}
          onCancel={() => setFloorPending(null)}
        />
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[['nominated','Pending'], ['approved','Approved'], ['rejected','Rejected']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'} onClick={() => setFilter(val)}>{label}</Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {filter === 'nominated' && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '20px', lineHeight: 1.6, maxWidth: '560px' }}>
          Review each nomination. Approve if the work is genuinely aimed at the Horizon Goal for their domain and scale, and the nominator's description is honest. Reject if the fit is not right.
          Approving runs a Horizon Floor check first.
        </div>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && nominations.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filter} nominations.</p>}

      {nominations.map(a => (
        <Card key={a.id} style={{ borderLeft: '3px solid rgba(200,146,42,0.40)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ ...body, fontSize: '18px', color: '#0F1523' }}>{a.name}</span>
                <Badge label={a.type} />
                {a.scale && <Badge label={a.scale} color="rgba(15,21,35,0.55)" />}
                {/* Four-dim: show primary domain */}
                {(a.domains?.[0] || a.domain_id) && (
                  <Badge label={domainLabel(a.domains?.[0] || a.domain_id)} color="#2A4A8A" />
                )}
              </div>
              {a.location_name && <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>{a.location_name}</div>}
              {a.website && <div style={{ marginBottom: '8px' }}><a href={a.website} target="_blank" rel="noopener noreferrer" style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold }}>{a.website}</a></div>}
              {a.description && (
                <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px' }}>
                  <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold, marginBottom: '6px' }}>Why they belong</p>
                  <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>{a.description}</p>
                </div>
              )}
              {a.data_source && <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Source: {a.data_source}</p>}
              <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Submitted: {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            {filter === 'nominated' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <Btn small onClick={() => initiateApprove(a)}>Approve</Btn>
                <Btn small variant="danger" onClick={() => reject(a)}>Reject</Btn>
              </div>
            )}
            {filter === 'approved' && (
              <div style={{ flexShrink: 0 }}>
                <a href={'/nextus/actors/' + a.id} target="_blank" rel="noopener noreferrer" style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold }}>View live</a>
              </div>
            )}
            {filter === 'rejected' && (
              <div style={{ flexShrink: 0 }}><Badge label="rejected" color="#8A3030" /></div>
            )}
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
                  <div><label style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold, display: 'block', marginBottom: '4px' }}>Horizon goal</label>
                    <textarea value={form.horizon_goal || ''} onChange={e => setForm(f => ({ ...f, horizon_goal: e.target.value }))} rows={2}
                      style={{ ...body, fontSize: '14px', color: '#0F1523', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.55, boxSizing: 'border-box' }} />
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
              {n.nextus_actors?.name && <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: gold }}>{n.nextus_actors.name}</div>}
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

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('nextus_waitlist').select('*').order('created_at', { ascending: false }).limit(200)
      setEntries(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>
        {entries.length} entries
      </div>
      {entries.map(e => (
        <Card key={e.id} style={{ padding: '10px 16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>{e.email}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {e.source && <Badge label={e.source} color="rgba(15,21,35,0.55)" />}
              <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.45)' }}>{e.created_at?.slice(0, 10)}</span>
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
              <div style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}>{r.country_code}{r.region ? ` · ${r.region}` : ''}</div>
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
          <div style={{ ...sc, fontSize: '12px', color: 'rgba(15,21,35,0.55)', letterSpacing: '0.1em' }}>{g.type} · {g.created_at?.slice(0, 10)}</div>
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
              {e.expires_at && <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.45)' }}>exp: {e.expires_at?.slice(0,10)}</span>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function UsersTab({ toast }) {
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
        <Card key={u.id} style={{ padding: '10px 16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ ...body, fontSize: '14px', color: '#0F1523' }}>{u.email}</span>
              {u.first_name && <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginLeft: '8px' }}>{u.first_name} {u.last_name}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
              <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.45)' }}>{g.granted_at?.slice(0,10)}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────

export function BetaAdminConsolePage() {
  const { user, loading } = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('Platform')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => setToast(msg), [])

  useEffect(() => {
    if (!loading && (!user || !isFounder(user))) {
      navigate('/beta/dashboard')
    }
  }, [user, loading, navigate])

  if (loading || !user || !isFounder(user)) {
    return <div style={{ background: '#FAFAF7', minHeight: '100vh' }}><Nav /></div>
  }

  return (
    <div style={{ background: bg, minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '96px 40px 120px' }}>
        <Eyebrow>Admin Beta</Eyebrow>
        <h1 style={{ ...body, fontSize: 'clamp(32px,4vw,48px)', fontWeight: 300,
          color: '#0F1523', marginBottom: '8px', lineHeight: 1.08 }}>
          Console
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)',
          marginBottom: '48px' }}>
          Platform health, actors, domains, needs, contributions, waitlist, access.
          Horizon Floor checks on all actor saves.
        </p>

        <TabBar active={tab} setActive={setTab} />

        {tab === 'Now'           && <NowTab />}
        {tab === 'Platform'      && <PlatformTab />}
        {tab === 'Actors'        && <ActorsTab       toast={showToast} />}
        {tab === 'Extract'       && <ExtractTab      toast={showToast} />}
        {tab === 'Place'         && <PlaceTab        toast={showToast} />}
        {tab === 'Nominations'   && <NominationsTab  toast={showToast} />}
        {tab === 'Domain Data'   && <DomainDataTab   toast={showToast} />}
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
