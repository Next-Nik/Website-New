// src/beta/pages/BetaProfileEdit.jsx
// Module 3 profile edit surface at /beta/profile/edit.
// Module 10 addition: BilateralInbox panel as the final section.
//
// Sections:
//   Profile fields (auto-save on blur)
//   Visibility toggles (artefact_visibility, default private)
//   Domain engagement
//   Principle alignment
//   Bilateral cards (Module 10)

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SiteFooter } from '../../components/SiteFooter'
import { supabase } from '../../hooks/useSupabase'
import { useAuth } from '../../hooks/useAuth'
import { BilateralInbox } from '../components/BilateralInbox'

const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const CIV_DOMAINS = [
  { value: 'human-being',    label: 'Human Being'      },
  { value: 'society',        label: 'Society'           },
  { value: 'nature',         label: 'Nature'            },
  { value: 'technology',     label: 'Technology'        },
  { value: 'finance-economy',label: 'Finance and Economy' },
  { value: 'legacy',         label: 'Legacy'            },
  { value: 'vision',         label: 'Vision'            },
]

const SELF_DOMAINS = [
  { value: 'path',        label: 'Path'       },
  { value: 'spark',       label: 'Spark'      },
  { value: 'body',        label: 'Body'       },
  { value: 'finances',    label: 'Finances'   },
  { value: 'connection',  label: 'Connection' },
  { value: 'inner-game',  label: 'Inner Game' },
  { value: 'signal',      label: 'Signal'     },
]

const PLATFORM_PRINCIPLES = [
  { value: 'indigenous-relational',     label: 'Indigenous and Relational'  },
  { value: 'substrate-health',          label: 'Substrate Health'           },
  { value: 'not-knowing-stance',        label: 'The Not-Knowing Stance'     },
  { value: 'legacy-temporal-dimension', label: 'Legacy as Temporal Dimension' },
]

const WEIGHT_OPTIONS = [
  { value: 'primary',   label: 'Primary'   },
  { value: 'secondary', label: 'Secondary' },
  { value: 'tertiary',  label: 'Tertiary'  },
]

// ── Shared primitives ────────────────────────────────────────

function Label({ children }) {
  return (
    <label style={{ ...sc, fontSize: '12px', letterSpacing: '0.16em', color: gold, display: 'block', marginBottom: '6px' }}>
      {children}
    </label>
  )
}

function Hint({ children }) {
  return (
    <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '5px', lineHeight: 1.55 }}>
      {children}
    </p>
  )
}

function AutoSaveField({ label, value, onSave, multiline, placeholder, hint, rows = 3 }) {
  const [local, setLocal] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const prevRef = useRef(value || '')

  useEffect(() => { setLocal(value || '') }, [value])

  async function handleBlur() {
    if (local === prevRef.current) return
    setSaving(true)
    await onSave(local)
    prevRef.current = local
    setSaving(false)
  }

  const sharedStyle = {
    ...body, fontSize: '15px', color: dark,
    padding: '11px 16px', borderRadius: '8px',
    border: '1.5px solid rgba(200,146,42,0.30)',
    background: '#FFFFFF', outline: 'none', width: '100%',
    lineHeight: 1.65,
  }

  return (
    <div style={{ marginBottom: '22px' }}>
      <Label>{label}{saving && <span style={{ marginLeft: '8px', color: 'rgba(15,21,35,0.40)', fontStyle: 'italic' }}>Saving...</span>}</Label>
      {multiline ? (
        <textarea
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          style={{ ...sharedStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={sharedStyle}
        />
      )}
      {hint && <Hint>{hint}</Hint>}
    </div>
  )
}

// ── Visibility toggle ────────────────────────────────────────
// Default is private. Writes/deletes a row in artefact_visibility.

function VisibilityToggle({ userId, artefactType, artefactId, label }) {
  const [isPublic, setIsPublic] = useState(false)
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('artefact_visibility')
      .select('visibility')
      .eq('user_id', userId)
      .eq('artefact_type', artefactType)
      .eq('artefact_id', artefactId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setIsPublic(data?.visibility === 'public')
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [userId, artefactType, artefactId])

  async function toggle() {
    const next = !isPublic
    // Optimistic
    setIsPublic(next)

    if (next) {
      await supabase.from('artefact_visibility').upsert({
        user_id:      userId,
        artefact_type: artefactType,
        artefact_id:  artefactId,
        visibility:   'public',
      }, { onConflict: 'user_id,artefact_type,artefact_id' })
    } else {
      await supabase
        .from('artefact_visibility')
        .delete()
        .eq('user_id', userId)
        .eq('artefact_type', artefactType)
        .eq('artefact_id', artefactId)
    }
  }

  if (!loaded) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
      <button
        onClick={toggle}
        style={{
          width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
          background: isPublic ? gold : 'rgba(15,21,35,0.20)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: '3px', left: isPublic ? '18px' : '3px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#FFFFFF', transition: 'left 0.15s',
        }} />
      </button>
      <span style={{ ...body, fontSize: '14px', color: isPublic ? dark : 'rgba(15,21,35,0.50)' }}>
        {label}
      </span>
      <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.14em', color: isPublic ? gold : 'rgba(15,21,35,0.40)', marginLeft: 'auto' }}>
        {isPublic ? 'Public' : 'Private'}
      </span>
    </div>
  )
}

// ── Domain engagement chips ──────────────────────────────────

function DomainChips({ domains, selected, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {domains.map(d => {
        const on = selected.includes(d.value)
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => onToggle(d.value)}
            style={{
              ...sc, fontSize: '11px', letterSpacing: '0.12em',
              padding: '6px 14px', borderRadius: '40px', cursor: 'pointer',
              border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.25)',
              background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
              color: on ? gold : 'rgba(15,21,35,0.55)',
              transition: 'all 0.15s',
            }}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Section wrapper ──────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: '56px' }}>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: 'rgba(15,21,35,0.40)', textTransform: 'uppercase', marginBottom: '6px' }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.6 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(200,146,42,0.16)', borderRadius: '14px', padding: '28px 32px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Sprint visibility section ────────────────────────────────

function SprintVisibility({ userId }) {
  const [sprints, setSprints] = useState([])

  useEffect(() => {
    supabase
      .from('target_sprint_sessions')
      .select('id, domains, domain_data, status, created_at, completed_at')
      .eq('user_id', userId)
      .in('status', ['active', 'complete'])
      .order('created_at', { ascending: false })
      .limit(9)  // 3 active + 6 completed
      .then(({ data }) => setSprints(data || []))
  }, [userId])

  const active    = sprints.filter(s => s.status === 'active')
  const completed = sprints.filter(s => s.status === 'complete').slice(0, 6)

  function sprintLabel(s) {
    const domains = s.domains || []
    const dd = s.domain_data || {}
    const firstGoal = domains.map(d => dd[d]?.targetGoal).filter(Boolean)[0]
    const domainNames = domains.map(d => d).join(', ')
    return firstGoal ? firstGoal.slice(0, 60) + (firstGoal.length > 60 ? '...' : '') : domainNames || 'Sprint'
  }

  if (sprints.length === 0) return (
    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.45)' }}>No sprints yet.</p>
  )

  return (
    <>
      {active.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.50)', marginBottom: '8px' }}>Active sprints</p>
          {active.map(s => (
            <VisibilityToggle key={s.id} userId={userId} artefactType="sprint" artefactId={s.id} label={sprintLabel(s)} />
          ))}
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.50)', marginBottom: '8px' }}>Completed sprints (last 6)</p>
          {completed.map(s => (
            <VisibilityToggle key={s.id} userId={userId} artefactType="sprint" artefactId={s.id} label={sprintLabel(s)} />
          ))}
        </div>
      )}
    </>
  )
}

// ── IA statement visibility ──────────────────────────────────

function IAStatementVisibility({ userId }) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    supabase
      .from('horizon_profile')
      .select('domain, ia_statement')
      .eq('user_id', userId)
      .not('ia_statement', 'is', null)
      .then(({ data }) => setRows(data || []))
  }, [userId])

  const SELF_DOMAIN_LABEL = {
    path: 'Path', spark: 'Spark', body: 'Body', finances: 'Finances',
    connection: 'Connection', 'inner-game': 'Inner Game', signal: 'Signal',
  }

  if (rows.length === 0) return (
    <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.45)' }}>No "I am" statements written yet.</p>
  )

  return (
    <>
      {rows.map(r => (
        <VisibilityToggle
          key={r.domain}
          userId={userId}
          artefactType="ia_statement"
          artefactId={r.domain}
          label={`${SELF_DOMAIN_LABEL[r.domain] || r.domain}: ${r.ia_statement.slice(0, 55)}${r.ia_statement.length > 55 ? '...' : ''}`}
        />
      ))}
    </>
  )
}

// ── Principle alignment editor ───────────────────────────────

function PrincipleAlignmentEditor({ userId, engagedPrinciples, onEngagedChange }) {
  const [taggings, setTaggings] = useState([])

  useEffect(() => {
    supabase
      .from('principle_taggings')
      .select('principle_slug, weight, note')
      .eq('target_type', 'contributor')
      .eq('target_id', userId)
      .then(({ data }) => setTaggings(data || []))
  }, [userId])

  async function upsertTagging(slug, updates) {
    await supabase.from('principle_taggings').upsert({
      target_type:    'contributor',
      target_id:      userId,
      principle_slug: slug,
      ...updates,
    }, { onConflict: 'target_type,target_id,principle_slug' })
    // Refresh
    const { data } = await supabase
      .from('principle_taggings')
      .select('principle_slug, weight, note')
      .eq('target_type', 'contributor')
      .eq('target_id', userId)
    setTaggings(data || [])
  }

  async function removeTagging(slug) {
    await supabase.from('principle_taggings')
      .delete()
      .eq('target_type', 'contributor')
      .eq('target_id', userId)
      .eq('principle_slug', slug)
    setTaggings(t => t.filter(x => x.principle_slug !== slug))
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <DomainChips
          domains={PLATFORM_PRINCIPLES}
          selected={engagedPrinciples}
          onToggle={async (slug) => {
            const next = engagedPrinciples.includes(slug)
              ? engagedPrinciples.filter(p => p !== slug)
              : [...engagedPrinciples, slug]
            await onEngagedChange(next)
            if (!next.includes(slug)) await removeTagging(slug)
          }}
        />
      </div>

      {engagedPrinciples.map(slug => {
        const principle = PLATFORM_PRINCIPLES.find(p => p.value === slug)
        if (!principle) return null
        const tagging = taggings.find(t => t.principle_slug === slug)

        return (
          <div key={slug} style={{
            padding: '14px 18px', borderRadius: '10px',
            background: 'rgba(200,146,42,0.04)',
            border: '1px solid rgba(200,146,42,0.18)',
            marginBottom: '10px',
          }}>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: gold, marginBottom: '10px' }}>
              {principle.label}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px', alignItems: 'flex-start' }}>
              <div>
                <Label>Weight</Label>
                <select
                  value={tagging?.weight || 'primary'}
                  onChange={async e => {
                    await upsertTagging(slug, { weight: e.target.value, note: tagging?.note || null })
                  }}
                  style={{ ...body, fontSize: '14px', color: dark, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}
                >
                  {WEIGHT_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
              <div>
                <Label>How (optional)</Label>
                <input
                  defaultValue={tagging?.note || ''}
                  onBlur={async e => {
                    await upsertTagging(slug, { weight: tagging?.weight || 'primary', note: e.target.value.trim() || null })
                  }}
                  placeholder="One sentence on how this principle shows up in your work."
                  style={{ ...body, fontSize: '14px', color: dark, padding: '9px 14px', borderRadius: '6px', border: '1px solid rgba(200,146,42,0.30)', background: '#FFFFFF', outline: 'none', width: '100%' }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function BetaProfileEditPage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile]         = useState(null)
  const [loading, setLoading]         = useState(true)

  // Local state for multi-select fields — saved to DB on change
  const [engagedCivDomains, setEngagedCivDomains]   = useState([])
  const [engagedSelfDomains, setEngagedSelfDomains]  = useState([])
  const [engagedPrinciples, setEngagedPrinciples]    = useState([])
  const [savingDomains, setSavingDomains]             = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    supabase
      .from('contributor_profiles_beta')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data || {})
        setEngagedCivDomains(data?.engaged_civ_domains || [])
        setEngagedSelfDomains(data?.engaged_self_domains || [])
        setEngagedPrinciples(data?.engaged_principles || [])
        setLoading(false)
      })
  }, [user, authLoading])

  async function saveField(field, value) {
    if (!user) return
    await supabase
      .from('contributor_profiles_beta')
      .upsert({ user_id: user.id, [field]: value }, { onConflict: 'user_id' })
  }

  async function saveDomains(civDomains, selfDomains, principles) {
    if (!user) return
    setSavingDomains(true)
    await supabase.from('contributor_profiles_beta').upsert({
      user_id:             user.id,
      engaged_civ_domains: civDomains,
      engaged_self_domains: selfDomains,
      engaged_principles:  principles,
    }, { onConflict: 'user_id' })
    setSavingDomains(false)
  }

  async function toggleCivDomain(slug) {
    const next = engagedCivDomains.includes(slug)
      ? engagedCivDomains.filter(d => d !== slug)
      : [...engagedCivDomains, slug]
    setEngagedCivDomains(next)
    await saveDomains(next, engagedSelfDomains, engagedPrinciples)
  }

  async function toggleSelfDomain(slug) {
    const next = engagedSelfDomains.includes(slug)
      ? engagedSelfDomains.filter(d => d !== slug)
      : [...engagedSelfDomains, slug]
    setEngagedSelfDomains(next)
    await saveDomains(engagedCivDomains, next, engagedPrinciples)
  }

  async function updatePrinciples(next) {
    setEngagedPrinciples(next)
    await saveDomains(engagedCivDomains, engagedSelfDomains, next)
  }

  if (authLoading || loading) {
    return (
      <div style={{ background: parch, minHeight: '100vh' }}>
        <Nav activePath="" />
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
          <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.50)' }}>Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />

      <style>{`
        @media (max-width: 640px) {
          .beta-edit-main { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="beta-edit-main" style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px',
      }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '52px' }}>
          <div>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.22em', color: gold, marginBottom: '10px' }}>
              Profile
            </p>
            <h1 style={{ ...body, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 300, color: dark, lineHeight: 1.1, margin: 0 }}>
              {profile?.display_name || 'Your profile'}
            </h1>
          </div>
          <Link
            to={`/beta/profile/${user.id}`}
            target="_blank"
            style={{
              ...sc, fontSize: '12px', letterSpacing: '0.14em',
              padding: '10px 20px', borderRadius: '40px',
              border: '1px solid rgba(15,21,35,0.25)',
              color: 'rgba(15,21,35,0.55)', textDecoration: 'none',
              flexShrink: 0, marginTop: '4px',
            }}
          >
            View public profile
          </Link>
        </div>

        {/* ── Profile fields ────────────────────────────── */}
        <Section
          title="About"
          subtitle="Auto-saves when you leave a field."
        >
          <AutoSaveField
            label="Display name"
            value={profile?.display_name}
            onSave={v => saveField('display_name', v)}
            placeholder="Your name as it appears on your profile"
          />
          <AutoSaveField
            label="Headline"
            value={profile?.headline}
            onSave={v => saveField('headline', v)}
            placeholder="One line. What you are building or doing."
          />
          <AutoSaveField
            label="What I stand for"
            value={profile?.what_i_stand_for}
            onSave={v => saveField('what_i_stand_for', v)}
            multiline
            rows={4}
            placeholder="Free text. What principles or commitments guide your work?"
            hint="This appears in the 'What I stand for' section of your public profile."
          />
          <AutoSaveField
            label="What I am offering"
            value={profile?.count_on_me_for}
            onSave={v => saveField('count_on_me_for', v)}
            multiline
            rows={3}
            placeholder="What can people count on you for?"
          />
          <AutoSaveField
            label="What I am not for"
            value={profile?.dont_count_on_me_for}
            onSave={v => saveField('dont_count_on_me_for', v)}
            multiline
            rows={3}
            placeholder="What should people not expect of you?"
          />
        </Section>

        {/* ── Visibility ───────────────────────────────── */}
        <Section
          title="Visibility"
          subtitle='Everything is private by default. Toggle on to make an artefact visible on your public profile.'
        >
          <div style={{ marginBottom: '20px' }}>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.50)', marginBottom: '10px' }}>
              Self wheel
            </p>
            {SELF_DOMAINS.map(d => (
              <VisibilityToggle key={d.value} userId={user.id} artefactType="wheel_self" artefactId={d.value} label={d.label} />
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.50)', marginBottom: '10px' }}>
              Civilisational wheel
            </p>
            {CIV_DOMAINS.map(d => (
              <VisibilityToggle key={d.value} userId={user.id} artefactType="wheel_civ" artefactId={d.value} label={d.label} />
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.50)', marginBottom: '10px' }}>
              "I am" statements
            </p>
            <IAStatementVisibility userId={user.id} />
          </div>

          <div>
            <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(15,21,35,0.50)', marginBottom: '10px' }}>
              Sprints
            </p>
            <SprintVisibility userId={user.id} />
          </div>
        </Section>

        {/* ── Domain engagement ─────────────────────────── */}
        <Section
          title="Domain engagement"
          subtitle="Which civilisational and personal domains does your work genuinely touch?"
        >
          <div style={{ marginBottom: '24px' }}>
            <Label>
              Civilisational domains
              {savingDomains && <span style={{ marginLeft: '8px', color: 'rgba(15,21,35,0.40)', fontStyle: 'normal', fontSize: '11px' }}>Saving...</span>}
            </Label>
            <div style={{ marginTop: '10px' }}>
              <DomainChips domains={CIV_DOMAINS} selected={engagedCivDomains} onToggle={toggleCivDomain} />
            </div>
            <Hint>These appear on your civilisational wheel when marked public.</Hint>
          </div>
          <div>
            <Label>
              Self domains
              {savingDomains && <span style={{ marginLeft: '8px', color: 'rgba(15,21,35,0.40)', fontStyle: 'normal', fontSize: '11px' }}>Saving...</span>}
            </Label>
            <div style={{ marginTop: '10px' }}>
              <DomainChips domains={SELF_DOMAINS} selected={engagedSelfDomains} onToggle={toggleSelfDomain} />
            </div>
            <Hint>These appear on your self wheel when marked public.</Hint>
          </div>
        </Section>

        {/* ── Principle alignment ───────────────────────── */}
        <Section
          title="Principle alignment"
          subtitle="Which of the four platform principles does your work engage? Choose freely. Set weight and add a note for each."
        >
          <PrincipleAlignmentEditor
            userId={user.id}
            engagedPrinciples={engagedPrinciples}
            onEngagedChange={updatePrinciples}
          />
        </Section>

        {/* ── Bilateral cards (Module 10) ───────────────── */}
        <Section
          title="Bilateral cards"
        >
          <BilateralInbox
            currentUserId={user.id}
            currentDisplayName={profile?.display_name}
          />
        </Section>

      </div>

      <SiteFooter />
    </div>
  )
}
