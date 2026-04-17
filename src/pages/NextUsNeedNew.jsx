import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const NEED_TYPES = [
  { value: 'skills',       label: 'Skills',       desc: 'A specific expertise or capability — writing, design, research, translation, code, etc.' },
  { value: 'creative',     label: 'Creative',     desc: 'A creative contribution — film, photography, illustration, music, writing, design, performance.' },
  { value: 'capital',      label: 'Capital',       desc: 'Financial resources — grants, investment, donations, sponsorship.' },
  { value: 'time',         label: 'Time',          desc: 'Hands on deck — volunteer hours, short-term help, ongoing availability.' },
  { value: 'resources',    label: 'Resources',     desc: 'Tools, equipment, data, infrastructure, space, or materials.' },
  { value: 'partnerships', label: 'Partnerships',  desc: 'Organisations or individuals to work alongside — collaborators, advisors, connectors.' },
  { value: 'data',         label: 'Data',          desc: 'Research, evidence, datasets, or domain intelligence.' },
  { value: 'other',        label: 'Other',         desc: 'Something else — describe it clearly and contributors will self-select.' },
]

const COMP_TYPES = [
  { value: 'none',         label: 'Volunteer — no compensation' },
  { value: 'acknowledged', label: 'Acknowledged — credited publicly' },
  { value: 'token',        label: 'Token — NextUs platform tokens' },
  { value: 'financial',    label: 'Paid — financial compensation' },
]

function Label({ children }) {
  return (
    <label style={{ ...sc, fontSize: '13px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
      {children}
    </label>
  )
}

function Hint({ children }) {
  return (
    <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '4px', lineHeight: 1.5 }}>
      {children}
    </p>
  )
}

function Field({ children, style }) {
  return <div style={{ marginBottom: '24px', ...style }}>{children}</div>
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none', width: '100%' }} />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65 }} />
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

const EMPTY_FORM = {
  title: '',
  description: '',
  need_type: 'skills',
  size: 'micro',
  time_estimate: '',
  deadline: '',
  skills_required: '',
  compensation_type: 'none',
  compensation_detail: '',
}

export function NextUsNeedNewPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [actor, setActor]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [hasOfferings, setHasOfferings] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [error, setError]       = useState(null)

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  useEffect(() => {
    async function load() {
      const [{ data: actorData }, { count }] = await Promise.all([
        supabase.from('nextus_actors').select('id, name, domain_id, profile_owner, claimed, verified').eq('id', id).single(),
        supabase.from('nextus_actor_offerings').select('*', { count: 'exact', head: true }).eq('actor_id', id),
      ])
      setActor(actorData)
      setHasOfferings((count || 0) > 0)
      setLoading(false)
    }
    load()
  }, [id])

  // Auth + ownership guard
  useEffect(() => {
    if (authLoading || loading) return
    if (!user) { navigate('/login'); return }
    if (actor && actor.profile_owner !== user.id) {
      navigate(`/nextus/actors/${id}`)
    }
  }, [user, authLoading, actor, loading])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('A title is required.'); return }
    if (!form.description.trim()) { setError('A description is required.'); return }
    setError(null)
    setSaving(true)

    const payload = {
      actor_id:            id,
      title:               form.title.trim(),
      description:         form.description.trim(),
      need_type:           form.need_type,
      size:                form.size,
      time_estimate:       form.time_estimate.trim() || null,
      deadline:            form.deadline || null,
      skills_required:     form.skills_required ? form.skills_required.split(',').map(s => s.trim()).filter(Boolean) : [],
      compensation_type:   form.compensation_type,
      compensation_detail: form.compensation_detail.trim() || null,
      status:              'open',
      created_by:          user.id,
    }

    const { error: saveError } = await supabase.from('nextus_needs').insert(payload)
    setSaving(false)

    if (saveError) { setError('Something went wrong saving this need. Please try again.'); return }
    setSaved(true)
  }

  if (loading || authLoading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '120px 40px' }}>
          <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.55)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  // Offering gate — enforce give-first structurally
  if (hasOfferings === false) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
          <h2 style={{ ...body, fontSize: '26px', fontWeight: 300, color: dark, marginBottom: '14px' }}>
            Add an offering first.
          </h2>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '32px' }}>
            Before posting needs, {actor?.name || 'your organisation'} needs at least one offering on record — something you give to the world. Contributors want to know what you're building before they decide to help build it with you.
          </p>
          <button
            onClick={() => navigate(`/nextus/actors/${id}/manage?tab=offerings`)}
            style={{ ...sc, fontSize: '14px', letterSpacing: '0.14em', padding: '12px 28px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer' }}
          >
            Add an offering →
          </button>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(42,107,58,0.12)', border: '1.5px solid rgba(42,107,58,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <span style={{ color: '#2A6B3A', fontSize: '18px' }}>✓</span>
          </div>
          <h2 style={{ ...body, fontSize: '28px', fontWeight: 300, color: dark, marginBottom: '12px' }}>Need posted.</h2>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', marginBottom: '32px', lineHeight: 1.7 }}>
            Contributors will be able to see and respond to this need on your actor profile.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => { setForm(EMPTY_FORM); setSaved(false) }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}>
              Post another need
            </button>
            <button onClick={() => navigate(`/nextus/actors/${id}`)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px', borderRadius: '40px', border: '1px solid rgba(15,21,35,0.55)', background: 'transparent', color: 'rgba(15,21,35,0.60)', cursor: 'pointer' }}>
              Back to profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedType = NEED_TYPES.find(t => t.value === form.need_type)

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      <style>{`
        @media (max-width: 640px) {
          .need-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="need-main" style={{ maxWidth: '640px', margin: '0 auto', padding: '80px 40px 120px' }}>

        {/* Back */}
        <button onClick={() => navigate(`/nextus/actors/${id}`)} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)',
          background: 'none', border: 'none', cursor: 'pointer', marginBottom: '32px',
          padding: 0,
        }}>
          ← {actor?.name || 'Actor profile'}
        </button>

        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '12px' }}>
          {actor?.name} · Post a Need
        </span>
        <h1 style={{ ...body, fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 300, color: dark, marginBottom: '12px', lineHeight: 1.1 }}>
          What do you need?
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', marginBottom: '48px', lineHeight: 1.7, maxWidth: '480px' }}>
          Be specific. The more precisely you describe what you need, the more likely the right person finds it. Contributors self-select — your job is to make it easy for the right one to say yes.
        </p>

        <form onSubmit={handleSubmit}>

          {/* Need type */}
          <Field>
            <Label>What kind of need is this? *</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '8px' }}>
              {NEED_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setField('need_type', t.value)}
                  style={{
                    ...sc, fontSize: '13px', letterSpacing: '0.12em',
                    padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                    border: form.need_type === t.value ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)',
                    background: form.need_type === t.value ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                    color: form.need_type === t.value ? gold : 'rgba(15,21,35,0.60)',
                    textAlign: 'left',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {selectedType && <Hint>{selectedType.desc}</Hint>}
          </Field>

          {/* Size */}
          <Field>
            <Label>Size</Label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { value: 'micro', label: 'Task', desc: 'Discrete — completable in hours or days' },
                { value: 'macro', label: 'Role', desc: 'Ongoing — a sustained commitment or relationship' },
              ].map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setField('size', s.value)}
                  style={{
                    flex: 1, ...sc, fontSize: '13px', letterSpacing: '0.12em',
                    padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
                    border: form.size === s.value ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)',
                    background: form.size === s.value ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                    color: form.size === s.value ? gold : 'rgba(15,21,35,0.60)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ ...body, fontSize: '13px', fontStyle: 'normal', color: 'rgba(15,21,35,0.55)', letterSpacing: 0 }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* Title */}
          <Field>
            <Label>Title *</Label>
            <TextInput
              value={form.title}
              onChange={v => setField('title', v)}
              placeholder={
                form.need_type === 'skills'       ? 'e.g. Social media copywriter for our monthly campaign' :
                form.need_type === 'creative'     ? 'e.g. Short documentary about our reforestation work' :
                form.need_type === 'capital'      ? 'e.g. Seed funding for Phase 2 expansion' :
                form.need_type === 'time'         ? 'e.g. Research assistant for 10 hours' :
                form.need_type === 'partnerships' ? 'e.g. Partner organisation in East Africa' :
                form.need_type === 'data'         ? 'e.g. Soil carbon measurement data from Sub-Saharan Africa' :
                'What specifically do you need?'
              }
            />
            <Hint>One clear sentence. Contributors scan titles first.</Hint>
          </Field>

          {/* Description */}
          <Field>
            <Label>Description *</Label>
            <TextArea
              value={form.description}
              onChange={v => setField('description', v)}
              placeholder="Describe exactly what you need, what the contributor will do, what the context is, and what success looks like. The more specific, the better."
              rows={5}
            />
          </Field>

          {/* Skills / creative detail (conditional) */}
          {(form.need_type === 'skills' || form.need_type === 'creative') && (
            <Field>
              <Label>{form.need_type === 'creative' ? 'Creative specifics' : 'Skills required'}</Label>
              <TextInput
                value={form.skills_required}
                onChange={v => setField('skills_required', v)}
                placeholder={form.need_type === 'creative'
                  ? 'e.g. Documentary, photography, illustration, animation'
                  : 'e.g. Copywriting, Canva, Spanish'}
              />
              <Hint>Comma-separated. These appear as searchable tags on the need.</Hint>
            </Field>
          )}

          {/* Time + deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <Label>Time estimate</Label>
              <TextInput
                value={form.time_estimate}
                onChange={v => setField('time_estimate', v)}
                placeholder="e.g. 3 hours, 2 weeks"
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <TextInput
                value={form.deadline}
                onChange={v => setField('deadline', v)}
                type="date"
              />
            </div>
          </div>

          {/* Compensation */}
          <Field>
            <Label>Compensation</Label>
            <SelectInput
              value={form.compensation_type}
              onChange={v => setField('compensation_type', v)}
              options={COMP_TYPES}
            />
            {form.compensation_type !== 'none' && (
              <div style={{ marginTop: '10px' }}>
                <TextInput
                  value={form.compensation_detail}
                  onChange={v => setField('compensation_detail', v)}
                  placeholder={
                    form.compensation_type === 'financial' ? 'e.g. $50/hr, fixed $300' :
                    form.compensation_type === 'token'     ? 'e.g. 100 NXT tokens' :
                    'Details about the acknowledgement'
                  }
                />
              </div>
            )}
          </Field>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(138,48,48,0.06)', border: '1px solid rgba(138,48,48,0.30)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
              <p style={{ ...body, fontSize: '15px', color: '#8A3030', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...sc, fontSize: '14px', letterSpacing: '0.16em',
                padding: '13px 32px', borderRadius: '40px', cursor: saving ? 'not-allowed' : 'pointer',
                border: '1.5px solid rgba(200,146,42,0.78)',
                background: saving ? 'rgba(200,146,42,0.05)' : '#C8922A',
                color: saving ? gold : '#FFFFFF',
                opacity: saving ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'Posting…' : 'Post this need →'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/nextus/actors/${id}`)}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: '13px 0' }}
            >
              Cancel
            </button>
          </div>

        </form>
      </div>

      <SiteFooter />
    </div>
  )
}
