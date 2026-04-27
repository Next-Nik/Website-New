// src/beta/pages/BetaNominate.jsx
//
// Module 9: Public nomination form at /beta/nominate.
// Source: src/pages/NextUsNominate.jsx (untouched).
//
// What changed from the original:
//   1. Writes four-dimensional placement to nextus_actors rather than
//      single-value domain_id. Primary domain is domains[0].
//   2. Secondary domains multi-select added below primary domain select.
//   3. Platform principles multi-select added (optional).
//   4. Inline domain constants replaced with imports from src/beta/constants/.
//   5. Success state links to /beta and /beta/nominate.
//   6. No em dashes in personal-tone copy.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import PrincipleStrip from '../components/PrincipleStrip'
import { PRINCIPLES_ORDERED } from '../constants/principles'
import { CIV_DOMAINS } from '../components/NextUsWheel'

const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

// ── Horizon goals (shown when a primary domain is selected) ───
const DOMAIN_HORIZON_GOALS = {
  'human-being':    'Every human held in dignity, met with care, supported in becoming most fully themselves.',
  'society':        'A structure that gives everyone space to function and the possibility to thrive.',
  'nature':         'The living planet is thriving, and humanity lives as a regenerative participant in it.',
  'technology':     'Technology in service of life, human and planetary, designed to restore as it operates.',
  'finance-economy':'An economy in which everyone has enough to act on what matters.',
  'legacy':         'A civilisation that knows what it carries, tends what it transmits, repairs what it broke.',
  'vision':         'Creating forward, as far as we can see, in service of the brightest future for all.',
}

const SCALES = [
  { value: '',              label: '-- Select scale --' },
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

// ── Shared form primitives ────────────────────────────────────

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

function Field({ children, style }) {
  return <div style={{ marginBottom: '24px', ...style }}>{children}</div>
}

// ── Empty form state ──────────────────────────────────────────

const EMPTY = {
  name:              '',
  type:              'organisation',
  website:           '',
  primary_domain:    '',        // drives domains[0]
  secondary_domains: [],        // remaining domain slugs
  scale:             '',
  location_name:     '',
  platform_principles: [],      // optional principle slugs
  why:               '',
  nominator_name:    '',
  nominator_email:   '',
}

// ── Main page ─────────────────────────────────────────────────

export function BetaNominatePage() {
  const navigate = useNavigate()
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState(null)
  const [nominatedId, setNominatedId] = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function toggleSecondaryDomain(slug) {
    const curr = form.secondary_domains
    set('secondary_domains', curr.includes(slug) ? curr.filter(s => s !== slug) : [...curr, slug])
  }

  function togglePrinciple(slug) {
    const curr = form.platform_principles
    set('platform_principles', curr.includes(slug) ? curr.filter(s => s !== slug) : [...curr, slug])
  }

  const selectedGoal = DOMAIN_HORIZON_GOALS[form.primary_domain]

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim())           { setError('Name is required.'); return }
    if (!form.primary_domain)        { setError('Please select a primary domain.'); return }
    if (!form.why.trim())            { setError('Please explain why they belong on the map.'); return }
    if (!form.nominator_email.trim()) { setError('Your email is required so we can follow up.'); return }

    setSaving(true)
    setError(null)

    // Build four-dimensional domains array: primary first, then secondaries
    const domains = [
      form.primary_domain,
      ...form.secondary_domains.filter(s => s !== form.primary_domain),
    ].filter(Boolean)

    const { data: inserted, error: saveError } = await supabase.from('nextus_actors').insert({
      name:               form.name.trim(),
      type:               form.type,
      website:            form.website.trim() || null,
      // Legacy single-value backcompat
      domain_id:          form.primary_domain || null,
      // Four-dimensional placement
      domains:            domains,
      subdomains:         [],
      fields:             [],
      lenses:             [],
      problem_chains:     [],
      platform_principles: form.platform_principles,
      scale:              form.scale || null,
      location_name:      form.location_name.trim() || null,
      description:        form.why.trim(),
      data_source:        `Nominated by ${form.nominator_name.trim() || form.nominator_email.trim()}`,
      nominator_name:     form.nominator_name.trim() || null,
      nominator_email:    form.nominator_email.trim() || null,
      seeded_by:          'community',
      vetting_status:     'nominated',
      horizon_floor_status: 'compatible', // nominator self-attests by submitting
    }).select('id').single()

    // Write to waitlist so nominator gets follow-up
    await supabase.from('nextus_waitlist').insert({
      email:  form.nominator_email.trim(),
      source: 'beta_nominate_form',
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

  // ── Success state ─────────────────────────────────────────

  if (done) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(42,107,58,0.10)', border: '1.5px solid rgba(42,107,58,0.40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px',
          }}>
            <span style={{ color: '#2A6B3A', fontSize: '22px' }}>&#10003;</span>
          </div>

          <h2 style={{ ...serif, fontSize: '30px', fontWeight: 300, color: dark, marginBottom: '14px' }}>
            Nomination received.
          </h2>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.60)', lineHeight: 1.75, maxWidth: '420px', margin: '0 auto 12px' }}>
            The profile is in the review queue. We will place it on the map once it meets the criteria and be in touch at the email you provided.
          </p>
          {nominatedId && (
            <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, maxWidth: '420px', margin: '0 auto 32px' }}>
              If this is your organisation, you can claim and manage the profile now.
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
            {nominatedId && (
              <button onClick={() => navigate(`/beta/org/${nominatedId}/manage`)}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px', borderRadius: '40px', border: 'none', background: '#C8922A', color: '#FFFFFF', cursor: 'pointer' }}>
                Manage this profile
              </button>
            )}
            <button onClick={() => { setForm(EMPTY); setDone(false); setNominatedId(null) }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px', borderRadius: '40px', border: '1.5px solid rgba(200,146,42,0.78)', background: 'rgba(200,146,42,0.05)', color: gold, cursor: 'pointer' }}>
              Nominate another
            </button>
            <button onClick={() => navigate('/beta')}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', padding: '11px 24px', borderRadius: '40px', border: '1px solid rgba(15,21,35,0.55)', background: 'transparent', color: 'rgba(15,21,35,0.55)', cursor: 'pointer' }}>
              Back to NextUs
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────

  const domainOptions = [
    { value: '', label: '-- Select primary domain --' },
    ...CIV_DOMAINS.map(d => ({ value: d.slug, label: d.label })),
  ]

  const scaleOptions = SCALES

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav />

      <style>{`
        @media (max-width: 640px) {
          .nominate-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="nominate-main" style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 40px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.2em', color: gold, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
            Nominate
          </span>
          <h1 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 300, color: dark, lineHeight: 1.12, margin: '0 0 10px' }}>
            Who belongs on this map?
          </h1>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.75, margin: 0 }}>
            Know an organisation, project, or practitioner doing serious work toward a Horizon Goal?
            Tell us. If they belong, they go on the map.
          </p>
        </div>

        <form onSubmit={submit}>

          {/* Actor basics */}
          <Field>
            <Label required>Name of the organisation or project</Label>
            <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Name" />
          </Field>

          <Field>
            <Label>Type</Label>
            <SelectInput value={form.type} onChange={v => set('type', v)} options={TYPES} />
          </Field>

          <Field>
            <Label>Website</Label>
            <TextInput value={form.website} onChange={v => set('website', v)} placeholder="https://..." type="url" />
          </Field>

          {/* Four-dim: Primary domain */}
          <Field>
            <Label required>Primary domain</Label>
            <Hint>Which civilisational domain does the headline impact land in? The domain where the work lives primarily.</Hint>
            <SelectInput
              value={form.primary_domain}
              onChange={v => {
                set('primary_domain', v)
                // Remove from secondary if it was there
                set('secondary_domains', form.secondary_domains.filter(s => s !== v))
              }}
              options={domainOptions}
            />

            {selectedGoal && (
              <div style={{
                marginTop: '10px',
                padding: '12px 14px',
                background: 'rgba(200,146,42,0.04)',
                border: '1px solid rgba(200,146,42,0.20)',
                borderRadius: '8px',
              }}>
                <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.45)', marginBottom: '4px' }}>
                  HORIZON GOAL
                </div>
                <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
                  {selectedGoal}
                </p>
              </div>
            )}
          </Field>

          {/* Four-dim: Secondary domains */}
          {form.primary_domain && (
            <Field>
              <Label>Secondary domains</Label>
              <Hint>Where else does this work honestly live? Do not pad. Secondaries should be real co-residencies.</Hint>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {CIV_DOMAINS.filter(d => d.slug !== form.primary_domain).map(d => {
                  const isOn = form.secondary_domains.includes(d.slug)
                  return (
                    <button
                      key={d.slug}
                      type="button"
                      onClick={() => toggleSecondaryDomain(d.slug)}
                      style={{
                        ...sc, fontSize: '12px', letterSpacing: '0.04em',
                        padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
                        color: isOn ? gold : 'rgba(15,21,35,0.72)',
                        background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                        border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)',
                        fontWeight: isOn ? 600 : 400,
                      }}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field>
              <Label>Scale</Label>
              <SelectInput value={form.scale} onChange={v => set('scale', v)} options={scaleOptions} />
            </Field>
            <Field>
              <Label>Location</Label>
              <TextInput value={form.location_name} onChange={v => set('location_name', v)} placeholder="City, Country" />
            </Field>
          </div>

          {/* Four-dim: Platform principles (optional) */}
          <Field>
            <Label>Platform principles engaged</Label>
            <Hint>Which of the four cross-domain principles does this actor materially engage? Optional. Click a badge to see the definition.</Hint>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {PRINCIPLES_ORDERED.map(p => {
                const isOn = form.platform_principles.includes(p.slug)
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => togglePrinciple(p.slug)}
                    style={{
                      ...sc, fontSize: '12px', letterSpacing: '0.04em',
                      padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
                      color: isOn ? gold : 'rgba(15,21,35,0.72)',
                      background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                      border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)',
                      fontWeight: isOn ? 600 : 400,
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            {form.platform_principles.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <PrincipleStrip slugs={form.platform_principles} size="sm" />
              </div>
            )}
          </Field>

          {/* Why */}
          <Field>
            <Label required>Why they belong on the map</Label>
            <Hint>
              What do they do? What harm do they reduce, regenerate, replace, or unlock? How are they oriented toward the Horizon Goal?
              Be as concrete as you can.
            </Hint>
            <TextArea value={form.why} onChange={v => set('why', v)}
              placeholder="They are doing..." rows={5} />
          </Field>

          {/* Nominator */}
          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(200,146,42,0.18)', marginTop: '8px' }}>
            <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '20px' }}>
              Your details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field>
                <Label>Your name</Label>
                <TextInput value={form.nominator_name} onChange={v => set('nominator_name', v)} placeholder="Name" />
              </Field>
              <Field>
                <Label required>Your email</Label>
                <TextInput value={form.nominator_email} onChange={v => set('nominator_email', v)} placeholder="email@example.com" type="email" />
                <Hint>We use this to follow up and give you updates on the nomination.</Hint>
              </Field>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.25)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={saving}
            style={{
              ...sc, fontSize: '14px', letterSpacing: '0.16em',
              padding: '14px 32px', borderRadius: '40px', border: 'none',
              background: saving ? 'rgba(200,146,42,0.35)' : '#C8922A',
              color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer',
              display: 'block', width: '100%', marginTop: '8px',
            }}>
            {saving ? 'Submitting...' : 'Nominate them'}
          </button>

          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)', lineHeight: 1.55, textAlign: 'center', marginTop: '12px' }}>
            Submissions enter a review queue. The team reviews and places approved nominations on the map.
          </p>
        </form>
      </div>

      <SiteFooter />
    </div>
  )
}
