import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { SiteFooter } from '../components/SiteFooter'
import { supabase } from '../hooks/useSupabase'

const body = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const DOMAINS = [
  { value: '',               label: '— Select domain —' },
  { value: 'human-being',    label: 'Human Being' },
  { value: 'society',        label: 'Society' },
  { value: 'nature',         label: 'Nature' },
  { value: 'technology',     label: 'Technology' },
  { value: 'finance-economy',label: 'Finance & Economy' },
  { value: 'legacy',         label: 'Legacy' },
  { value: 'vision',         label: 'Vision' },
]

const DOMAIN_GOALS = {
  'human-being':    'Every person has what they need to know themselves, develop fully, and bring what they came here to bring.',
  'society':        'Humanity knows how to be human together — and every individual is better for it.',
  'nature':         'Ecosystems are thriving and we are living in harmony with the planet.',
  'technology':     'Our creations support and amplify life.',
  'finance-economy':'Resources flow toward what sustains and generates life — rewarding care, contribution, and long-term thinking.',
  'legacy':         'We are ancestors worth having.',
  'vision':         'Into the unknown. On purpose. Together.',
}

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
]

function Label({ children, required }) {
  return (
    <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
      {children}{required && <span style={{ color: '#8A3030', marginLeft: '4px' }}>*</span>}
    </label>
  )
}

function Hint({ children }) {
  return <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '5px', lineHeight: 1.5 }}>{children}</p>
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }} />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65 }} />
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

const EMPTY = {
  name: '', type: 'organisation', website: '',
  domain_id: '', scale: '',
  location_name: '',
  why: '',           // why they belong on the map
  nominator_name: '', nominator_email: '',
}

export function NextUsNominatePage() {
  const navigate  = useNavigate()
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState(null)

  const [nominatedId, setNominatedId] = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  const selectedGoal = DOMAIN_GOALS[form.domain_id]

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim())         { setError('Name is required.'); return }
    if (!form.domain_id)           { setError('Please select a domain.'); return }
    if (!form.why.trim())          { setError('Please explain why they belong on the map.'); return }
    if (!form.nominator_email.trim()) { setError('Your email is required so we can follow up.'); return }

    setSaving(true)
    setError(null)

    // Write to nextus_actors with vetting_status = 'nominated'
    const { data: inserted, error: saveError } = await supabase.from('nextus_actors').insert({
      name:            form.name.trim(),
      type:            form.type,
      website:         form.website.trim() || null,
      domain_id:       form.domain_id || null,
      scale:           form.scale || null,
      location_name:   form.location_name.trim() || null,
      description:     form.why.trim(),
      data_source:     `Nominated by ${form.nominator_name.trim() || form.nominator_email.trim()}`,
      nominator_name:  form.nominator_name.trim() || null,
      nominator_email: form.nominator_email.trim() || null,
      seeded_by:       'community',
      vetting_status:  'nominated',
    }).select('id').single()

    // Also write to waitlist so nominator gets follow-up
    await supabase.from('nextus_waitlist').insert({
      email:  form.nominator_email.trim(),
      source: 'nominate_form',
      note:   `Nominated: ${form.name.trim()}`,
    }).then(() => {})

    setSaving(false)

    if (saveError) {
      setError('Something went wrong. Please try again.')
      return
    }

    if (inserted?.id) setNominatedId(inserted.id)
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="nextus" />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(42,107,58,0.10)', border: '1.5px solid rgba(42,107,58,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
            <span style={{ color: '#2A6B3A', fontSize: '22px' }}>✓</span>
          </div>
          <h2 style={{ ...body, fontSize: '30px', fontWeight: 300, color: dark, marginBottom: '14px' }}>
            Nomination received.
          </h2>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '12px', maxWidth: '420px', margin: '0 auto 12px' }}>
            The profile is in the review queue. We'll place it on the map once it meets the criteria and be in touch at the email you provided.
          </p>
          {nominatedId && (
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '32px', maxWidth: '420px', margin: '0 auto 32px' }}>
              If this is your organisation, you can claim and manage the profile now.
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
            {nominatedId && (
              <button onClick={() => navigate(`/nextus/actors/${nominatedId}/manage`)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer' }}>
                Manage this profile →
              </button>
            )}
            <button onClick={() => { setForm(EMPTY); setDone(false); setNominatedId(null) }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}>
              Nominate another
            </button>
            <button onClick={() => navigate('/nextus/actors')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px', borderRadius: '40px', border: '1px solid rgba(15,21,35,0.55)', background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}>
              View actors
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="nextus" />

      <style>{`
        @media (max-width: 640px) {
          .nominate-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="nominate-main" style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 40px 120px' }}>

        <button onClick={() => navigate('/nextus/actors')} style={{
          ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)',
          background: 'none', border: 'none', cursor: 'pointer', marginBottom: '32px', padding: 0,
        }}>
          ← Orgs and Individuals
        </button>

        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.20em', color: gold, display: 'block', marginBottom: '12px' }}>
          NextUs · Nominate
        </span>
        <h1 style={{ ...body, fontSize: 'clamp(28px,4vw,42px)', fontWeight: 300, color: dark, lineHeight: 1.1, marginBottom: '14px' }}>
          Know someone doing the work?
        </h1>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(168,114,26,0.75)', lineHeight: 1.6, marginBottom: '14px' }}>
          Nominating your own organisation? That's welcome — fill it in as the submitter.
        </p>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, marginBottom: '16px', maxWidth: '480px' }}>
          The most important actors on this map won't be found by algorithm. If you know an organisation or project doing genuine work toward a Horizon Goal — place them here.
        </p>
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '48px', maxWidth: '480px' }}>
          Nominations are reviewed before going live. The criteria: is the work genuinely aimed at the Horizon Goal for their domain and scale? We're not looking for perfection — we're looking for direction and integrity.
        </p>

        <form onSubmit={submit}>

          {/* Who they are */}
          <div style={{ marginBottom: '24px' }}>
            <Label required>Name</Label>
            <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Organisation or project name" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <Label>Type</Label>
              <SelectInput value={form.type} onChange={v => set('type', v)} options={TYPES} />
            </div>
            <div>
              <Label>Scale</Label>
              <SelectInput value={form.scale} onChange={v => set('scale', v)} options={SCALES} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <Label>Website</Label>
              <TextInput value={form.website} onChange={v => set('website', v)} placeholder="https://..." />
            </div>
            <div>
              <Label>Location</Label>
              <TextInput value={form.location_name} onChange={v => set('location_name', v)} placeholder="e.g. Nairobi, Kenya" />
            </div>
          </div>

          {/* Domain */}
          <div style={{ marginBottom: '24px' }}>
            <Label required>Domain</Label>
            <SelectInput value={form.domain_id} onChange={v => set('domain_id', v)} options={DOMAINS} />
            {selectedGoal && (
              <div style={{ marginTop: '10px', borderLeft: '2px solid rgba(200,146,42,0.22)', paddingLeft: '14px' }}>
                <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold, marginBottom: '4px' }}>Horizon Goal</p>
                <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, margin: 0 }}>{selectedGoal}</p>
              </div>
            )}
          </div>

          {/* Why they belong */}
          <div style={{ marginBottom: '24px' }}>
            <Label required>Why do they belong on this map?</Label>
            <TextArea
              value={form.why}
              onChange={v => set('why', v)}
              placeholder="Describe what they do and why it's genuinely aimed at the Horizon Goal for their domain. Be specific — what have they actually done? What scale are they operating at? What's the evidence of real impact?"
              rows={5}
            />
            <Hint>This becomes their initial profile description if approved. The more specific you are, the faster they go live.</Hint>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.15)', margin: '32px 0' }} />

          {/* Nominator */}
          <p style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.55)', marginBottom: '16px' }}>About you</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <Label>Your name</Label>
              <TextInput value={form.nominator_name} onChange={v => set('nominator_name', v)} placeholder="Optional" />
            </div>
            <div>
              <Label required>Your email</Label>
              <TextInput value={form.nominator_email} onChange={v => set('nominator_email', v)} placeholder="your@email.com" type="email" />
              <Hint>We'll let you know when the nomination is reviewed.</Hint>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.28)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ ...body, fontSize: '15px', color: '#8A3030', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button type="submit" disabled={saving} style={{
              ...sc, fontSize: '14px', letterSpacing: '0.16em',
              padding: '13px 32px', borderRadius: '40px',
              border: 'none',
              background: saving ? 'rgba(200,146,42,0.30)' : '#C8922A',
              color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}>
              {saving ? 'Submitting...' : 'Submit nomination →'}
            </button>
            <button type="button" onClick={() => navigate('/nextus/actors')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>

        </form>
      </div>

      <SiteFooter />
    </div>
  )
}
