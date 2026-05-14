// src/app/pages/Add.jsx
//
// The unified "Add to the ecosystem" form.
// Replaces /nominate. All actor types. Goes live immediately.
//
// Provenance logic:
//   "I represent this org"       → seeded_by: 'self',      profile_owner: user.id
//   "I'm adding to ecosystem"    → seeded_by: 'community', profile_owner: null
//
// AI autofill: paste a URL at the top → /api/org-extract reads the site
// and pre-populates name, description, domain, scale, location, website.
// User reviews and edits before submitting.
//
// Duplicate detection: checks name (ilike) and website (exact) before
// surfacing any matches inline. User confirms distinct or aborts.
//
// Prefill from AddOverlay: location.state.prefill may carry actor_type
// and domain from the surface the overlay was opened from.

import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import PrincipleStrip from '../components/PrincipleStrip'
import { PRINCIPLES_ORDERED } from '../constants/principles'
import { CIV_DOMAINS } from '../components/NextUsWheel'

// ── Design tokens ─────────────────────────────────────────────
const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

// ── Constants ─────────────────────────────────────────────────

const ACTOR_TYPES = [
  { value: 'organisation', label: 'Organisation' },
  { value: 'project',      label: 'Project' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'programme',    label: 'Programme' },
  { value: 'place',        label: 'Place' },
  { value: 'group',        label: 'Group' },
  { value: 'resource',     label: 'Resource' },
]

const SCALES = [
  { value: '',              label: '-- Select scale --' },
  { value: 'local',         label: 'Local' },
  { value: 'municipal',     label: 'Municipal' },
  { value: 'regional',      label: 'Regional' },
  { value: 'national',      label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'global',        label: 'Global' },
]

const DOMAIN_HORIZON_GOALS = {
  'human-being':     'Every human held in dignity, met with care, supported in becoming most fully themselves.',
  'society':         'A structure that gives everyone space to function and the possibility to thrive.',
  'nature':          'The living planet is thriving, and humanity lives as a regenerative participant in it.',
  'technology':      'Technology in service of life, human and planetary, designed to restore as it operates.',
  'finance-economy': 'An economy in which everyone has enough to act on what matters.',
  'legacy':          'A civilisation that knows what it carries, tends what it transmits, repairs what it broke.',
  'vision':          'Creating forward, as far as we can see, in service of the brightest future for all.',
}

const EMPTY = {
  name:                '',
  type:                'organisation',
  website:             '',
  primary_domain:      '',
  secondary_domains:   [],
  scale:               '',
  location_name:       '',
  platform_principles: [],
  description:         '',
}

// ── Shared primitives ──────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold,
      display: 'block', marginBottom: '6px' }}>
      {children}
      {required && <span style={{ color: '#8A3030', marginLeft: '4px' }}>*</span>}
    </label>
  )
}

function Hint({ children }) {
  return (
    <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
      marginTop: '5px', lineHeight: 1.5, marginBottom: 0 }}>
      {children}
    </p>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px',
        borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
        background: disabled ? 'rgba(200,146,42,0.04)' : '#FFFFFF',
        outline: 'none', width: '100%', boxSizing: 'border-box',
        opacity: disabled ? 0.7 : 1 }} />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px',
        borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
        background: '#FFFFFF', outline: 'none', width: '100%',
        resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }} />
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...body, fontSize: '15px', color: dark, padding: '11px 16px',
        borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
        background: '#FFFFFF', outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Field({ children, style }) {
  return <div style={{ marginBottom: '24px', ...style }}>{children}</div>
}

// ── Duplicate card ─────────────────────────────────────────────

function DuplicateCard({ actor, onDismiss }) {
  return (
    <div style={{
      background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.30)',
      borderRadius: '10px', padding: '14px 16px',
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', gap: '12px', flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ ...body, fontSize: '15px', color: dark, fontWeight: 400 }}>
          {actor.name}
        </div>
        {actor.location_name && (
          <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
            {actor.location_name}
          </div>
        )}
        {actor.website && (
          <div style={{ ...sc, fontSize: '12px', color: gold, letterSpacing: '0.08em' }}>
            {actor.website}
          </div>
        )}
      </div>
      <Link to={`/org/${actor.slug || actor.id}`} target="_blank"
        style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold,
          textDecoration: 'none', whiteSpace: 'nowrap',
          padding: '6px 14px', borderRadius: '40px',
          border: '1px solid rgba(200,146,42,0.40)',
          background: 'rgba(200,146,42,0.06)' }}>
        View entry
      </Link>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export function AddPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  // ── Form state ───────────────────────────────────────────────
  const [form, setForm]               = useState(EMPTY)
  const [represents, setRepresents]   = useState(false) // the toggle
  const [saving, setSaving]           = useState(false)
  const [done, setDone]               = useState(false)
  const [addedActor, setAddedActor]   = useState(null)
  const [error, setError]             = useState(null)

  // ── AI autofill state ────────────────────────────────────────
  const [aiUrl, setAiUrl]             = useState('')
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiError, setAiError]         = useState(null)
  const [aiUsed, setAiUsed]           = useState(false)

  // ── Duplicate detection state ────────────────────────────────
  const [duplicates, setDuplicates]   = useState([])
  const [dupChecked, setDupChecked]   = useState(false)
  const [dupDismissed, setDupDismissed] = useState(false)
  const dupTimer = useRef(null)

  // ── Prefill from AddOverlay ──────────────────────────────────
  useEffect(() => {
    const prefill = location.state?.prefill
    if (!prefill) return
    setForm(f => ({
      ...f,
      type:           prefill.actor_type  ?? f.type,
      primary_domain: prefill.domain      ?? f.primary_domain,
      name:           prefill.name        ?? f.name,
      website:        prefill.website     ?? f.website,
      location_name:  prefill.location_name ?? f.location_name,
      scale:          prefill.scale       ?? f.scale,
    }))
    navigate(location.pathname + location.search, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth gate ────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/add' } })
  }, [user, authLoading, navigate])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  // ── Duplicate check ──────────────────────────────────────────
  // Fires 600ms after name or website changes. Checks both.
  useEffect(() => {
    clearTimeout(dupTimer.current)
    setDupChecked(false)
    setDuplicates([])
    const name    = form.name.trim()
    const website = form.website.trim()
    if (!name && !website) return
    dupTimer.current = setTimeout(async () => {
      try {
        const queries = []
        if (name) {
          queries.push(
            supabase.from('nextus_actors')
              .select('id, name, slug, website, location_name, status')
              .ilike('name', `%${name}%`)
              .eq('status', 'live')
              .limit(3)
          )
        }
        if (website) {
          queries.push(
            supabase.from('nextus_actors')
              .select('id, name, slug, website, location_name, status')
              .eq('website', website)
              .eq('status', 'live')
              .limit(3)
          )
        }
        const results = await Promise.all(queries)
        const all = results.flatMap(r => r.data || [])
        // Deduplicate by id
        const seen = new Set()
        const unique = all.filter(a => {
          if (seen.has(a.id)) return false
          seen.add(a.id); return true
        })
        setDuplicates(unique)
        setDupChecked(true)
        setDupDismissed(false)
      } catch {}
    }, 600)
    return () => clearTimeout(dupTimer.current)
  }, [form.name, form.website])

  // ── AI autofill ──────────────────────────────────────────────
  async function runAiAutofill() {
    const url = aiUrl.trim()
    if (!url) return
    setAiLoading(true); setAiError(null)
    try {
      const res = await fetch('/api/org-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: url }),
      })
      const data = await res.json()
      if (data.error) { setAiError('Could not read the site. Try pasting a description instead.'); return }
      const results = data.results || []
      // Pick the most relevant result: prefer 'planet' track, else first
      const pick = results.find(r => r.track === 'planet') || results[0]
      if (!pick) { setAiError('No actor found at that URL.'); return }

      // Map AI result onto form
      setForm(f => ({
        ...f,
        name:           pick.name           || f.name,
        type:           pick.type           || f.type,
        website:        pick.website        || url,
        primary_domain: pick.domain_id      || f.primary_domain,
        scale:          pick.scale          || f.scale,
        location_name:  pick.location_name  || f.location_name,
        description:    pick.description    || f.description,
      }))
      setAiUsed(true)
    } catch {
      setAiError('Something went wrong. You can still fill the form manually.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Domain helpers ───────────────────────────────────────────
  const domainOptions = [
    { value: '', label: '-- Select primary domain --' },
    ...CIV_DOMAINS.map(d => ({ value: d.slug, label: d.label })),
  ]

  function toggleSecondary(slug) {
    const curr = form.secondary_domains
    set('secondary_domains',
      curr.includes(slug) ? curr.filter(s => s !== slug) : [...curr, slug]
    )
  }

  function togglePrinciple(slug) {
    const curr = form.platform_principles
    set('platform_principles',
      curr.includes(slug) ? curr.filter(s => s !== slug) : [...curr, slug]
    )
  }

  const selectedGoal = DOMAIN_HORIZON_GOALS[form.primary_domain]

  // ── Submit ───────────────────────────────────────────────────
  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim())      { setError('Name is required.'); return }
    if (!form.primary_domain)   { setError('Please select a primary domain.'); return }

    setSaving(true); setError(null)

    const domains = [
      form.primary_domain,
      ...form.secondary_domains.filter(s => s !== form.primary_domain),
    ].filter(Boolean)

    const payload = {
      name:                form.name.trim(),
      type:                form.type,
      website:             form.website.trim() || null,
      domain_id:           form.primary_domain,
      domains,
      scale:               form.scale || null,
      location_name:       form.location_name.trim() || null,
      platform_principles: form.platform_principles,
      description:         form.description.trim() || null,
      seeded_by:           represents ? 'self' : 'community',
      profile_owner:       represents ? user.id : null,
      represented_by_adder: represents,
      vetting_status:      'approved',
      status:              'live',
      owner_id:            represents ? user.id : null,
    }

    const { data: inserted, error: saveError } = await supabase
      .from('nextus_actors')
      .insert(payload)
      .select('id, slug, name')
      .single()

    setSaving(false)

    if (saveError) {
      setError('Something went wrong. Please try again.')
      console.error('Add actor error:', saveError)
      return
    }

    setAddedActor(inserted)
    setDone(true)
  }

  // ── Done state ───────────────────────────────────────────────
  if (done && addedActor) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 24px 80px', textAlign: 'center' }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
            textTransform: 'uppercase', marginBottom: '18px' }}>
            Added to the Atlas
          </div>
          <h1 style={{ ...serif, fontSize: 'clamp(28px,4vw,40px)', fontWeight: 400,
            color: dark, lineHeight: 1.1, marginBottom: '16px' }}>
            {addedActor.name} is on the map.
          </h1>
          {represents ? (
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)',
              lineHeight: 1.7, marginBottom: '32px' }}>
              Your entry is live. You can manage it from your profile.
            </p>
          ) : (
            <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)',
              lineHeight: 1.7, marginBottom: '32px' }}>
              The entry is live. If someone from this organisation wants to claim
              and manage it, send them this link.
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/org/${addedActor.slug || addedActor.id}`}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
                padding: '12px 24px', borderRadius: '40px',
                background: 'rgba(200,146,42,0.06)',
                border: '1.5px solid rgba(200,146,42,0.55)',
                color: gold, textDecoration: 'none' }}>
              View entry
            </Link>
            <button onClick={() => { setDone(false); setForm(EMPTY); setAiUrl(''); setAiUsed(false) }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em',
                padding: '12px 24px', borderRadius: '40px',
                background: 'transparent',
                border: '1px solid rgba(200,146,42,0.30)',
                color: 'rgba(15,21,35,0.72)', cursor: 'pointer' }}>
              Add another
            </button>
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
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '96px 24px 120px' }}>

        {/* Header */}
        <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold,
          textTransform: 'uppercase', marginBottom: '12px' }}>
          Atlas
        </div>
        <h1 style={{ ...serif, fontSize: 'clamp(30px,5vw,46px)', fontWeight: 400,
          color: dark, lineHeight: 1.08, marginBottom: '10px' }}>
          Add to the ecosystem
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.7, marginBottom: '48px', maxWidth: '500px' }}>
          Know an organisation, practitioner, place, or project doing serious work
          toward a Horizon Goal? Add them. They go live immediately.
        </p>

        {/* ── Representation toggle ────────────────────────── */}
        <div style={{
          background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.30)',
          borderRadius: '12px', padding: '20px 22px', marginBottom: '36px',
        }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em',
            color: 'rgba(15,21,35,0.45)', textTransform: 'uppercase', marginBottom: '14px' }}>
            Your relationship to this entry
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                val: false,
                label: 'I\'m adding this to the ecosystem',
                hint: 'I don\'t represent this organisation. NextUs holds the entry in trust until they claim it.',
              },
              {
                val: true,
                label: 'I represent this organisation',
                hint: 'I\'m adding my own entry. I\'ll be the owner and can manage it directly.',
              },
            ].map(opt => (
              <button key={String(opt.val)} type="button"
                onClick={() => setRepresents(opt.val)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                  textAlign: 'left', border: represents === opt.val
                    ? '1.5px solid rgba(200,146,42,0.60)'
                    : '1.5px solid rgba(200,146,42,0.20)',
                  background: represents === opt.val
                    ? 'rgba(200,146,42,0.05)' : '#FAFAF7',
                }}>
                {/* Radio dot */}
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                  border: represents === opt.val
                    ? '5px solid #A8721A'
                    : '2px solid rgba(200,146,42,0.40)',
                  background: '#FFFFFF',
                  transition: 'all 0.15s ease',
                }} />
                <div>
                  <div style={{ ...body, fontSize: '15px', color: dark, lineHeight: 1.35 }}>
                    {opt.label}
                  </div>
                  <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                    lineHeight: 1.5, marginTop: '3px' }}>
                    {opt.hint}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── AI autofill ──────────────────────────────────── */}
        <div style={{
          background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.25)',
          borderRadius: '12px', padding: '20px 22px', marginBottom: '36px',
        }}>
          <div style={{ ...sc, fontSize: '11px', letterSpacing: '0.18em',
            color: 'rgba(15,21,35,0.45)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Autofill from website
          </div>
          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
            lineHeight: 1.55, marginBottom: '14px' }}>
            Paste a URL and we'll read the site and fill in the form. You review and edit before it goes live.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="url"
              value={aiUrl}
              onChange={e => setAiUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAiAutofill()}
              placeholder="https://..."
              style={{ ...body, fontSize: '15px', color: dark, padding: '10px 14px',
                borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.30)',
                background: parch, outline: 'none', flex: 1 }}
            />
            <button onClick={runAiAutofill} disabled={aiLoading || !aiUrl.trim()}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                padding: '10px 20px', borderRadius: '40px', cursor: aiLoading ? 'wait' : 'pointer',
                border: '1.5px solid rgba(200,146,42,0.55)',
                background: 'rgba(200,146,42,0.06)', color: gold,
                whiteSpace: 'nowrap', opacity: !aiUrl.trim() ? 0.5 : 1 }}>
              {aiLoading ? 'Reading...' : 'Read site'}
            </button>
          </div>
          {aiError && (
            <p style={{ ...body, fontSize: '13px', color: '#8A3030', marginTop: '8px' }}>{aiError}</p>
          )}
          {aiUsed && (
            <p style={{ ...body, fontSize: '13px', color: gold, marginTop: '8px' }}>
              Form filled from site. Review everything before submitting.
            </p>
          )}
        </div>

        {/* ── Duplicate warning ─────────────────────────────── */}
        {dupChecked && duplicates.length > 0 && !dupDismissed && (
          <div style={{
            background: 'rgba(138,96,32,0.04)', border: '1px solid rgba(200,146,42,0.35)',
            borderRadius: '12px', padding: '18px 20px', marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: gold }}>
                Already on the map
              </div>
              <button onClick={() => setDupDismissed(true)}
                style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 12px' }}>
                These are different, continue
              </button>
            </div>
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
              lineHeight: 1.55, marginBottom: '12px' }}>
              We found {duplicates.length === 1 ? 'an entry that looks similar' : 'entries that look similar'}.
              Is one of these already the organisation you're adding?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {duplicates.map(a => <DuplicateCard key={a.id} actor={a} />)}
            </div>
          </div>
        )}

        {/* ── Main form ─────────────────────────────────────── */}
        <form onSubmit={submit}>

          {/* Name + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '24px' }}>
            <div>
              <Label required>Name</Label>
              <TextInput value={form.name} onChange={v => set('name', v)} placeholder="Name" />
            </div>
            <div style={{ minWidth: '160px' }}>
              <Label>Type</Label>
              <SelectInput value={form.type} onChange={v => set('type', v)} options={ACTOR_TYPES} />
            </div>
          </div>

          {/* Website */}
          <Field>
            <Label>Website</Label>
            <TextInput value={form.website} onChange={v => set('website', v)}
              placeholder="https://..." type="url" />
          </Field>

          {/* Primary domain */}
          <Field>
            <Label required>Primary domain</Label>
            <Hint>Which civilisational domain does the headline impact land in?</Hint>
            <div style={{ marginTop: '8px' }}>
              <SelectInput
                value={form.primary_domain}
                onChange={v => {
                  set('primary_domain', v)
                  set('secondary_domains', form.secondary_domains.filter(s => s !== v))
                }}
                options={domainOptions}
              />
            </div>
            {selectedGoal && (
              <div style={{ marginTop: '10px', padding: '12px 14px',
                background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)',
                borderRadius: '8px' }}>
                <div style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em',
                  color: 'rgba(15,21,35,0.45)', marginBottom: '4px' }}>
                  HORIZON GOAL
                </div>
                <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)',
                  lineHeight: 1.65, margin: 0 }}>
                  {selectedGoal}
                </p>
              </div>
            )}
          </Field>

          {/* Secondary domains */}
          {form.primary_domain && (
            <Field>
              <Label>Secondary domains</Label>
              <Hint>Where else does this work honestly live? Do not pad.</Hint>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {CIV_DOMAINS.filter(d => d.slug !== form.primary_domain).map(d => {
                  const isOn = form.secondary_domains.includes(d.slug)
                  return (
                    <button key={d.slug} type="button" onClick={() => toggleSecondary(d.slug)}
                      style={{ ...sc, fontSize: '12px', letterSpacing: '0.04em',
                        padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
                        color: isOn ? gold : 'rgba(15,21,35,0.72)',
                        background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                        border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)',
                      }}>
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {/* Scale + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field>
              <Label>Scale</Label>
              <SelectInput value={form.scale} onChange={v => set('scale', v)} options={SCALES} />
            </Field>
            <Field>
              <Label>Location</Label>
              <TextInput value={form.location_name} onChange={v => set('location_name', v)}
                placeholder="City, Country" />
            </Field>
          </div>

          {/* Description */}
          <Field>
            <Label>Description</Label>
            <Hint>
              What do they actually do? One sentence on what they are, one sentence on the
              specific thing that makes them worth adding.
            </Hint>
            <div style={{ marginTop: '8px' }}>
              <TextArea value={form.description} onChange={v => set('description', v)}
                placeholder="They build... They specifically..." rows={4} />
            </div>
          </Field>

          {/* Platform principles */}
          <Field>
            <Label>Platform principles engaged</Label>
            <Hint>Optional. Which cross-domain principles does this actor materially engage?</Hint>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {PRINCIPLES_ORDERED.map(p => {
                const isOn = form.platform_principles.includes(p.slug)
                return (
                  <button key={p.slug} type="button" onClick={() => togglePrinciple(p.slug)}
                    style={{ ...sc, fontSize: '12px', letterSpacing: '0.04em',
                      padding: '5px 12px', borderRadius: '40px', cursor: 'pointer',
                      color: isOn ? gold : 'rgba(15,21,35,0.72)',
                      background: isOn ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
                      border: isOn ? '1px solid rgba(200,146,42,0.55)' : '1px solid rgba(200,146,42,0.25)',
                    }}>
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

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(138,48,48,0.05)',
              border: '1px solid rgba(138,48,48,0.25)', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={saving}
            style={{ ...sc, fontSize: '14px', letterSpacing: '0.16em',
              padding: '14px 32px', borderRadius: '40px', border: 'none',
              background: saving ? 'rgba(200,146,42,0.35)' : '#C8922A',
              color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer',
              display: 'block', width: '100%', marginTop: '8px' }}>
            {saving ? 'Adding...' : 'Add to the Atlas'}
          </button>

          <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)',
            lineHeight: 1.55, textAlign: 'center', marginTop: '12px' }}>
            {represents
              ? 'Your entry goes live immediately. You can edit it any time.'
              : 'This entry goes live immediately. The organisation can claim and manage it later.'
            }
          </p>
        </form>
      </div>
      <SiteFooter />
    </div>
  )
}
