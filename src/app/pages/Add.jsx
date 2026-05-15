// src/app/pages/Add.jsx
//
// Public "Add to the ecosystem" page.
// Replaces /nominate. Requires login.
//
// Flow:
//   1. URL input at top — paste and hit Read Site
//   2. AI returns up to 3 proposals (Planet, Self, Practitioner)
//   3. User ticks the ones they want, edits any field
//   4. Representation toggle sets provenance for all selected records
//   5. Save all selected at once — all go live immediately
//
// Provenance:
//   "I'm adding this to the ecosystem" → seeded_by: 'community', profile_owner: null
//   "I represent this organisation"    → seeded_by: 'self',      profile_owner: user.id

import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { CIV_DOMAINS } from '../components/NextUsWheel'

// ── Design tokens ─────────────────────────────────────────────
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const DOMAIN_LIST = CIV_DOMAINS.map(d => ({ value: d.slug, label: d.label }))

const SCALES = [
  { value: '',              label: '-- Scale --' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

const ACTOR_TYPES = [
  'organisation', 'project', 'practitioner', 'programme', 'place', 'group', 'resource',
]

const LABEL_COLORS = {
  Planet:       { color: '#2A4A8A', bg: 'rgba(42,74,138,0.08)',  border: 'rgba(42,74,138,0.25)' },
  Self:         { color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)',  border: 'rgba(42,107,58,0.25)' },
  Practitioner: { color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.25)' },
}

// ── Primitives ─────────────────────────────────────────────────

function LabelBadge({ label }) {
  const cfg = LABEL_COLORS[label] || LABEL_COLORS.Planet
  return (
    <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em',
      padding: '2px 10px', borderRadius: '40px',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {label}
    </span>
  )
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: gold,
      display: 'block', marginBottom: '5px' }}>
      {children}{required && <span style={{ color: '#8A3030', marginLeft: '3px' }}>*</span>}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...body, fontSize: '14px', color: dark, padding: '8px 12px',
        borderRadius: '7px', border: '1.5px solid rgba(200,146,42,0.28)',
        background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      style={{ ...body, fontSize: '14px', color: dark, padding: '8px 12px',
        borderRadius: '7px', border: '1.5px solid rgba(200,146,42,0.28)',
        background: '#FFFFFF', outline: 'none', width: '100%' }}>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  )
}

// ── Duplicate card ─────────────────────────────────────────────

function DuplicateCard({ actor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '12px', padding: '10px 14px', marginBottom: '6px',
      background: 'rgba(200,146,42,0.04)', borderRadius: '8px',
      border: '1px solid rgba(200,146,42,0.22)' }}>
      <div>
        <div style={{ ...body, fontSize: '14px', color: dark }}>{actor.name}</div>
        {actor.location_name && (
          <div style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.55)' }}>{actor.location_name}</div>
        )}
      </div>
      <Link to={`/org/${actor.slug || actor.id}`} target="_blank"
        style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold,
          textDecoration: 'none', whiteSpace: 'nowrap',
          padding: '5px 12px', borderRadius: '40px',
          border: '1px solid rgba(200,146,42,0.35)',
          background: 'rgba(200,146,42,0.05)' }}>
        View
      </Link>
    </div>
  )
}

// ── Proposal card ──────────────────────────────────────────────

function ProposalCard({ proposal, index, checked, onToggle, onChange }) {
  const domainOptions = [{ value: '', label: '-- Domain --' }, ...DOMAIN_LIST]
  const primaryDomain = proposal.domains?.[0] || proposal.domain_id || ''

  return (
    <div style={{
      background: checked ? '#FFFFFF' : 'rgba(15,21,35,0.02)',
      border: checked ? '1.5px solid rgba(200,146,42,0.45)' : '1.5px solid rgba(200,146,42,0.18)',
      borderRadius: '12px', padding: '20px 22px', marginBottom: '14px',
      transition: 'all 0.15s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: checked ? '18px' : 0 }}>
        <button type="button" onClick={() => onToggle(index)}
          style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
            border: checked ? '2px solid #A8721A' : '2px solid rgba(200,146,42,0.35)',
            background: checked ? '#A8721A' : '#FFFFFF',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {checked && <span style={{ color: '#FFFFFF', fontSize: '13px', lineHeight: 1 }}>✓</span>}
        </button>
        <LabelBadge label={proposal.label} />
        <span style={{ ...body, fontSize: '16px', color: dark }}>{proposal.name}</span>
        {proposal.alignment_score != null && (
          <span style={{ ...sc, fontSize: '11px', color: 'rgba(15,21,35,0.40)', marginLeft: 'auto' }}>
            Score {proposal.alignment_score}
          </span>
        )}
      </div>

      {!checked && (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.40)', margin: '8px 0 0' }}>
          Unticked — will not be saved.
        </p>
      )}

      {checked && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {/* Name + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
            <div>
              <FieldLabel required>Name</FieldLabel>
              <TextInput value={proposal.name} onChange={v => onChange(index, 'name', v)} placeholder="Name" />
            </div>
            <div style={{ minWidth: '150px' }}>
              <FieldLabel>Type</FieldLabel>
              <SelectInput value={proposal.type} onChange={v => onChange(index, 'type', v)}
                options={ACTOR_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
            </div>
          </div>

          {/* Domain + Scale */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <FieldLabel required>Primary domain</FieldLabel>
              <SelectInput value={primaryDomain}
                onChange={v => onChange(index, 'domains', v ? [v] : [])}
                options={domainOptions} />
            </div>
            <div>
              <FieldLabel>Scale</FieldLabel>
              <SelectInput value={proposal.scale} onChange={v => onChange(index, 'scale', v)} options={SCALES} />
            </div>
          </div>

          {/* Website + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <FieldLabel>Website</FieldLabel>
              <TextInput value={proposal.website} onChange={v => onChange(index, 'website', v)} placeholder="https://..." />
            </div>
            <div>
              <FieldLabel>Location</FieldLabel>
              <TextInput value={proposal.location_name} onChange={v => onChange(index, 'location_name', v)} placeholder="City, Country" />
            </div>
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea value={proposal.description ?? ''} rows={3}
              onChange={e => onChange(index, 'description', e.target.value)}
              style={{ ...body, fontSize: '14px', color: dark, padding: '8px 12px',
                borderRadius: '7px', border: '1.5px solid rgba(200,146,42,0.28)',
                background: '#FFFFFF', outline: 'none', width: '100%',
                resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
          </div>

          {/* AI reasoning pill row */}
          {(proposal.score_reasoning || proposal.hal_signals?.length > 0) && (
            <div style={{ background: 'rgba(200,146,42,0.03)',
              border: '1px solid rgba(200,146,42,0.15)',
              borderRadius: '8px', padding: '10px 14px' }}>
              {proposal.score_reasoning && (
                <p style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.55)',
                  lineHeight: 1.55, margin: 0, marginBottom: proposal.hal_signals?.length ? '6px' : 0 }}>
                  {proposal.score_reasoning}
                </p>
              )}
              {proposal.hal_signals?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {proposal.hal_signals.slice(0, 6).map(s => (
                    <span key={s} style={{ ...sc, fontSize: '10px', letterSpacing: '0.06em',
                      color: 'rgba(15,21,35,0.45)', background: 'rgba(200,146,42,0.06)',
                      border: '1px solid rgba(200,146,42,0.18)',
                      borderRadius: '40px', padding: '1px 7px' }}>
                      {s}
                    </span>
                  ))}
                  {proposal.hal_signals.length > 6 && (
                    <span style={{ ...sc, fontSize: '10px', color: 'rgba(15,21,35,0.35)' }}>
                      +{proposal.hal_signals.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export function AddPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [url,        setUrl]        = useState('')
  const [reading,    setReading]    = useState(false)
  const [readErr,    setReadErr]    = useState(null)
  const [proposals,  setProposals]  = useState([])
  const [checked,    setChecked]    = useState([])
  const [represents, setRepresents] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [dupDismissed, setDupDismissed] = useState(false)

  // Clear nav state
  useEffect(() => {
    if (location.state?.prefill) navigate(location.pathname, { replace: true, state: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/add' } })
  }, [user, authLoading, navigate])

  // ── Read site ────────────────────────────────────────────────
  async function readSite() {
    const input = url.trim()
    if (!input) return
    setReading(true); setReadErr(null); setProposals([]); setChecked([])
    setSaved([]); setDuplicates([]); setDupDismissed(false)

    try {
      const res  = await fetch('/api/org-extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      const data = await res.json()
      if (data.error) { setReadErr(data.message || 'Could not read the site.'); return }

      const results = data.results || []
      setProposals(results)
      setChecked(results.map(() => true))

      // Duplicate check on first proposal's name + the input URL
      if (results.length > 0) {
        const name    = results[0].name?.trim()
        const website = results[0].website?.trim() || input
        const queries = []
        if (name)    queries.push(supabase.from('nextus_actors').select('id,name,slug,website,location_name').ilike('name', `%${name}%`).eq('status', 'live').limit(3))
        if (website) queries.push(supabase.from('nextus_actors').select('id,name,slug,website,location_name').eq('website', website).eq('status', 'live').limit(3))
        const dups = await Promise.all(queries)
        const all  = dups.flatMap(r => r.data || [])
        const seen = new Set()
        setDuplicates(all.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true }))
      }
    } catch {
      setReadErr('Could not reach the reading service. Try again or paste a description below.')
    } finally {
      setReading(false)
    }
  }

  function toggleChecked(i) {
    setChecked(c => c.map((v, idx) => idx === i ? !v : v))
  }

  function handleChange(i, key, value) {
    setProposals(ps => ps.map((p, idx) => idx === i ? { ...p, [key]: value } : p))
  }

  // ── Save all selected ────────────────────────────────────────
  async function saveSelected() {
    const selected = proposals.filter((_, i) => checked[i])
    if (selected.length === 0) return

    for (const p of selected) {
      if (!p.name?.trim()) { setReadErr(`Name required on ${p.label} entry`); return }
      if (!(p.domains?.length) && !p.domain_id) { setReadErr(`Domain required on ${p.label} entry`); return }
    }

    setSaving(true); setReadErr(null)
    const results = []

    for (const p of selected) {
      const domains = p.domains?.length ? p.domains : (p.domain_id ? [p.domain_id] : [])

      const payload = {
        name:                p.name.trim(),
        type:                p.type || 'organisation',
        track:               p.track || null,
        domain_id:           domains[0] || null,
        domains,
        subdomains:          p.subdomains      || [],
        fields:              p.fields          || [],
        lenses:              p.lenses          || [],
        problem_chains:      p.problem_chains  || [],
        platform_principles: p.platform_principles || [],
        scale:               p.scale           || null,
        location_name:       p.location_name?.trim() || null,
        website:             p.website?.trim() || null,
        description:         p.description?.trim() || null,
        impact_summary:      p.impact_summary?.trim() || null,
        alignment_score:     p.alignment_score != null ? parseFloat(p.alignment_score) : null,
        alignment_score_computed:   true,
        alignment_score_updated_at: new Date().toISOString(),
        placement_tier:      p.placement_tier  || null,
        seeded_by:           represents ? 'self' : 'community',
        profile_owner:       represents ? user.id : null,
        owner_id:            represents ? user.id : null,
        represented_by_adder: represents,
        vetting_status:      'approved',
        status:              'live',
        data_source:         url.trim() ? `community | ${url.trim()}` : 'community | manual',
        alignment_reasoning: {
          hal_signals:     p.hal_signals,
          sfp_patterns:    p.sfp_patterns,
          score_reasoning: p.score_reasoning,
          confidence:      p.confidence,
          confidence_note: p.confidence_note,
          extracted_at:    new Date().toISOString(),
          input_mode:      'public_add',
          label:           p.label,
        },
      }

      const { data: inserted, error } = await supabase
        .from('nextus_actors').insert(payload).select('id, name, slug').single()

      if (error) {
        setReadErr(`Error saving ${p.label}: ${error.message}`)
        setSaving(false)
        return
      }
      results.push({ id: inserted.id, slug: inserted.slug, name: p.name, label: p.label })
    }

    setSaving(false)
    setSaved(results)
  }

  function reset() {
    setUrl(''); setProposals([]); setChecked([]); setSaved([])
    setReadErr(null); setDuplicates([]); setDupDismissed(false)
  }

  const selectedCount = checked.filter(Boolean).length

  // ── Done state ───────────────────────────────────────────────
  if (saved.length > 0) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 24px 80px', textAlign: 'center' }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
            textTransform: 'uppercase', marginBottom: '18px' }}>
            Added to the Atlas
          </div>
          <h1 style={{ ...serif, fontSize: 'clamp(26px,4vw,38px)', fontWeight: 400,
            color: dark, lineHeight: 1.1, marginBottom: '24px' }}>
            {saved.length === 1 ? `${saved[0].name} is on the map.` : `${saved.length} entries are on the map.`}
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            {saved.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '10px' }}>
                <LabelBadge label={s.label} />
                <span style={{ ...body, fontSize: '15px', color: dark }}>{s.name}</span>
                <Link to={`/org/${s.slug || s.id}`} target="_blank"
                  style={{ ...sc, fontSize: '11px', letterSpacing: '0.12em', color: gold, textDecoration: 'none' }}>
                  View
                </Link>
              </div>
            ))}
          </div>
          {!represents && (
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)',
              lineHeight: 1.7, marginBottom: '28px' }}>
              Send the profile link above to anyone who wants to claim and manage their entry.
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={reset}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                borderRadius: '40px', background: 'rgba(200,146,42,0.06)',
                border: '1.5px solid rgba(200,146,42,0.55)', color: gold, cursor: 'pointer' }}>
              Add another
            </button>
            <Link to="/feed"
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '12px 24px',
                borderRadius: '40px', background: 'transparent',
                border: '1px solid rgba(200,146,42,0.30)',
                color: 'rgba(15,21,35,0.72)', textDecoration: 'none' }}>
              Back to feed
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  if (authLoading) return <div style={{ background: parch, minHeight: '100vh' }}><Nav /></div>

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '96px 24px 120px' }}>

        {/* Header */}
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
          textTransform: 'uppercase', marginBottom: '12px' }}>Atlas</div>
        <h1 style={{ ...serif, fontSize: 'clamp(30px,5vw,46px)', fontWeight: 400,
          color: dark, lineHeight: 1.08, marginBottom: '10px' }}>
          Add to the ecosystem
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.7, marginBottom: '40px', maxWidth: '520px' }}>
          Paste a URL and we'll read the site and identify what belongs on the map.
          Review the proposals, tick what you want, and they go live immediately.
        </p>

        {/* ── URL input ─────────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="url" value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && readSite()}
              placeholder="https://..."
              style={{ ...body, fontSize: '16px', color: dark, padding: '13px 18px',
                borderRadius: '10px', border: '1.5px solid rgba(200,146,42,0.40)',
                background: '#FFFFFF', outline: 'none', flex: 1 }}
            />
            <button onClick={readSite} disabled={reading || !url.trim()}
              style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em',
                padding: '13px 26px', borderRadius: '40px', border: 'none',
                background: reading || !url.trim() ? 'rgba(200,146,42,0.30)' : '#C8922A',
                color: '#FFFFFF', whiteSpace: 'nowrap', cursor: reading ? 'wait' : 'pointer',
                opacity: !url.trim() ? 0.5 : 1 }}>
              {reading ? 'Reading...' : 'Read site'}
            </button>
          </div>
          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)',
            marginTop: '8px', marginBottom: 0 }}>
            You can also paste a description or raw HTML if the URL is not publicly readable.
          </p>
        </div>

        {/* ── Error ─────────────────────────────────────────── */}
        {readErr && (
          <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.25)',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
            <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{readErr}</p>
          </div>
        )}

        {/* ── Duplicate warning ─────────────────────────────── */}
        {duplicates.length > 0 && !dupDismissed && (
          <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.30)',
            borderRadius: '12px', padding: '16px 18px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '10px' }}>
              <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: gold }}>
                Already on the map
              </div>
              <button onClick={() => setDupDismissed(true)}
                style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.45)',
                  background: 'none', border: 'none', cursor: 'pointer' }}>
                These are different, continue
              </button>
            </div>
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
              lineHeight: 1.55, marginBottom: '10px' }}>
              {duplicates.length === 1 ? 'An entry that looks similar is' : 'Entries that look similar are'} already on the map.
              Is one of these what you're adding?
            </p>
            {duplicates.map(a => <DuplicateCard key={a.id} actor={a} />)}
          </div>
        )}

        {/* ── Proposals ─────────────────────────────────────── */}
        {proposals.length > 0 && (
          <>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em',
              color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>
              {proposals.length} {proposals.length === 1 ? 'record' : 'records'} identified —
              tick the ones you want to add
            </div>

            {proposals.map((p, i) => (
              <ProposalCard key={i} proposal={p} index={i}
                checked={checked[i]} onToggle={toggleChecked} onChange={handleChange} />
            ))}

            {/* ── Representation toggle ─────────────────────── */}
            <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.25)',
              borderRadius: '12px', padding: '18px 20px', marginBottom: '24px' }}>
              <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.18em',
                color: 'rgba(15,21,35,0.45)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Your relationship to {selectedCount === 1 ? 'this entry' : 'these entries'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { val: false, label: "I'm adding this to the ecosystem",
                    hint: "I don't represent this organisation. NextUs holds the entry in trust until they claim it." },
                  { val: true, label: 'I represent this organisation',
                    hint: "I'm adding my own entry. I'll be the owner." },
                ].map(opt => (
                  <button key={String(opt.val)} type="button" onClick={() => setRepresents(opt.val)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '12px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      border: represents === opt.val
                        ? '1.5px solid rgba(200,146,42,0.55)' : '1.5px solid rgba(200,146,42,0.18)',
                      background: represents === opt.val ? 'rgba(200,146,42,0.04)' : '#FAFAF7' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                      marginTop: '2px',
                      border: represents === opt.val ? '5px solid #A8721A' : '2px solid rgba(200,146,42,0.35)',
                      background: '#FFFFFF', transition: 'all 0.15s ease' }} />
                    <div>
                      <div style={{ ...body, fontSize: '14px', color: dark, lineHeight: 1.3 }}>{opt.label}</div>
                      <div style={{ ...body, fontSize: '12px', color: 'rgba(15,21,35,0.55)',
                        lineHeight: 1.5, marginTop: '2px' }}>{opt.hint}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Save ─────────────────────────────────────────*/}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={saveSelected} disabled={saving || selectedCount === 0}
                style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em',
                  padding: '14px 32px', borderRadius: '40px', border: 'none',
                  background: saving || selectedCount === 0 ? 'rgba(200,146,42,0.30)' : '#C8922A',
                  color: '#FFFFFF',
                  cursor: saving || selectedCount === 0 ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Adding...' : `Add ${selectedCount} to the Atlas`}
              </button>
              <button onClick={reset}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em',
                  color: 'rgba(15,21,35,0.45)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Clear
              </button>
            </div>
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)',
              lineHeight: 1.55, marginTop: '12px' }}>
              {represents
                ? 'Your entries go live immediately.'
                : 'Entries go live immediately. Organisations can claim and manage them later.'
              }
            </p>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
