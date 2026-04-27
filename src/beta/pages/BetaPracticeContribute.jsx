// src/beta/pages/BetaPracticeContribute.jsx
//
// /beta/practice/contribute — the contribution form.
// Open to any signed-in user. No gatekeeping at admission. Curator review
// is for problematic content, not for entry.
//
// Form fields: title, kind, four-dimensional placement (domains,
// subdomains, fields, lenses, problem chains), platform principles,
// description, lineage attribution, evidence summary, contributor role,
// attribution preference. HorizonFloorAdmissionCheck before write.
//
// Conditional requirements per spec:
//   - Lineage attribution required if kind === best_for_individual,
//     recommended otherwise.
//   - Evidence summary required if kind === best_for_all.
//
// On save: writes to practices_beta with horizon_floor_status from the
// admission check. Slug is derived from title; collisions append a numeric
// suffix.

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

import HorizonFloorAdmissionCheck from '../components/HorizonFloorAdmissionCheck'
import PrincipleStrip from '../components/PrincipleStrip'

import {
  PRACTICE_KINDS,
  PRACTICE_KIND_BY_SLUG,
  CONTRIBUTOR_ROLES,
} from '../constants/practices'
import { CIV_DOMAINS, SUBDOMAIN_MAP_BETA, LENSES_PER_DOMAIN } from '../constants/domains'
import { PRINCIPLES_ORDERED } from '../constants/principles'

const sc       = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body     = { fontFamily: "'Lora', Georgia, serif" }
const garamond = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

// ─── Form primitives ───────────────────────────────────────

function Eyebrow({ children, style = {} }) {
  return (
    <span style={{
      ...sc, fontSize: '11px', letterSpacing: '0.18em', color: '#A8721A',
      textTransform: 'uppercase', display: 'block', marginBottom: '8px',
      ...style,
    }}>
      {children}
    </span>
  )
}

function Hint({ children }) {
  return (
    <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.55, margin: '6px 0 12px' }}>
      {children}
    </p>
  )
}

function Required() {
  return <span style={{ color: '#8A3030', marginLeft: '4px' }}>*</span>
}

function FieldGroup({ children, style }) {
  return <div style={{ marginBottom: '28px', ...style }}>{children}</div>
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.65, boxSizing: 'border-box' }} />
  )
}

function ChipToggle({ label, active, onClick, color = '#A8721A' }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{
        ...sc, fontSize: '12px', letterSpacing: '0.04em',
        color: active ? color : 'rgba(15,21,35,0.72)',
        background: active ? 'rgba(200,146,42,0.08)' : '#FFFFFF',
        border: active ? `1px solid ${color}` : '1px solid rgba(200,146,42,0.25)',
        borderRadius: '40px', padding: '5px 12px', cursor: 'pointer',
        fontWeight: active ? 600 : 400, transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(200,146,42,0.04)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '#FFFFFF' }}>
      {label}
    </button>
  )
}

// ─── Slug generation ───────────────────────────────────────

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

// ─── Empty form state ─────────────────────────────────────

const EMPTY = {
  title: '',
  practice_kind: '',
  primary_domain: '',
  secondary_domains: [],
  primary_subdomain: '',
  secondary_subdomains: [],
  primary_field: '',
  secondary_fields: [],
  lenses: [],
  problem_chains: [''],   // start with one input row
  platform_principles: [],
  description: '',
  lineage_attribution: '',
  evidence_summary: '',
  contributor_roles: [],
  attribute_publicly: true,   // default on
}

// ─── Main page ─────────────────────────────────────────────

export default function BetaPracticeContribute() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]     = useState(EMPTY)
  const [error, setError]   = useState(null)
  const [showFloor, setShowFloor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSlug, setSavedSlug] = useState(null)

  // Auth gate: must be signed in. Anyone signed in can contribute.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/beta/practice/contribute')
    }
  }, [user, authLoading, navigate])

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }
  function toggleArray(key, value) {
    const list = form[key] || []
    set(key, list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  // Subdomain options derived from primary domain
  const subdomainOptions = useMemo(() => {
    const entry = SUBDOMAIN_MAP_BETA[form.primary_domain]
    if (!entry) return []
    return entry.subdomains.map(s => ({ value: s.slug, label: s.label }))
  }, [form.primary_domain])

  // Lens options derived from primary domain
  const lensOptions = useMemo(() => {
    return LENSES_PER_DOMAIN[form.primary_domain] || []
  }, [form.primary_domain])

  const kindCfg = PRACTICE_KIND_BY_SLUG[form.practice_kind]

  // Validation
  function validate() {
    if (!form.title.trim())     return 'A title is required.'
    if (!form.practice_kind)    return 'Choose Best for All or Best for the Individual.'
    if (!form.primary_domain)   return 'A primary domain is required.'
    if (!form.description.trim()) return 'A description is required.'

    if (form.practice_kind === 'best_for_individual' && !form.lineage_attribution.trim()) {
      return 'Lineage attribution is required for Best for the Individual practices. If you developed it yourself, say so. If you cannot name a source, say that honestly.'
    }
    if (form.practice_kind === 'best_for_all' && !form.evidence_summary.trim()) {
      return 'Evidence summary is required for Best for All practices.'
    }
    if (form.contributor_roles.length === 0) {
      return 'Tell us your relationship to this practice.'
    }
    return null
  }

  function handleProceed(e) {
    e?.preventDefault()
    const v = validate()
    if (v) { setError(v); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setError(null)
    setShowFloor(true)
  }

  async function handleFloorResolve({ status, reason }) {
    if (status === 'withdrawn') {
      setShowFloor(false)
      return
    }

    setSaving(true)

    // Build placement arrays primary-first
    const domains = [
      form.primary_domain,
      ...form.secondary_domains.filter(d => d !== form.primary_domain),
    ].filter(Boolean)

    const subdomains = [
      form.primary_subdomain,
      ...form.secondary_subdomains.filter(s => s && s !== form.primary_subdomain),
    ].filter(Boolean)

    const fields = [
      form.primary_field,
      ...form.secondary_fields.filter(f => f && f !== form.primary_field),
    ].filter(f => f && f.trim()).map(f => f.trim())

    const problemChains = (form.problem_chains || [])
      .map(p => p.trim())
      .filter(Boolean)

    const contributorRoleLabel = form.contributor_roles
      .map(r => CONTRIBUTOR_ROLES.find(c => c.slug === r)?.label || r)
      .join('; ')

    // Slug — try the natural slug, append timestamp if collision
    let baseSlug = slugify(form.title)
    if (!baseSlug) baseSlug = `practice-${Date.now()}`
    let candidateSlug = baseSlug

    const { data: existing } = await supabase
      .from('practices_beta')
      .select('slug')
      .eq('slug', baseSlug)
      .maybeSingle()

    if (existing) {
      candidateSlug = `${baseSlug}-${Date.now().toString(36)}`
    }

    const payload = {
      slug: candidateSlug,
      title: form.title.trim(),
      practice_kind: form.practice_kind,
      domains,
      subdomains,
      fields,
      lenses: form.lenses,
      problem_chains: problemChains,
      platform_principles: form.platform_principles,
      description: form.description.trim(),
      lineage_attribution: form.lineage_attribution.trim() || null,
      evidence_summary: form.evidence_summary.trim() || null,
      contributor_id: form.attribute_publicly ? user.id : null,
      contributor_role: contributorRoleLabel || null,
      attribution_required: form.attribute_publicly,
      anonymisation_allowed: !form.attribute_publicly,
      vetting_status: 'self_submitted',
      horizon_floor_status: status,
    }

    // The contributor_id column references auth.users with ON DELETE SET NULL.
    // For anonymous submissions we still record the contributor so a curator
    // can address content concerns, but do not write contributor_id on the
    // practice itself; instead, we store it in a private metadata field.
    // For the beta build we keep the simple approach: anonymous practices
    // store contributor_id null and rely on the audit log if needed.

    const { data: inserted, error: saveError } = await supabase
      .from('practices_beta')
      .insert(payload)
      .select('slug')
      .single()

    setSaving(false)
    setShowFloor(false)

    if (saveError) {
      console.error('Save practice error:', saveError)
      setError('Could not save the practice. Try again in a moment.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSavedSlug(inserted.slug)
  }

  // ── Success state ──

  if (savedSlug) {
    return (
      <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 24px 60px', textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(42,107,58,0.10)', border: '1.5px solid rgba(42,107,58,0.40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px',
          }}>
            <span style={{ color: '#2A6B3A', fontSize: '22px' }}>&#10003;</span>
          </div>

          <h2 style={{ ...garamond, fontSize: '32px', fontWeight: 300, color: '#0F1523', marginBottom: '14px', lineHeight: 1.2 }}>
            The practice is held here.
          </h2>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 28px' }}>
            Other practitioners can now find it, attest to it, and report outcomes.
            As attestations accrue, the practice moves from self-submitted to community-attested.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/beta/practice/${savedSlug}`}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#FFFFFF', background: '#0F1523', padding: '11px 24px', borderRadius: '40px', textDecoration: 'none', fontWeight: 600 }}>
              View the practice
            </Link>
            <button onClick={() => { setForm(EMPTY); setSavedSlug(null); window.scrollTo({ top: 0 }) }}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.40)', borderRadius: '40px', padding: '11px 24px', cursor: 'pointer' }}>
              Contribute another
            </button>
            <Link to="/beta/practices"
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none', padding: '11px 14px' }}>
              Back to practices
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── HorizonFloor modal overlay ──

  if (showFloor) {
    return (
      <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'clamp(72px, 10vw, 96px) 24px 60px' }}>
          <div style={{ marginBottom: '24px' }}>
            <button onClick={() => setShowFloor(false)}
              style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
              ← Back to the form
            </button>
          </div>
          <h1 style={{ ...garamond, fontSize: 'clamp(26px, 3.4vw, 32px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.2, margin: '0 0 14px' }}>
            One last check before saving.
          </h1>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, marginBottom: '32px' }}>
            Read the Horizon Floor for this domain and confirm the practice is compatible. The Horizon Floor is the platform's commitment to what cannot live here.
          </p>

          <HorizonFloorAdmissionCheck
            domainSlug={form.primary_domain}
            contextLabel="this practice"
            onResolve={handleFloorResolve}
            onCancel={() => setShowFloor(false)}
          />

          {saving && (
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', textAlign: 'center', marginTop: '20px' }}>
              Saving...
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── The form ──

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'clamp(72px, 10vw, 96px) 24px 60px' }}>

        {/* Back link */}
        <div style={{ marginBottom: '20px' }}>
          <Link to="/beta/practices"
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>
            ← All practices
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <Eyebrow>Contribute a practice</Eyebrow>
          <h1 style={{ ...garamond, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 300, color: '#0F1523', lineHeight: 1.15, margin: '0 0 14px' }}>
            Bring what you carry.
          </h1>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>
            Anyone signed in can contribute. Attribution is preserved. Lineage is honoured.
            What goes in here becomes part of what other practitioners can find, attest to, and report on.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: 'rgba(138,48,48,0.05)', border: '1px solid rgba(138,48,48,0.25)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
            <p style={{ ...body, fontSize: '14px', color: '#8A3030', margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleProceed}>

          {/* Title */}
          <FieldGroup>
            <Eyebrow>Title<Required /></Eyebrow>
            <TextInput value={form.title} onChange={v => set('title', v)} placeholder="e.g. Restorative justice circles" />
          </FieldGroup>

          {/* Practice kind */}
          <FieldGroup>
            <Eyebrow>Practice kind<Required /></Eyebrow>
            <Hint>Best for All practices answer "what works across populations." Best for the Individual practices hold lineages side by side; the reader discerns what is theirs.</Hint>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {PRACTICE_KINDS.map(k => {
                const isOn = form.practice_kind === k.slug
                return (
                  <button key={k.slug} type="button" onClick={() => set('practice_kind', k.slug)}
                    aria-pressed={isOn}
                    style={{
                      ...sc, fontSize: '13px', letterSpacing: '0.06em',
                      padding: '10px 18px', borderRadius: '40px', cursor: 'pointer',
                      color: isOn ? k.color : 'rgba(15,21,35,0.72)',
                      background: isOn ? `${k.color}10` : '#FFFFFF',
                      border: isOn ? `1px solid ${k.color}` : '1px solid rgba(200,146,42,0.25)',
                      fontWeight: isOn ? 600 : 400,
                    }}>
                    {k.label}
                  </button>
                )
              })}
            </div>
            {kindCfg && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.20)', borderRadius: '8px' }}>
                <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                  {kindCfg.contributePrompt}
                </p>
              </div>
            )}
          </FieldGroup>

          {/* Primary domain */}
          <FieldGroup>
            <Eyebrow>Primary domain<Required /></Eyebrow>
            <Hint>Where does the headline impact land? Best for All practices typically primary-place in Society. Best for the Individual practices typically primary-place in Human Being. Multi-residency is welcome via secondaries.</Hint>
            <select value={form.primary_domain} onChange={e => {
                set('primary_domain', e.target.value)
                set('primary_subdomain', '')
                set('secondary_subdomains', [])
                set('lenses', [])
              }}
              style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
              <option value="">-- Select primary domain --</option>
              {CIV_DOMAINS.map(d => (
                <option key={d.slug} value={d.slug}>{d.label}</option>
              ))}
            </select>
          </FieldGroup>

          {/* Secondary domains */}
          {form.primary_domain && (
            <FieldGroup>
              <Eyebrow>Secondary domains</Eyebrow>
              <Hint>Where else does this practice honestly live? Do not pad. Multi-residency is real where multi-residency is real.</Hint>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CIV_DOMAINS.filter(d => d.slug !== form.primary_domain).map(d => (
                  <ChipToggle key={d.slug} label={d.label}
                    active={form.secondary_domains.includes(d.slug)}
                    onClick={() => toggleArray('secondary_domains', d.slug)}
                    color={d.color} />
                ))}
              </div>
            </FieldGroup>
          )}

          {/* Subdomain (primary) */}
          {form.primary_domain && subdomainOptions.length > 0 && (
            <FieldGroup>
              <Eyebrow>Primary subdomain</Eyebrow>
              <Hint>Optional. Which substrate within the domain does this practice touch most centrally?</Hint>
              <select value={form.primary_subdomain} onChange={e => set('primary_subdomain', e.target.value)}
                style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
                <option value="">-- None --</option>
                {subdomainOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </FieldGroup>
          )}

          {/* Fields (primary + secondary) — single primary input + chip toggles for additional */}
          {form.primary_subdomain && (
            <FieldGroup>
              <Eyebrow>Field</Eyebrow>
              <Hint>Optional, free text. The narrowest level of placement, if you know it.</Hint>
              <TextInput value={form.primary_field} onChange={v => set('primary_field', v)}
                placeholder="e.g. Restorative justice circles in schools" />
            </FieldGroup>
          )}

          {/* Lenses */}
          {lensOptions.length > 0 && (
            <FieldGroup>
              <Eyebrow>Lenses</Eyebrow>
              <Hint>Optional. What kind of relationship does this practice have with its substrate?</Hint>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {lensOptions.map(l => (
                  <ChipToggle key={l} label={l}
                    active={form.lenses.includes(l)}
                    onClick={() => toggleArray('lenses', l)} />
                ))}
              </div>
            </FieldGroup>
          )}

          {/* Problem chains */}
          <FieldGroup>
            <Eyebrow>Problem chains addressed</Eyebrow>
            <Hint>Optional. Each chain reads "civilisational problem &gt; sector &gt; specific." Add as many as honestly apply.</Hint>
            {form.problem_chains.map((chain, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input type="text" value={chain}
                  onChange={e => {
                    const next = [...form.problem_chains]
                    next[i] = e.target.value
                    set('problem_chains', next)
                  }}
                  placeholder="e.g. cultural erasure &gt; artisan tradition loss &gt; indigenous textile transmission"
                  style={{ ...body, fontSize: '14px', color: '#0F1523', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(200,146,42,0.25)', background: '#FFFFFF', outline: 'none', flex: 1, boxSizing: 'border-box' }} />
                {form.problem_chains.length > 1 && (
                  <button type="button"
                    onClick={() => {
                      const next = form.problem_chains.filter((_, idx) => idx !== i)
                      set('problem_chains', next)
                    }}
                    style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)', background: 'transparent', border: '1px solid rgba(15,21,35,0.20)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button"
              onClick={() => set('problem_chains', [...form.problem_chains, ''])}
              style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: '#A8721A', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: '4px' }}>
              + Add another chain
            </button>
          </FieldGroup>

          {/* Platform principles */}
          <FieldGroup>
            <Eyebrow>Platform principles engaged</Eyebrow>
            <Hint>Optional. Which of the four cross-domain principles does this practice materially engage?</Hint>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRINCIPLES_ORDERED.map(p => (
                <ChipToggle key={p.slug} label={p.label}
                  active={form.platform_principles.includes(p.slug)}
                  onClick={() => toggleArray('platform_principles', p.slug)} />
              ))}
            </div>
            {form.platform_principles.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <PrincipleStrip slugs={form.platform_principles} size="sm" />
              </div>
            )}
          </FieldGroup>

          {/* Description */}
          <FieldGroup>
            <Eyebrow>Description<Required /></Eyebrow>
            <Hint>What is the practice? What does it do? Plain language. No marketing.</Hint>
            <TextArea value={form.description} onChange={v => set('description', v)} rows={6}
              placeholder="" />
          </FieldGroup>

          {/* Lineage attribution */}
          <FieldGroup>
            <Eyebrow>
              Lineage attribution
              {form.practice_kind === 'best_for_individual' && <Required />}
            </Eyebrow>
            <Hint>
              Who taught you this? Whose lineage does this carry? If this practice has indigenous, traditional, or community origins, name them. If you developed it yourself, say so. If you cannot name a source, say that honestly.
            </Hint>
            <TextArea value={form.lineage_attribution} onChange={v => set('lineage_attribution', v)} rows={5}
              placeholder="" />
          </FieldGroup>

          {/* Evidence summary */}
          <FieldGroup>
            <Eyebrow>
              Evidence summary
              {form.practice_kind === 'best_for_all' && <Required />}
            </Eyebrow>
            <Hint>
              {form.practice_kind === 'best_for_all'
                ? 'What evidence supports this practice at population level? Citations welcome but not required.'
                : 'Optional for Best for the Individual. If there is research or comparative evidence relevant to this practice, summarise it here.'}
            </Hint>
            <TextArea value={form.evidence_summary} onChange={v => set('evidence_summary', v)} rows={4}
              placeholder="" />
          </FieldGroup>

          {/* Contributor role */}
          <FieldGroup>
            <Eyebrow>Your relationship to this practice<Required /></Eyebrow>
            <Hint>Tick all that apply.</Hint>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {CONTRIBUTOR_ROLES.map(r => (
                <label key={r.slug} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                  <input type="checkbox"
                    checked={form.contributor_roles.includes(r.slug)}
                    onChange={() => toggleArray('contributor_roles', r.slug)}
                    style={{ width: '16px', height: '16px', accentColor: '#A8721A', cursor: 'pointer' }} />
                  <span style={{ ...body, fontSize: '15px', color: '#0F1523' }}>{r.label}</span>
                </label>
              ))}
            </div>
          </FieldGroup>

          {/* Attribution preference */}
          <FieldGroup>
            <Eyebrow>Attribution</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={form.attribute_publicly}
                  onChange={e => set('attribute_publicly', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#A8721A', cursor: 'pointer', marginTop: '3px' }} />
                <span style={{ ...body, fontSize: '14px', color: '#0F1523', lineHeight: 1.5 }}>
                  Display my name as the contributor. (Default on.)
                </span>
              </label>
              {!form.attribute_publicly && (
                <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)', lineHeight: 1.55, margin: '0 0 0 26px' }}>
                  You will be submitted anonymously. Anonymous submissions still require lineage attribution where claimed: if you said this practice carries a tradition, that attribution stays in the public record even though your name does not.
                </p>
              )}
            </div>
          </FieldGroup>

          {/* Submit */}
          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(200,146,42,0.18)', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button type="submit"
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.16em',
                padding: '13px 30px', borderRadius: '40px', border: 'none',
                background: '#0F1523', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600,
              }}>
              Continue to Horizon Floor
            </button>
            <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', margin: 0 }}>
              The Horizon Floor check is the last step before saving.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
