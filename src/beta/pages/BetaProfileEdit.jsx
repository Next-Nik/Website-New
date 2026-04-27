import { useCallback, useEffect, useMemo, useState } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { PRINCIPLES_ORDERED } from '../constants/principles'
import { useArtefactVisibility } from '../hooks/useArtefactVisibility'
import VisibilityToggle from '../components/VisibilityToggle'
import AutoSaveTextarea from '../components/AutoSaveTextarea'
import MultiSelectChips from '../components/MultiSelectChips'
import WheelsToggleSection from '../components/WheelsToggleSection'
import PrincipleAlignmentEditor from '../components/PrincipleAlignmentEditor'
import SprintsVisibilitySection from '../components/SprintsVisibilitySection'

// ─────────────────────────────────────────────────────────────────────────────
// /beta/profile/edit
//
// Profile edit surface. Free-text fields auto-save on blur. Multi-input
// sections use explicit save buttons. Visibility toggles are optimistic.
// Default state for any artefact is private.
//
// Wheels share one surface with a Self / Civilisational toggle. Neither
// wheel is published — what is shareable, only when the user chooses, is
// their placement in the ecosystem.
//
// References Module 1.5 for principle primitives.
// ─────────────────────────────────────────────────────────────────────────────

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const display = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

const CIV_DOMAIN_OPTIONS = [
  { value: 'human-being',     label: 'Human Being' },
  { value: 'society',         label: 'Society' },
  { value: 'nature',          label: 'Nature' },
  { value: 'technology',      label: 'Technology' },
  { value: 'finance-economy', label: 'Finance & Economy' },
  { value: 'legacy',          label: 'Legacy' },
  { value: 'vision',          label: 'Vision' },
]

const SELF_DOMAIN_OPTIONS = [
  { value: 'path',       label: 'Path' },
  { value: 'spark',      label: 'Spark' },
  { value: 'body',       label: 'Body' },
  { value: 'finances',   label: 'Finances' },
  { value: 'connection', label: 'Connection' },
  { value: 'inner_game', label: 'Inner Game' },
  { value: 'signal',     label: 'Signal' },
]

const PRINCIPLE_OPTIONS = PRINCIPLES_ORDERED.map((p) => ({
  value: p.slug,
  label: p.label,
}))

// Free-text statement keys. Each gets its own visibility toggle keyed by
// (user_id, 'ia_statement', <column_name>). The artefact_id is the column
// name itself, which keeps the row stable across schema migrations.
const STATEMENTS = [
  {
    key: 'what_i_stand_for',
    label: 'What I stand for',
    helper: 'A short statement of what you carry.',
  },
  {
    key: 'count_on_me_for',
    label: 'Count on me for',
    helper: 'Where you are reliable. What others can come to you for.',
  },
  {
    key: 'dont_count_on_me_for',
    label: "Don't count on me for",
    helper: 'Where you are not the right person. Honest, not apologetic.',
  },
]

export default function BetaProfileEdit() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)
  const [principleAlignment, setPrincipleAlignment] = useState([])

  const userId = user?.id

  const loadProfile = useCallback(async () => {
    if (!userId) return
    setProfileLoading(true)
    setProfileError(null)

    const { data, error } = await supabase
      .from('contributor_profiles_beta')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      setProfileError(error)
      setProfileLoading(false)
      return
    }
    if (!data) {
      // First visit: insert an empty row so the rest of the page reads cleanly.
      const { data: created, error: insertError } = await supabase
        .from('contributor_profiles_beta')
        .insert({ user_id: userId })
        .select()
        .single()
      if (insertError) {
        setProfileError(insertError)
      } else {
        setProfile(created)
      }
    } else {
      setProfile(data)
    }
    setProfileLoading(false)
  }, [userId])

  useEffect(() => {
    if (userId) loadProfile()
  }, [userId, loadProfile])

  // Load existing principle taggings (weight) for the user.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('principle_taggings')
        .select('principle_slug, weight')
        .eq('target_type', 'contributor')
        .eq('target_id', userId)
      if (cancelled) return
      if (error) {
        setPrincipleAlignment([])
        return
      }
      // Optional notes lookup. If the table is missing, notes stay empty.
      let notesByKey = {}
      const { data: notes } = await supabase
        .from('contributor_principle_notes')
        .select('principle_slug, note')
        .eq('user_id', userId)
      if (notes) {
        notesByKey = Object.fromEntries(notes.map((n) => [n.principle_slug, n.note]))
      }
      setPrincipleAlignment(
        (data || []).map((row) => ({
          principle_slug: row.principle_slug,
          weight: row.weight,
          note: notesByKey[row.principle_slug] || '',
        })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  async function saveProfileField(column, value) {
    if (!userId) return
    const { error } = await supabase
      .from('contributor_profiles_beta')
      .update({ [column]: value, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (error) throw error
    setProfile((p) => (p ? { ...p, [column]: value } : p))
  }

  async function saveProfileArray(column, values) {
    return saveProfileField(column, values)
  }

  function openPublicProfile() {
    if (!userId) return
    window.open(`/beta/profile/${userId}`, '_blank', 'noopener,noreferrer')
  }

  if (authLoading || profileLoading) {
    return (
      <PageShell>
        <p
          style={{
            ...body,
            fontSize: '16px',
            color: 'rgba(15, 21, 35, 0.55)',
            margin: 0,
          }}
        >
          Loading your profile.
        </p>
      </PageShell>
    )
  }

  if (!user) {
    return (
      <PageShell>
        <p
          style={{
            ...body,
            fontSize: '16px',
            color: '#0F1523',
            margin: 0,
          }}
        >
          Sign in to edit your profile.
        </p>
      </PageShell>
    )
  }

  if (profileError) {
    return (
      <PageShell>
        <p
          style={{
            ...body,
            fontSize: '16px',
            color: 'rgba(138, 48, 48, 0.85)',
            margin: 0,
          }}
        >
          Could not load your profile. Refresh to try again.
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader onViewPublic={openPublicProfile} />

      {/* Identity and orientation */}
      <Section eyebrow="Identity" title="Display">
        <Row>
          <FieldColumn label="Display name">
            <AutoSaveTextarea
              id="display-name"
              value={profile?.display_name || ''}
              onSave={(next) => saveProfileField('display_name', next)}
              maxLength={120}
              rows={1}
              placeholder=""
            />
          </FieldColumn>
          <FieldColumn label="Headline">
            <AutoSaveTextarea
              id="headline"
              value={profile?.headline || ''}
              onSave={(next) => saveProfileField('headline', next)}
              maxLength={200}
              rows={2}
              placeholder=""
              helperText="One line. What you do, in your own words."
            />
          </FieldColumn>
        </Row>
      </Section>

      {/* Three free-text statements, each with its own visibility toggle. */}
      <Section eyebrow="Statements" title="What you carry">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {STATEMENTS.map((stmt) => (
            <StatementBlock
              key={stmt.key}
              userId={userId}
              column={stmt.key}
              label={stmt.label}
              helper={stmt.helper}
              value={profile?.[stmt.key] || ''}
              onSave={(next) => saveProfileField(stmt.key, next)}
            />
          ))}
        </div>
      </Section>

      {/* Wheels — Self / Civilisational toggle. No visibility — they are nav. */}
      <Section eyebrow="Wheels" title="Your navigation">
        <WheelsToggleSection />
      </Section>

      {/* Public placement — what is shareable, when the user chooses. */}
      <Section
        eyebrow="Public placement"
        title="Where you stand in the ecosystem"
      >
        <PlacementVisibilityRow userId={userId} />

        <div style={{ height: '24px' }} />

        <MultiSelectChips
          label="Civilisational domains you are engaged with"
          helperText="Choose the civilisational domains where your work lives."
          options={CIV_DOMAIN_OPTIONS}
          value={profile?.engaged_civ_domains || []}
          onSave={(next) => saveProfileArray('engaged_civ_domains', next)}
        />

        <div style={{ height: '20px' }} />

        <MultiSelectChips
          label="Self domains you are working with"
          helperText="The domains of your own life you are tending right now."
          options={SELF_DOMAIN_OPTIONS}
          value={profile?.engaged_self_domains || []}
          onSave={(next) => saveProfileArray('engaged_self_domains', next)}
        />

        <div style={{ height: '20px' }} />

        <MultiSelectChips
          label="Platform principles you align with"
          helperText="The cross-domain commitments your work materially engages."
          options={PRINCIPLE_OPTIONS}
          value={profile?.engaged_principles || []}
          onSave={async (next) => {
            await saveProfileArray('engaged_principles', next)
            // Reload taggings so the alignment editor reflects new selections.
            const { data } = await supabase
              .from('principle_taggings')
              .select('principle_slug, weight')
              .eq('target_type', 'contributor')
              .eq('target_id', userId)
            setPrincipleAlignment(
              (data || []).map((row) => ({
                principle_slug: row.principle_slug,
                weight: row.weight,
                note:
                  principleAlignment.find((a) => a.principle_slug === row.principle_slug)?.note ||
                  '',
              })),
            )
          }}
        />
      </Section>

      {/* Principle alignment — per-principle weight + optional note. */}
      <Section
        eyebrow="Principle alignment"
        title="How each principle lands in your work"
      >
        <PrincipleAlignmentEditor
          userId={userId}
          engagedPrinciples={profile?.engaged_principles || []}
          initialAlignment={principleAlignment}
          onSaved={(rows) => {
            setPrincipleAlignment(
              rows.map((r) => ({
                principle_slug: r.slug,
                weight: r.weight,
                note: r.note,
              })),
            )
          }}
        />
      </Section>

      {/* Sprints — active and last six completed. */}
      <Section eyebrow="Sprints" title="What you are working on">
        <SprintsVisibilitySection userId={userId} />
      </Section>

      <FooterMeta />
    </PageShell>
  )
}

// ─── Page chrome ────────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <>
      <Nav />
      <main
        style={{
          background: '#FAFAF7',
          minHeight: '100vh',
          paddingTop: '32px',
          paddingBottom: '64px',
        }}
      >
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            padding: '0 20px',
          }}
        >
          {children}
        </div>
      </main>
    </>
  )
}

function PageHeader({ onViewPublic }) {
  return (
    <header
      style={{
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <span
          style={{
            ...sc,
            display: 'block',
            fontSize: '13px',
            letterSpacing: '0.08em',
            color: '#A8721A',
            fontWeight: 600,
            marginBottom: '6px',
          }}
        >
          Your profile
        </span>
        <h1
          style={{
            ...display,
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 300,
            lineHeight: 1.15,
            color: '#0F1523',
            margin: 0,
          }}
        >
          Edit
        </h1>
      </div>
      <button
        type="button"
        onClick={onViewPublic}
        style={{
          ...sc,
          background: 'transparent',
          border: '1px solid rgba(200, 146, 42, 0.45)',
          borderRadius: '40px',
          padding: '8px 18px',
          fontSize: '14px',
          letterSpacing: '0.04em',
          fontWeight: 600,
          color: '#A8721A',
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = 'rgba(200, 146, 42, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        View public profile
      </button>
    </header>
  )
}

function Section({ eyebrow, title, children }) {
  return (
    <section
      style={{
        marginBottom: '40px',
        paddingBottom: '32px',
        borderBottom: '1px solid rgba(200, 146, 42, 0.20)',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <span
          style={{
            ...sc,
            display: 'block',
            fontSize: '12px',
            letterSpacing: '0.08em',
            color: '#A8721A',
            fontWeight: 600,
            marginBottom: '6px',
          }}
        >
          {eyebrow}
        </span>
        <h2
          style={{
            ...display,
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 300,
            lineHeight: 1.2,
            color: '#0F1523',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Row({ children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
      }}
    >
      {children}
    </div>
  )
}

function FieldColumn({ label, children }) {
  return (
    <div>
      <span
        style={{
          ...sc,
          display: 'block',
          fontSize: '12px',
          letterSpacing: '0.08em',
          color: 'rgba(15, 21, 35, 0.72)',
          fontWeight: 600,
          marginBottom: '6px',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

function StatementBlock({ userId, column, label, helper, value, onSave }) {
  // Each statement gets its own visibility toggle.
  // artefact_type='ia_statement', artefact_id=<column name>.
  const { visibility, setVisibility, loading } = useArtefactVisibility(
    userId,
    'ia_statement',
    column,
  )

  return (
    <article
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200, 146, 42, 0.20)',
        borderRadius: '14px',
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '10px',
        }}
      >
        <span
          style={{
            ...sc,
            fontSize: '13px',
            letterSpacing: '0.06em',
            color: '#A8721A',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <VisibilityToggle
          value={visibility}
          onChange={(next) => setVisibility(next).catch(() => {})}
          disabled={loading}
          compact
        />
      </div>
      <AutoSaveTextarea
        id={`stmt-${column}`}
        value={value}
        onSave={onSave}
        rows={3}
        maxLength={500}
        placeholder=""
        helperText={helper}
      />
    </article>
  )
}

function PlacementVisibilityRow({ userId }) {
  // Single visibility row that gates the entire placement bundle.
  const { visibility, setVisibility, loading } = useArtefactVisibility(
    userId,
    'focus_claim',
    'placement_bundle',
  )
  return (
    <article
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200, 146, 42, 0.20)',
        borderRadius: '14px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <p
        style={{
          ...body,
          margin: 0,
          fontSize: '15px',
          lineHeight: 1.55,
          color: '#0F1523',
          flex: 1,
          minWidth: '200px',
        }}
      >
        Show your placement on your public profile.
      </p>
      <VisibilityToggle
        value={visibility}
        onChange={(next) => setVisibility(next).catch(() => {})}
        disabled={loading}
      />
    </article>
  )
}

function FooterMeta() {
  return (
    <p
      style={{
        ...body,
        fontSize: '13px',
        lineHeight: 1.55,
        color: 'rgba(15, 21, 35, 0.55)',
        margin: '24px 0 0',
        textAlign: 'center',
      }}
    >
      Free-text fields save when you click away. Selections save when you press
      Save. Visibility changes are instant.
    </p>
  )
}
