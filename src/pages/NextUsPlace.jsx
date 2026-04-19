import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

// ── Domain lists ──────────────────────────────────────────────

const PLANET_DOMAINS = [
  { value: 'human-being',     label: 'Human Being' },
  { value: 'society',         label: 'Society' },
  { value: 'nature',          label: 'Nature' },
  { value: 'technology',      label: 'Technology' },
  { value: 'finance-economy', label: 'Finance & Economy' },
  { value: 'legacy',          label: 'Legacy' },
  { value: 'vision',          label: 'Vision' },
]

const SELF_DOMAINS = [
  { value: 'path',       label: 'Path' },
  { value: 'spark',      label: 'Spark' },
  { value: 'body',       label: 'Body' },
  { value: 'finances',   label: 'Finances' },
  { value: 'connection', label: 'Connection' },
  { value: 'inner-game', label: 'Inner Game' },
  { value: 'signal',     label: 'Signal' },
]

const SCALES = [
  { value: '',              label: '— Select scale —' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

const TYPES = [
  { value: 'organisation', label: 'Organisation' },
  { value: 'project',      label: 'Project' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'programme',    label: 'Programme' },
  { value: 'resource',     label: 'Resource' },
]

const TIER_CONFIG = {
  pattern_instance: { label: 'Pattern instance', color: '#8A3030', bg: 'rgba(138,48,48,0.08)', border: 'rgba(138,48,48,0.25)' },
  contested:        { label: 'Contested',         color: '#8A6020', bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.30)' },
  qualified:        { label: 'Qualified',          color: gold,      bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.30)' },
  exemplar:         { label: 'Exemplar',            color: '#6A4A10', bg: 'rgba(106,74,16,0.10)', border: 'rgba(106,74,16,0.35)' },
}

const LABEL_COLORS = {
  Planet:       { color: '#2A4A8A', bg: 'rgba(42,74,138,0.08)',  border: 'rgba(42,74,138,0.25)' },
  Self:         { color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)', border: 'rgba(42,107,58,0.25)' },
  Practitioner: { color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.25)' },
}

// ── Shared UI ─────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
      {children}{required && <span style={{ color: '#8A3030', marginLeft: '4px' }}>*</span>}
    </label>
  )
}

function Hint({ children }) {
  return <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '5px', lineHeight: 1.5, margin: '5px 0 0' }}>{children}</p>
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none',
        width: '100%', resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }} />
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </select>
  )
}

function Pill({ label, variant = 'gold' }) {
  const colors = {
    gold:   { color: gold,      bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.25)' },
    green:  { color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)',  border: 'rgba(42,107,58,0.25)' },
    amber:  { color: '#8A6020', bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.20)' },
    blue:   { color: '#2A4A8A', bg: 'rgba(42,74,138,0.08)',  border: 'rgba(42,74,138,0.25)' },
  }
  const c = colors[variant] || colors.gold
  return (
    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', padding: '3px 10px',
      borderRadius: '40px', border: `1px solid ${c.border}`, color: c.color, background: c.bg,
      display: 'inline-block', margin: '2px' }}>
      {label}
    </span>
  )
}

function TooltipWord({ word, tip }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
          borderBottom: '1px dashed rgba(168,114,26,0.50)', cursor: 'default' }}>
        {word}
      </span>
      {show && (
        <span style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: '6px', background: '#0F1523', color: '#FAFAF7',
          ...body, fontSize: '13px', lineHeight: 1.55,
          padding: '8px 12px', borderRadius: '8px', maxWidth: '220px',
          whiteSpace: 'normal', zIndex: 100, boxShadow: '0 4px 16px rgba(15,21,35,0.25)' }}>
          {tip}
        </span>
      )}
    </span>
  )
}

// ── Proposal card (multi-record mode) ─────────────────────────

function ProposalCard({ proposal, index, checked, onToggle, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const tier = TIER_CONFIG[proposal.placement_tier] || TIER_CONFIG.qualified
  const labelColor = LABEL_COLORS[proposal.label] || LABEL_COLORS.Planet

  function set(k, v) { onChange(index, k, v) }

  function domainOptions() {
    const blank = [{ value: '', label: '— Select domain —' }]
    if (proposal.track === 'self')   return [...blank, ...SELF_DOMAINS]
    if (proposal.track === 'planet') return [...blank, ...PLANET_DOMAINS]
    return [...blank,
      { value: '', label: '── Planet domains ──', disabled: true }, ...PLANET_DOMAINS,
      { value: '', label: '── Self domains ──', disabled: true }, ...SELF_DOMAINS,
    ]
  }

  return (
    <div style={{
      background: checked ? '#FFFFFF' : 'rgba(15,21,35,0.03)',
      border: checked ? '1.5px solid rgba(200,146,42,0.40)' : '1.5px solid rgba(15,21,35,0.12)',
      borderRadius: '14px', marginBottom: '16px',
      opacity: checked ? 1 : 0.55, transition: 'all 0.15s',
    }}>

      {/* Header */}
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>

        <input type="checkbox" checked={checked} onChange={() => onToggle(index)}
          style={{ width: '18px', height: '18px', accentColor: '#C8922A', marginTop: '4px', flexShrink: 0, cursor: 'pointer' }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label badge + tier */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', padding: '3px 10px',
              borderRadius: '40px', border: `1px solid ${labelColor.border}`,
              color: labelColor.color, background: labelColor.bg }}>
              {proposal.label}
            </span>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', padding: '3px 10px',
              borderRadius: '40px', border: `1px solid ${tier.border}`, color: tier.color, background: tier.bg }}>
              {tier.label}
            </span>
            <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.45)' }}>
              {proposal.confidence}% confidence
            </span>
          </div>

          {/* Name + score */}
          <div style={{ ...body, fontSize: '18px', fontWeight: 300, color: dark, marginBottom: '6px' }}>
            {proposal.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '10px' }}>
            <span style={{ ...sc, fontSize: '40px', fontWeight: 700, color: dark, lineHeight: 1 }}>
              {proposal.alignment_score}
            </span>
            <span style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.35)' }}>/10</span>
          </div>

          {/* Reasoning */}
          {proposal.score_reasoning && (
            <div style={{ borderLeft: '2px solid rgba(200,146,42,0.28)', paddingLeft: '12px', marginBottom: '10px' }}>
              <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: 0 }}>
                {proposal.score_reasoning}
              </p>
            </div>
          )}

          {/* HAL */}
          {proposal.hal_signals?.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#2A6B3A', marginBottom: '5px' }}>
                Horizon Alignment conditions
              </p>
              <div>{proposal.hal_signals.map(s => <Pill key={s} label={s} variant="green" />)}</div>
            </div>
          )}

          {/* SFP */}
          {proposal.sfp_patterns?.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#8A6020', marginBottom: '5px' }}>
                Structural Failure Patterns active
              </p>
              <div>{proposal.sfp_patterns.map(s => <Pill key={s} label={s} variant="amber" />)}</div>
            </div>
          )}

          {proposal.confidence_note && (
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)', lineHeight: 1.55, marginTop: '6px', marginBottom: 0 }}>
              {proposal.confidence_note}
            </p>
          )}
        </div>

        {/* Expand edit */}
        <button onClick={() => setExpanded(e => !e)}
          style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.50)',
            background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, paddingTop: '4px' }}>
          {expanded ? 'Done ↑' : 'Edit ↓'}
        </button>
      </div>

      {/* Editable fields */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(200,146,42,0.15)', padding: '18px 20px 20px', display: 'grid', gap: '14px' }}>

          <div>
            <Label>Name</Label>
            <TextInput value={proposal.name} onChange={v => set('name', v)} placeholder="Name" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Label>Type</Label>
              <SelectInput value={proposal.type} onChange={v => set('type', v)} options={TYPES} />
            </div>
            <div>
              <Label>Scale</Label>
              <SelectInput value={proposal.scale || ''} onChange={v => set('scale', v)} options={SCALES} />
            </div>
          </div>

          <div>
            <Label>Domain</Label>
            <SelectInput value={proposal.domain_id || ''} onChange={v => set('domain_id', v)} options={domainOptions()} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Label>Location</Label>
              <TextInput value={proposal.location_name || ''} onChange={v => set('location_name', v)} placeholder="e.g. Mexico City" />
            </div>
            <div>
              <Label>Website</Label>
              <TextInput value={proposal.website || ''} onChange={v => set('website', v)} placeholder="https://..." />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <TextArea value={proposal.description || ''} onChange={v => set('description', v)} rows={3}
              placeholder="What they do and why it matters." />
          </div>

          <div>
            <Label>Impact summary</Label>
            <TextArea value={proposal.impact_summary || ''} onChange={v => set('impact_summary', v)} rows={2}
              placeholder="Evidence of impact. Optional." />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Empty manual form ─────────────────────────────────────────

const EMPTY_FORM = {
  name: '', type: 'organisation', track: 'planet',
  domain_id: '', scale: '', scale_notes: '',
  location_name: '', website: '',
  description: '', impact_summary: '',
  contact_email: '', curator_notes: '',
}

// ── Main page ─────────────────────────────────────────────────

export function NextUsPlacePage() {
  const navigate          = useNavigate()
  const { user, loading } = useAuth()

  const [mode, setMode]         = useState('ai')   // 'ai' | 'manual'
  const [input, setInput]       = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(null)

  // Multi-record state
  const [proposals, setProposals] = useState([])   // array of proposal objects
  const [checked,   setChecked]   = useState([])   // boolean[] parallel to proposals

  // Manual single-form state
  const [form, setForm] = useState(EMPTY_FORM)

  const [saving,    setSaving]  = useState(false)
  const [done,      setDone]    = useState(false)
  const [doneNames, setDoneNames] = useState([])
  const [error,     setError]   = useState(null)
  const [contactEmail, setContactEmail] = useState('')
  const [curatorNotes, setCuratorNotes] = useState('')

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading, navigate])

  function setF(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function toggleChecked(i) { setChecked(c => c.map((v, idx) => idx === i ? !v : v)) }

  function handleProposalChange(i, key, value) {
    setProposals(ps => ps.map((p, idx) => idx === i ? { ...p, [key]: value } : p))
  }

  // ── Extract ────────────────────────────────────────────────

  async function extract() {
    if (!input.trim()) return
    setExtracting(true)
    setExtractError(null)
    setProposals([])
    setChecked([])

    try {
      const res  = await fetch('/api/org-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      const data = await res.json()

      if (data.error) {
        setExtractError(data.message || 'Extraction failed. Try pasting a description instead.')
        return
      }

      const results = data.results || []
      setProposals(results)
      setChecked(results.map(() => true))
    } catch {
      setExtractError('Could not reach the extraction service. Try manual entry.')
    } finally {
      setExtracting(false)
    }
  }

  // ── Submit selected proposals ──────────────────────────────

  async function submitProposals(e) {
    e.preventDefault()
    const selected = proposals.filter((_, i) => checked[i])
    if (selected.length === 0) { setError('Select at least one entry to submit.'); return }
    for (const p of selected) {
      if (!p.name?.trim())  { setError(`Name is required on the ${p.label} entry.`); return }
      if (!p.domain_id)     { setError(`Domain is required on the ${p.label} entry.`); return }
    }
    if (!user?.email) { setError('You must be signed in to submit.'); return }

    setSaving(true)
    setError(null)
    const savedNames = []

    for (const p of selected) {
      const payload = {
        name:            p.name.trim(),
        type:            p.type || 'organisation',
        track:           p.track || null,
        domain_id:       p.domain_id,
        scale:           p.scale || null,
        scale_notes:     p.scale_notes?.trim() || null,
        location_name:   p.location_name?.trim() || null,
        website:         p.website?.trim() || null,
        description:     p.description?.trim() || null,
        impact_summary:  p.impact_summary?.trim() || null,
        nominator_email: contactEmail.trim() || user.email,
        nominator_name:  null,
        data_source:     `Placed by ${user.email} — ${p.label}`,
        seeded_by:       'community',
        vetting_status:  'nominated',
        alignment_score: p.alignment_score != null ? parseFloat(p.alignment_score) : null,
        alignment_score_computed: true,
        alignment_score_updated_at: new Date().toISOString(),
        placement_tier:  p.placement_tier || null,
        alignment_reasoning: {
          hal_signals:     p.hal_signals,
          sfp_patterns:    p.sfp_patterns,
          score_reasoning: p.score_reasoning,
          confidence:      p.confidence,
          confidence_note: p.confidence_note,
          extracted_at:    new Date().toISOString(),
          input_mode:      'ai',
          label:           p.label,
          curator_notes:   curatorNotes.trim() || null,
        },
      }

      const { error: saveError } = await supabase.from('nextus_actors').insert(payload)

      if (saveError) {
        setSaving(false)
        setError(`Failed to submit ${p.label} entry: ${saveError.message}`)
        return
      }

      savedNames.push(p.name)
    }

    // Waitlist notification
    const notifyEmail = contactEmail.trim() || user.email
    await supabase.from('nextus_waitlist').insert({
      email:  notifyEmail,
      source: 'place_form',
      note:   `Placed: ${savedNames.join(', ')}`,
    }).then(() => {})

    setSaving(false)
    setDoneNames(savedNames)
    setDone(true)
  }

  // ── Submit manual form ─────────────────────────────────────

  async function submitManual(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.domain_id)   { setError('Please select a domain.'); return }
    if (!user?.email)      { setError('You must be signed in.'); return }

    setSaving(true)
    setError(null)

    const payload = {
      name:            form.name.trim(),
      type:            form.type,
      website:         form.website.trim() || null,
      domain_id:       form.domain_id || null,
      scale:           form.scale || null,
      scale_notes:     form.scale_notes.trim() || null,
      location_name:   form.location_name.trim() || null,
      description:     form.description.trim() || null,
      impact_summary:  form.impact_summary.trim() || null,
      nominator_email: form.contact_email.trim() || null,
      nominator_name:  null,
      data_source:     `Placed by ${user.email}`,
      seeded_by:       'community',
      vetting_status:  'nominated',
      alignment_reasoning: form.curator_notes.trim()
        ? { curator_notes: form.curator_notes.trim(), input_mode: 'manual' }
        : null,
    }

    const { error: saveError } = await supabase.from('nextus_actors').insert(payload)

    await supabase.from('nextus_waitlist').insert({
      email:  form.contact_email.trim() || user.email,
      source: 'place_form',
      note:   `Placed: ${form.name.trim()}`,
    }).then(() => {})

    setSaving(false)

    if (saveError) {
      setError(`Insert failed: ${saveError.message}`)
      return
    }

    setDoneNames([form.name.trim()])
    setDone(true)
  }

  if (loading || !user) return <div className="loading" />

  // ── Success screen ─────────────────────────────────────────

  if (done) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(42,107,58,0.10)', border: '1.5px solid rgba(42,107,58,0.40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
            <span style={{ color: '#2A6B3A', fontSize: '22px' }}>✓</span>
          </div>
          <h2 style={{ ...body, fontSize: '30px', fontWeight: 300, color: dark, marginBottom: '14px' }}>
            {doneNames.length === 1 ? 'Profile submitted for review.' : `${doneNames.length} profiles submitted for review.`}
          </h2>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75,
            maxWidth: '420px', margin: '0 auto 12px' }}>
            {doneNames.length > 1
              ? `${doneNames.join(', ')} — all in the review queue. We'll place them on the map once approved.`
              : `The alignment assessment is in the review queue. We'll place them on the map once approved.`}
          </p>
          {contactEmail && (
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.50)', lineHeight: 1.65,
              maxWidth: '420px', margin: '0 auto 32px' }}>
              We'll notify {contactEmail} when approved.
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
            <button onClick={() => { setProposals([]); setChecked([]); setForm(EMPTY_FORM); setInput(''); setDone(false); setDoneNames([]) }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px',
                borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)',
                background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}>
              Place another
            </button>
            <button onClick={() => navigate('/nextus/actors')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px',
                borderRadius: '40px', border: '1px solid rgba(15,21,35,0.25)',
                background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}>
              View actors
            </button>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  // ── Domain options (manual mode) ───────────────────────────

  const domainOptions = () => {
    const blank = [{ value: '', label: '— Select domain —' }]
    if (form.track === 'self')   return [...blank, ...SELF_DOMAINS]
    if (form.track === 'planet') return [...blank, ...PLANET_DOMAINS]
    return [...blank,
      { value: '', label: '── Planet domains ──', disabled: true }, ...PLANET_DOMAINS,
      { value: '', label: '── Self domains ──', disabled: true }, ...SELF_DOMAINS,
    ]
  }

  const showSelfDisclaimer = form.track === 'self' || form.track === 'both'
  const selectedCount = checked.filter(Boolean).length

  // ── Main render ────────────────────────────────────────────

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      <style>{`
        @media (max-width: 640px) {
          .place-main { padding-left: 20px !important; padding-right: 20px !important; }
          .place-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="place-main" style={{ maxWidth: '640px', margin: '0 auto', padding: '80px 40px 120px' }}>

        {/* Back */}
        <button onClick={() => navigate('/nextus/actors')} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)',
          background: 'none', border: 'none', cursor: 'pointer', marginBottom: '32px', padding: 0,
        }}>
          ← Orgs and Individuals
        </button>

        {/* Header */}
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '12px' }}>
          NextUs · Place
        </span>
        <h1 style={{ ...body, fontSize: 'clamp(28px,4vw,42px)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '14px' }}>
          Place someone doing the work.
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '40px', maxWidth: '520px' }}>
          One field. Paste a URL, a description, or the HTML source of their site.
          The system reads it and may identify multiple entries — Planet, Self, and Practitioner — each assessed separately.
          Tick the ones you want to submit.
        </p>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[['ai', 'AI extraction'], ['manual', 'Manual entry']].map(([val, label]) => (
            <button key={val} onClick={() => { setMode(val); setProposals([]); setChecked([]); setExtractError(null) }}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.12em',
                padding: '7px 18px', borderRadius: '40px', cursor: 'pointer',
                border: mode === val ? '1.5px solid rgba(168,114,26,0.78)' : '1px solid rgba(200,146,42,0.30)',
                background: mode === val ? 'rgba(168,114,26,0.08)' : 'transparent',
                color: mode === val ? gold : 'rgba(15,21,35,0.55)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── AI mode ─────────────────────────────────────── */}
        {mode === 'ai' && (
          <>
            {/* Input — only show if no proposals yet */}
            {proposals.length === 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
                    Paste:{' '}
                    <TooltipWord word="URL" tip="The web address of their site." />{' · '}
                    <TooltipWord word="Description" tip="Bio, about page, LinkedIn — anything written about them." />{' · '}
                    <TooltipWord word="HTML source" tip="Right-click any page → View Source → Copy All." />
                  </span>
                </div>
                <TextArea value={input} onChange={setInput}
                  placeholder="Paste a URL, a description, or raw HTML source..."
                  rows={5} />
                {extractError && (
                  <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.28)',
                    borderRadius: '8px', padding: '10px 14px', marginTop: '12px' }}>
                    <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{extractError}</p>
                    <button onClick={() => setMode('manual')}
                      style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold,
                        background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', padding: 0 }}>
                      Switch to manual entry →
                    </button>
                  </div>
                )}
                <div style={{ marginTop: '14px' }}>
                  <button onClick={extract} disabled={extracting || !input.trim()}
                    style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em',
                      padding: '12px 30px', borderRadius: '40px', border: 'none',
                      background: extracting || !input.trim() ? 'rgba(200,146,42,0.30)' : '#C8922A',
                      color: '#FFFFFF', cursor: extracting || !input.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s' }}>
                    {extracting ? 'Reading...' : 'Extract profile →'}
                  </button>
                </div>
              </div>
            )}

            {/* Re-extract */}
            {proposals.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <button onClick={() => { setProposals([]); setChecked([]); setExtractError(null) }}
                  style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  ← Re-extract
                </button>
              </div>
            )}

            {/* Proposal cards */}
            {proposals.length > 0 && (
              <form onSubmit={submitProposals}>

                <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em',
                  color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>
                  {proposals.length} record{proposals.length !== 1 ? 's' : ''} identified
                  — tick the ones you want to submit for review
                </p>

                {proposals.map((p, i) => (
                  <ProposalCard
                    key={i}
                    proposal={p}
                    index={i}
                    checked={checked[i]}
                    onToggle={toggleChecked}
                    onChange={handleProposalChange}
                  />
                ))}

                <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', margin: '28px 0' }} />

                <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>
                  For the review
                </p>

                <div className="place-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <Label>Contact email</Label>
                    <TextInput value={contactEmail} onChange={setContactEmail}
                      placeholder="For notification when placed" type="email" />
                    <Hint>Not published.</Hint>
                  </div>
                  <div>
                    <Label>Curator notes</Label>
                    <TextInput value={curatorNotes} onChange={setCuratorNotes}
                      placeholder="Anything the reviewer should know" />
                    <Hint>Not published.</Hint>
                  </div>
                </div>

                {/* Self disclaimer if any Self/Practitioner entries are checked */}
                {proposals.some((p, i) => checked[i] && (p.track === 'self' || p.label === 'Practitioner')) && (
                  <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.20)',
                    borderRadius: '10px', padding: '16px 18px', marginBottom: '28px' }}>
                    <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold, marginBottom: '8px' }}>
                      NextUs Self — practitioner note
                    </p>
                    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: 0 }}>
                      Practitioners listed on NextUs Self are independent professionals. They are not employees
                      or agents of NextUs. NextUs does not warrant their credentials, qualifications, or suitability
                      for any specific need. The connection is yours to make.
                    </p>
                  </div>
                )}

                {error && (
                  <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.28)',
                    borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                    <p style={{ ...body, fontSize: '15px', color: '#8A3030', margin: 0 }}>{error}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button type="submit" disabled={saving || selectedCount === 0} style={{
                    ...sc, fontSize: '14px', letterSpacing: '0.16em',
                    padding: '13px 32px', borderRadius: '40px', border: 'none',
                    background: saving || selectedCount === 0 ? 'rgba(200,146,42,0.30)' : '#C8922A',
                    color: '#FFFFFF', cursor: saving || selectedCount === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}>
                    {saving ? 'Submitting...' : `Submit ${selectedCount} for review →`}
                  </button>
                  <button type="button" onClick={() => navigate('/nextus/actors')}
                    style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                      color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>

              </form>
            )}
          </>
        )}

        {/* ── Manual mode ──────────────────────────────────── */}
        {mode === 'manual' && (
          <form onSubmit={submitManual}>

            <div style={{ marginBottom: '24px' }}>
              <Label required>Name</Label>
              <TextInput value={form.name} onChange={v => setF('name', v)} placeholder="Organisation, project, or practitioner name" />
            </div>

            <div className="place-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <Label>Type</Label>
                <SelectInput value={form.type} onChange={v => setF('type', v)} options={TYPES} />
              </div>
              <div>
                <Label>Track</Label>
                <SelectInput value={form.track} onChange={v => { setF('track', v); setF('domain_id', '') }}
                  options={[
                    { value: 'planet', label: 'NextUs Planet' },
                    { value: 'self',   label: 'NextUs Self' },
                    { value: 'both',   label: 'Both tracks' },
                  ]} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label required>Domain</Label>
              <SelectInput value={form.domain_id} onChange={v => setF('domain_id', v)} options={domainOptions()} />
            </div>

            <div className="place-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <Label>Scale</Label>
                <SelectInput value={form.scale} onChange={v => setF('scale', v)} options={SCALES} />
              </div>
              <div>
                <Label>Location</Label>
                <TextInput value={form.location_name} onChange={v => setF('location_name', v)} placeholder="e.g. Bali, Indonesia" />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label>Scale notes</Label>
              <TextInput value={form.scale_notes} onChange={v => setF('scale_notes', v)}
                placeholder="e.g. Podcast reaches global audience. Core work is local 1:1." />
              <Hint>Reach or delivery distinctions that don't fit the primary scale.</Hint>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label>Website</Label>
              <TextInput value={form.website} onChange={v => setF('website', v)} placeholder="https://..." />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label>Description</Label>
              <TextArea value={form.description} onChange={v => setF('description', v)}
                placeholder="What they do and why it matters." rows={3} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label>Impact summary</Label>
              <TextArea value={form.impact_summary} onChange={v => setF('impact_summary', v)}
                placeholder="Specific evidence of impact. Optional." rows={2} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', margin: '32px 0' }} />

            <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>
              For the review
            </p>

            <div className="place-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <Label>Contact email</Label>
                <TextInput value={form.contact_email} onChange={v => setF('contact_email', v)}
                  placeholder="Their email for notification" type="email" />
                <Hint>For notification when placed. Not published.</Hint>
              </div>
              <div>
                <Label>Curator notes</Label>
                <TextInput value={form.curator_notes} onChange={v => setF('curator_notes', v)}
                  placeholder="Anything the reviewer should know" />
                <Hint>Not published.</Hint>
              </div>
            </div>

            {showSelfDisclaimer && (
              <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.20)',
                borderRadius: '10px', padding: '16px 18px', marginBottom: '28px' }}>
                <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold, marginBottom: '8px' }}>
                  NextUs Self — practitioner note
                </p>
                <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, margin: 0 }}>
                  Practitioners listed on NextUs Self are independent professionals. They are not employees
                  or agents of NextUs. NextUs does not warrant their credentials, qualifications, or suitability
                  for any specific need. The connection is yours to make.
                </p>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.28)',
                borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                <p style={{ ...body, fontSize: '15px', color: '#8A3030', margin: 0 }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button type="submit" disabled={saving} style={{
                ...sc, fontSize: '14px', letterSpacing: '0.16em',
                padding: '13px 32px', borderRadius: '40px', border: 'none',
                background: saving ? 'rgba(200,146,42,0.30)' : '#C8922A',
                color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}>
                {saving ? 'Submitting...' : 'Submit for review →'}
              </button>
              <button type="button" onClick={() => navigate('/nextus/actors')}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                  color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>

          </form>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
