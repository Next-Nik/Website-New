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

// ── Alignment score display ───────────────────────────────────

const TIER_CONFIG = {
  pattern_instance: { label: 'Pattern instance', color: '#8A3030', bg: 'rgba(138,48,48,0.08)', border: 'rgba(138,48,48,0.25)' },
  contested:        { label: 'Contested',         color: '#8A6020', bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.30)' },
  qualified:        { label: 'Qualified',          color: gold,      bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.30)' },
  exemplar:         { label: 'Exemplar',            color: '#6A4A10', bg: 'rgba(106,74,16,0.10)', border: 'rgba(106,74,16,0.35)' },
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
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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

// ── Tooltip ───────────────────────────────────────────────────

function TooltipWord({ word, tip }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: gold,
          borderBottom: '1px dashed rgba(168,114,26,0.50)', cursor: 'default' }}>
        {word}
      </span>
      {show && (
        <span style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: '6px', background: '#0F1523', color: '#FAFAF7',
          ...body, fontSize: '13px', lineHeight: 1.55,
          padding: '8px 12px', borderRadius: '8px', whiteSpace: 'nowrap', maxWidth: '220px',
          whiteSpace: 'normal', zIndex: 100, boxShadow: '0 4px 16px rgba(15,21,35,0.25)' }}>
          {tip}
        </span>
      )}
    </span>
  )
}

// ── Assessment card ───────────────────────────────────────────

function AssessmentCard({ assessment }) {
  if (!assessment) return null
  const tier = TIER_CONFIG[assessment.placement_tier] || TIER_CONFIG.qualified
  const trackLabel = { planet: 'Planet', self: 'Self', both: 'Planet + Self' }[assessment.track] || assessment.track

  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.25)',
      borderRadius: '14px', padding: '24px', marginBottom: '32px' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...sc, fontSize: '48px', fontWeight: 700, color: dark, lineHeight: 1 }}>
              {assessment.alignment_score}
            </div>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)' }}>
              / 10
            </div>
          </div>
          <div>
            <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
              padding: '4px 12px', borderRadius: '40px',
              border: `1px solid ${tier.border}`, color: tier.color, background: tier.bg,
              display: 'inline-block', marginBottom: '6px' }}>
              {tier.label}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Pill label={trackLabel} variant="blue" />
              {assessment.dual_placement && <Pill label="Dual placement" variant="amber" />}
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>
            Confidence
          </div>
          <div style={{ ...body, fontSize: '22px', color: dark }}>
            {assessment.confidence}%
          </div>
        </div>
      </div>

      {/* Score reasoning */}
      {assessment.score_reasoning && (
        <div style={{ borderLeft: '2px solid rgba(200,146,42,0.30)', paddingLeft: '14px', marginBottom: '20px' }}>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold, marginBottom: '6px' }}>
            Assessment reasoning
          </p>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>
            {assessment.score_reasoning}
          </p>
        </div>
      )}

      {/* Dual placement note */}
      {assessment.dual_placement && assessment.dual_note && (
        <div style={{ background: 'rgba(42,74,138,0.05)', border: '1px solid rgba(42,74,138,0.20)',
          borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#2A4A8A', marginBottom: '4px' }}>
            Dual placement
          </p>
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
            {assessment.dual_note}
          </p>
        </div>
      )}

      {/* HAL signals */}
      {assessment.hal_signals?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#2A6B3A', marginBottom: '8px' }}>
            Horizon Alignment conditions demonstrated
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {assessment.hal_signals.map(s => <Pill key={s} label={s} variant="green" />)}
          </div>
        </div>
      )}

      {/* SFP patterns */}
      {assessment.sfp_patterns?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#8A6020', marginBottom: '8px' }}>
            Structural Failure Patterns active
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {assessment.sfp_patterns.map(s => <Pill key={s} label={s} variant="amber" />)}
          </div>
        </div>
      )}

      {/* Confidence note */}
      {assessment.confidence_note && (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.50)', lineHeight: 1.55, marginTop: '8px', marginBottom: 0 }}>
          {assessment.confidence_note}
        </p>
      )}
    </div>
  )
}

// ── Empty form ────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', type: 'organisation', track: 'planet',
  domain_id: '', scale: '', scale_notes: '',
  location_name: '', website: '',
  description: '', impact_summary: '',
  contact_email: '', curator_notes: '',
}

// ── Main page ─────────────────────────────────────────────────

export function NextUsPlacePage() {
  const navigate        = useNavigate()
  const { user, loading } = useAuth()

  const [mode, setMode]         = useState('ai')    // 'ai' | 'manual'
  const [input, setInput]       = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(null)
  const [assessment, setAssessment] = useState(null)

  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState(null)
  const [placedId, setPlacedId] = useState(null)

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading, navigate])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  // Populate form from AI extraction result
  function populateFromAssessment(result) {
    setAssessment(result)
    setForm(f => ({
      ...f,
      name:          result.name || f.name,
      type:          result.type || f.type,
      track:         result.track === 'both' ? 'both' : result.track || f.track,
      domain_id:     result.domain_id || f.domain_id,
      scale:         result.scale || f.scale,
      scale_notes:   result.scale_notes || f.scale_notes,
      location_name: result.location_name || f.location_name,
      website:       result.website || f.website,
      description:   result.description || f.description,
      impact_summary:result.impact_summary || f.impact_summary,
      contact_email: result.contact_email || f.contact_email,
    }))
  }

  async function extract() {
    if (!input.trim()) return
    setExtracting(true)
    setExtractError(null)
    setAssessment(null)

    try {
      const res = await fetch('/api/org-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      const data = await res.json()

      if (data.error) {
        setExtractError(data.message || 'Extraction failed. Try pasting a description instead.')
        return
      }

      populateFromAssessment(data.result)
    } catch (err) {
      setExtractError('Could not reach the extraction service. Try manual entry.')
    } finally {
      setExtracting(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.domain_id)   { setError('Please select a domain.'); return }
    if (!user?.email)      { setError('You must be signed in to place an actor.'); return }

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
    }

    // AI assessment fields
    if (assessment) {
      payload.alignment_score          = assessment.alignment_score
      payload.alignment_score_computed = true
      payload.alignment_score_updated_at = new Date().toISOString()
      payload.placement_tier           = assessment.placement_tier
      payload.alignment_reasoning      = {
        hal_signals:     assessment.hal_signals,
        sfp_patterns:    assessment.sfp_patterns,
        score_reasoning: assessment.score_reasoning,
        confidence:      assessment.confidence,
        confidence_note: assessment.confidence_note,
        dual_placement:  assessment.dual_placement,
        dual_note:       assessment.dual_note,
        extracted_at:    new Date().toISOString(),
        input_mode:      mode,
        curator_notes:   form.curator_notes.trim() || null,
      }
    } else {
      // Manual — no AI assessment
      payload.alignment_reasoning = form.curator_notes.trim()
        ? { curator_notes: form.curator_notes.trim(), input_mode: 'manual' }
        : null
    }

    const { data: inserted, error: saveError } = await supabase
      .from('nextus_actors')
      .insert(payload)
      .select('id')
      .single()

    // Notify via waitlist
    const notifyEmail = form.contact_email.trim() || user.email
    await supabase.from('nextus_waitlist').insert({
      email:  notifyEmail,
      source: 'place_form',
      note:   `Placed: ${form.name.trim()}`,
    }).then(() => {})

    setSaving(false)

    if (saveError) {
      console.error('Supabase insert error:', saveError)
      setError(`Insert failed: ${saveError.message || saveError.code || 'Unknown error'}`)
      return
    }
    if (inserted?.id) setPlacedId(inserted.id)
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
            Profile submitted for review.
          </h2>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75,
            maxWidth: '420px', margin: '0 auto 12px' }}>
            {assessment
              ? `The alignment assessment is in the review queue. We'll place them on the map once approved.`
              : `The nomination is in the review queue. We'll be in touch once it's reviewed.`}
          </p>
          {form.contact_email && (
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.50)', lineHeight: 1.65,
              maxWidth: '420px', margin: '0 auto 32px' }}>
              We'll notify {form.contact_email} when approved.
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
            <button onClick={() => { setForm(EMPTY_FORM); setAssessment(null); setInput(''); setDone(false); setPlacedId(null) }}
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

  // ── Domain options based on track ──────────────────────────

  const domainOptions = () => {
    const blank = [{ value: '', label: '— Select domain —' }]
    if (form.track === 'self')   return [...blank, ...SELF_DOMAINS]
    if (form.track === 'planet') return [...blank, ...PLANET_DOMAINS]
    return [...blank,
      { value: '', label: '── Planet domains ──', disabled: true },
      ...PLANET_DOMAINS,
      { value: '', label: '── Self domains ──', disabled: true },
      ...SELF_DOMAINS,
    ]
  }

  const showSelfDisclaimer = form.track === 'self' || form.track === 'both'

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

      <div className="place-main" style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 40px 120px' }}>

        {/* Back */}
        <button onClick={() => navigate('/nextus/actors')} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)',
          background: 'none', border: 'none', cursor: 'pointer', marginBottom: '32px', padding: 0,
        }}>
          ← Orgs in the Field
        </button>

        {/* Header */}
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '12px' }}>
          NextUs · Place
        </span>
        <h1 style={{ ...body, fontSize: 'clamp(28px,4vw,42px)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '14px' }}>
          Place someone doing the work.
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '40px', maxWidth: '480px' }}>
          One field. Paste a URL, a description, or the HTML source of their site.
          The system reads it and builds their profile. Review everything before submitting.
        </p>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[['ai', 'AI extraction'], ['manual', 'Manual entry']].map(([val, label]) => (
            <button key={val} onClick={() => { setMode(val); setAssessment(null); setExtractError(null) }}
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

        {/* AI extraction input */}
        {mode === 'ai' && !assessment && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>
                Paste:{' '}
                <TooltipWord word="URL" tip="The web address of their site. Works for most organisations." />{' · '}
                <TooltipWord word="Description" tip="Anything you've written or copied about them — bio, about page, LinkedIn." />{' · '}
                <TooltipWord word="HTML source" tip="Right-click any page → View Source → Copy All. Works when URLs are blocked." />
              </span>
            </div>
            <TextArea
              value={input}
              onChange={setInput}
              placeholder="Paste a URL, a description, or raw HTML source..."
              rows={5}
            />
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

        {/* Re-extract option after assessment */}
        {mode === 'ai' && assessment && (
          <div style={{ marginBottom: '24px' }}>
            <button onClick={() => { setAssessment(null); setExtractError(null) }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ← Re-extract
            </button>
          </div>
        )}

        {/* Assessment card */}
        <AssessmentCard assessment={assessment} />

        {/* Profile form — shown after extraction OR in manual mode */}
        {(assessment || mode === 'manual') && (
          <form onSubmit={submit}>

            <div style={{ marginBottom: '24px' }}>
              <Label required>Name</Label>
              <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Organisation, project, or practitioner name" />
            </div>

            <div className="place-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <Label>Type</Label>
                <SelectInput value={form.type} onChange={v => set('type', v)} options={TYPES} />
              </div>
              <div>
                <Label>Track</Label>
                <SelectInput value={form.track} onChange={v => { set('track', v); set('domain_id', '') }}
                  options={[
                    { value: 'planet', label: 'NextUs Planet' },
                    { value: 'self',   label: 'NextUs Self' },
                    { value: 'both',   label: 'Both tracks' },
                  ]} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label required>Domain</Label>
              <SelectInput value={form.domain_id} onChange={v => set('domain_id', v)} options={domainOptions()} />
            </div>

            <div className="place-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <Label>Scale</Label>
                <SelectInput value={form.scale} onChange={v => set('scale', v)} options={SCALES} />
              </div>
              <div>
                <Label>Location</Label>
                <TextInput value={form.location_name} onChange={v => set('location_name', v)} placeholder="e.g. Bali, Indonesia" />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label>Scale notes</Label>
              <TextInput value={form.scale_notes} onChange={v => set('scale_notes', v)}
                placeholder="e.g. Podcast reaches global audience. Core work is local 1:1." />
              <Hint>Reach or delivery distinctions that don't fit the primary scale.</Hint>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label>Website</Label>
              <TextInput value={form.website} onChange={v => set('website', v)} placeholder="https://..." />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label>Description</Label>
              <TextArea value={form.description} onChange={v => set('description', v)}
                placeholder="What they do and why it matters — in their own language mapped to the NextUs frame."
                rows={3} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Label>Impact summary</Label>
              <TextArea value={form.impact_summary} onChange={v => set('impact_summary', v)}
                placeholder="Specific evidence of impact — numbers, geographies, outcomes. Optional."
                rows={2} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', margin: '32px 0' }} />

            <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>
              For the review
            </p>

            <div className="place-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <Label>Contact email</Label>
                <TextInput value={form.contact_email} onChange={v => set('contact_email', v)}
                  placeholder="Their email for notification" type="email" />
                <Hint>For notification when placed. Not published.</Hint>
              </div>
              <div>
                <Label>Curator notes</Label>
                <TextInput value={form.curator_notes} onChange={v => set('curator_notes', v)}
                  placeholder="Anything the reviewer should know" />
                <Hint>Not published.</Hint>
              </div>
            </div>

            {/* Self track disclaimer */}
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
