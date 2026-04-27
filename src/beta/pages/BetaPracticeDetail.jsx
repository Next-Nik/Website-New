// src/beta/pages/BetaPracticeDetail.jsx
//
// /beta/practice/:slug — single practice detail.
//
// Renders title (Cormorant Garamond, large), kind badge, placement
// breadcrumb, lens chips, PrincipleStrip, description as flowing prose,
// LineageBlock with dignity, evidence summary if Best for All,
// attestation list, outcome reports list, and CTAs for both attest and
// report-an-outcome.
//
// Voice: Best for All entries read evidence-led; Best for the Individual
// entries hold the lineage-respectful me-lens. The page chrome adapts but
// the contributor's prose is rendered exactly as submitted.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

import PrincipleStrip from '../components/PrincipleStrip'
import LineageBlock from '../components/practices/LineageBlock'
import AttestationForm from '../components/practices/AttestationForm'
import OutcomeReportForm from '../components/practices/OutcomeReportForm'

import { CIV_DOMAIN_BY_SLUG, SUBDOMAIN_MAP_BETA } from '../constants/domains'
import {
  PRACTICE_KIND_BY_SLUG,
  VETTING_BY_SLUG,
} from '../constants/practices'

const sc       = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body     = { fontFamily: "'Lora', Georgia, serif" }
const garamond = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

// ─── Helpers ───────────────────────────────────────────────

function findSubdomainLabel(domainSlug, subdomainSlug) {
  const entry = SUBDOMAIN_MAP_BETA[domainSlug]
  if (!entry) return subdomainSlug
  const found = entry.subdomains.find(s => s.slug === subdomainSlug)
  return found?.label || subdomainSlug
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Header chrome ─────────────────────────────────────────

function KindBadge({ kindSlug }) {
  const k = PRACTICE_KIND_BY_SLUG[kindSlug]
  if (!k) return null
  return (
    <span style={{
      ...sc,
      fontSize: '11px',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: k.color,
      background: `${k.color}10`,
      border: `1px solid ${k.color}40`,
      borderRadius: '40px',
      padding: '4px 14px',
      display: 'inline-block',
    }}>
      {k.label}
    </span>
  )
}

function VettingBadge({ vettingSlug, attestationCount }) {
  const v = VETTING_BY_SLUG[vettingSlug]
  if (!v) return null
  return (
    <span title={vettingSlug === 'community_attested' ? `${attestationCount} attestations` : undefined}
      style={{
        ...sc, fontSize: '10px', letterSpacing: '0.14em',
        color: v.color, padding: '2px 10px',
        border: `1px solid ${v.color}30`, borderRadius: '40px',
        background: `${v.color}08`,
      }}>
      {v.label}
    </span>
  )
}

function PlacementBreadcrumb({ practice }) {
  const domains    = practice.domains    || []
  const subdomains = practice.subdomains || []
  const fields     = practice.fields     || []

  if (!domains.length) return null

  const primaryDomainSlug = domains[0]
  const primaryDomain = CIV_DOMAIN_BY_SLUG[primaryDomainSlug]
  const primarySubdomainSlug = subdomains[0]
  const primaryFieldSlug = fields[0]

  const secondaryDomains = domains.slice(1)

  return (
    <div style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.65)', lineHeight: 1.6 }}>
      {primaryDomain ? primaryDomain.label : primaryDomainSlug}
      {primarySubdomainSlug && (
        <>
          <span style={{ color: 'rgba(15,21,35,0.30)', margin: '0 8px' }}>›</span>
          {findSubdomainLabel(primaryDomainSlug, primarySubdomainSlug)}
        </>
      )}
      {primaryFieldSlug && (
        <>
          <span style={{ color: 'rgba(15,21,35,0.30)', margin: '0 8px' }}>›</span>
          {primaryFieldSlug}
        </>
      )}
      {secondaryDomains.length > 0 && (
        <span style={{ color: 'rgba(15,21,35,0.45)' }}>
          {' '}({secondaryDomains.map(d => CIV_DOMAIN_BY_SLUG[d]?.label || d).join(', ')})
        </span>
      )}
    </div>
  )
}

function LensChips({ lenses = [] }) {
  if (!lenses.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {lenses.map((l, i) => (
        <span key={l} style={{
          ...sc, fontSize: '11px', letterSpacing: '0.06em',
          color: i === 0 ? '#A8721A' : 'rgba(15,21,35,0.65)',
          background: i === 0 ? 'rgba(200,146,42,0.06)' : '#FFFFFF',
          border: `1px solid ${i === 0 ? 'rgba(200,146,42,0.40)' : 'rgba(200,146,42,0.18)'}`,
          borderRadius: '40px',
          padding: '3px 10px',
        }}>
          {l}{i === 0 ? ' (primary)' : ''}
        </span>
      ))}
    </div>
  )
}

// ─── Attestation list item ─────────────────────────────────

function AttestationItem({ attestation, attesterName }) {
  // attesterName is null when the attester preferred anonymity (or no
  // public profile is resolvable).
  const display = attesterName || 'Anonymous attester'
  return (
    <div style={{
      padding: '14px 18px',
      background: 'rgba(200,146,42,0.03)',
      border: '1px solid rgba(200,146,42,0.15)',
      borderRadius: '10px',
      marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#A8721A', fontWeight: 600 }}>
          {display}
        </span>
        {attestation.attester_role && (
          <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.55)' }}>
            {attestation.attester_role}
          </span>
        )}
      </div>
      {attestation.attestation_text && (
        <p style={{ ...body, fontSize: '14px', color: '#0F1523', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
          {attestation.attestation_text}
        </p>
      )}
    </div>
  )
}

function OutcomeItem({ report, reporterName }) {
  const display = reporterName || 'Anonymous'
  return (
    <div style={{
      padding: '14px 18px',
      background: 'rgba(42,107,58,0.03)',
      border: '1px solid rgba(42,107,58,0.18)',
      borderRadius: '10px',
      marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#2A6B3A', fontWeight: 600 }}>
          {display}
        </span>
        <span style={{ ...sc, fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(15,21,35,0.55)' }}>
          {formatDate(report.created_at)}
        </span>
      </div>
      <p style={{ ...body, fontSize: '14px', color: '#0F1523', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
        {report.outcome_text}
      </p>
    </div>
  )
}

// ─── Section heading ───────────────────────────────────────

function SectionHeading({ children, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '12px',
      marginTop: '40px', marginBottom: '18px',
      paddingBottom: '10px',
      borderBottom: '1px solid rgba(200,146,42,0.18)',
    }}>
      <h2 style={{ ...sc, fontSize: '12px', letterSpacing: '0.2em', color: '#A8721A', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>
        {children}
      </h2>
      {typeof count === 'number' && (
        <span style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────

export default function BetaPracticeDetail() {
  const { slug } = useParams()
  const { user } = useAuth()

  const [practice,    setPractice]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [notFound,    setNotFound]    = useState(false)
  const [attestations, setAttestations] = useState([])
  const [outcomes,    setOutcomes]    = useState([])
  const [profiles,    setProfiles]    = useState({}) // user_id -> public profile or null

  const [showAttest, setShowAttest]   = useState(false)
  const [showOutcome, setShowOutcome] = useState(false)
  const [userHasAttested, setUserHasAttested] = useState(false)

  useEffect(() => {
    loadPractice()
  }, [slug])

  async function loadPractice() {
    setLoading(true)
    setNotFound(false)

    const { data: p, error } = await supabase
      .from('practices_beta')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('Load practice error:', error)
      setLoading(false)
      return
    }
    if (!p) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setPractice(p)

    // Load attestations and outcomes in parallel
    const [attRes, outRes] = await Promise.all([
      supabase.from('practice_attestations')
        .select('id, attester_user_id, attester_role, attestation_text, created_at')
        .eq('practice_id', p.id)
        .order('created_at', { ascending: false }),
      supabase.from('practice_outcome_reports')
        .select('id, reporter_user_id, outcome_text, created_at')
        .eq('practice_id', p.id)
        .order('created_at', { ascending: false }),
    ])

    const att = attRes.data || []
    const out = outRes.data || []
    setAttestations(att)
    setOutcomes(out)

    // Detect whether the current user has already attested
    if (user) {
      setUserHasAttested(att.some(a => a.attester_user_id === user.id))
    }

    // Resolve display names for any contributors / attesters / reporters who
    // have a public contributor_profiles_beta. Anyone without a public profile
    // renders as "Anonymous attester" / "Anonymous" — that is the privacy
    // default and the contributor's right.
    const userIds = new Set([
      p.contributor_id,
      ...att.map(a => a.attester_user_id),
      ...out.map(o => o.reporter_user_id),
    ].filter(Boolean))

    if (userIds.size > 0) {
      const { data: profs } = await supabase
        .from('contributor_profiles_beta')
        .select('user_id, display_name, profile_visibility_default')
        .in('user_id', Array.from(userIds))
        .eq('profile_visibility_default', 'public')

      const map = {}
      for (const row of profs || []) {
        map[row.user_id] = row.display_name
      }
      setProfiles(map)
    }

    setLoading(false)
  }

  function handleNewAttestation(att) {
    setAttestations(prev => [{ ...att, attester_user_id: user.id }, ...prev])
    setUserHasAttested(true)
    // Update local count + status optimistically.
    setPractice(prev => {
      if (!prev) return prev
      const newCount = (prev.attestation_count || 0) + 1
      return {
        ...prev,
        attestation_count: newCount,
        vetting_status:
          newCount >= 5 && prev.vetting_status === 'self_submitted'
            ? 'community_attested'
            : prev.vetting_status,
      }
    })
  }

  function handleNewOutcome(rep) {
    setOutcomes(prev => [{ ...rep, reporter_user_id: user.id }, ...prev])
    setPractice(prev => {
      if (!prev) return prev
      return { ...prev, outcome_report_count: (prev.outcome_report_count || 0) + 1 }
    })
  }

  // ── Render ──

  if (loading) {
    return (
      <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '120px 24px 60px' }}>
          <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
        <Nav />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '120px 24px 60px', textAlign: 'center' }}>
          <h1 style={{ ...garamond, fontSize: '32px', fontWeight: 300, color: '#0F1523', marginBottom: '12px' }}>
            Practice not found.
          </h1>
          <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65, marginBottom: '24px' }}>
            This practice may have been withdrawn, or the link is mistyped.
          </p>
          <Link to="/beta/practices"
            style={{ ...sc, fontSize: '12px', letterSpacing: '0.14em', color: '#A8721A', textDecoration: 'none' }}>
            Back to practices
          </Link>
        </div>
      </div>
    )
  }

  const isBestForAll = practice.practice_kind === 'best_for_all'
  const contributorName = profiles[practice.contributor_id] || null

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav />

      {/* Modals */}
      {showAttest && (
        <AttestationForm
          practice={practice}
          supabase={supabase}
          user={user}
          onClose={() => setShowAttest(false)}
          onAttested={handleNewAttestation}
        />
      )}
      {showOutcome && (
        <OutcomeReportForm
          practice={practice}
          supabase={supabase}
          user={user}
          onClose={() => setShowOutcome(false)}
          onReported={handleNewOutcome}
        />
      )}

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(72px, 10vw, 96px) 24px 60px' }}>

        {/* Back link */}
        <div style={{ marginBottom: '24px' }}>
          <Link to="/beta/practices"
            style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(15,21,35,0.55)', textDecoration: 'none' }}>
            ← All practices
          </Link>
        </div>

        {/* Header chrome */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
          <KindBadge kindSlug={practice.practice_kind} />
          <VettingBadge vettingSlug={practice.vetting_status} attestationCount={practice.attestation_count} />
        </div>

        {/* Title */}
        <h1 style={{
          ...garamond,
          fontSize: 'clamp(34px, 5vw, 56px)',
          fontWeight: 300,
          color: '#0F1523',
          lineHeight: 1.1,
          margin: '0 0 18px',
        }}>
          {practice.title}
        </h1>

        {/* Placement breadcrumb */}
        <div style={{ marginBottom: '16px' }}>
          <PlacementBreadcrumb practice={practice} />
        </div>

        {/* Lens chips and principle strip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '36px' }}>
          {practice.lenses?.length > 0 && <LensChips lenses={practice.lenses} />}
          {practice.platform_principles?.length > 0 && (
            <PrincipleStrip slugs={practice.platform_principles} size="md" />
          )}
        </div>

        {/* Attestation count — structural, not competitive */}
        {practice.attestation_count > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.65)', fontStyle: 'italic', margin: 0 }}>
              {practice.attestation_count} {practice.attestation_count === 1 ? 'practitioner has' : 'practitioners have'} attested to this practice.
            </p>
          </div>
        )}

        {/* Description — flowing prose */}
        {practice.description && (
          <div style={{ marginBottom: '32px' }}>
            <p style={{
              ...body,
              fontSize: '17px',
              color: '#0F1523',
              lineHeight: 1.75,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}>
              {practice.description}
            </p>
          </div>
        )}

        {/* Lineage attribution */}
        {practice.lineage_attribution && (
          <div style={{ marginBottom: '32px' }}>
            <LineageBlock text={practice.lineage_attribution} />
          </div>
        )}

        {/* Evidence summary — only Best for All */}
        {isBestForAll && practice.evidence_summary && (
          <div style={{ marginBottom: '32px' }}>
            <span style={{
              ...sc, fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)',
              textTransform: 'uppercase', display: 'block', marginBottom: '10px',
            }}>
              Evidence
            </span>
            <div style={{
              padding: '14px 18px',
              background: 'rgba(15,21,35,0.03)',
              borderLeft: '2px solid rgba(15,21,35,0.25)',
              borderRadius: '0 6px 6px 0',
            }}>
              <p style={{ ...body, fontSize: '15px', color: '#0F1523', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {practice.evidence_summary}
              </p>
            </div>
          </div>
        )}

        {/* Contributor attribution (small footer to description) */}
        <div style={{ paddingTop: '14px', borderTop: '1px solid rgba(200,146,42,0.15)', marginBottom: '14px' }}>
          <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)' }}>
            Contributed by {contributorName || 'an anonymous contributor'}
            {practice.contributor_role && (
              <span style={{ color: 'rgba(15,21,35,0.45)' }}> · {practice.contributor_role}</span>
            )}
          </span>
        </div>

        {/* CTAs — only when user is signed in */}
        {user && (
          <div style={{ marginTop: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!userHasAttested ? (
              <button onClick={() => setShowAttest(true)}
                style={{
                  ...sc, fontSize: '13px', letterSpacing: '0.14em',
                  padding: '12px 26px', borderRadius: '40px', border: 'none',
                  background: '#0F1523', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600,
                }}>
                Attest to this practice
              </button>
            ) : (
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.1em', color: '#2A6B3A', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <CheckMark /> You have attested.
              </span>
            )}
            <button onClick={() => setShowOutcome(true)}
              style={{
                ...sc, fontSize: '13px', letterSpacing: '0.14em',
                padding: '12px 26px', borderRadius: '40px',
                border: '1px solid rgba(200,146,42,0.40)',
                background: 'rgba(200,146,42,0.05)', color: '#A8721A', cursor: 'pointer',
              }}>
              Report an outcome
            </button>
          </div>
        )}

        {/* Attestation list */}
        {attestations.length > 0 && (
          <div>
            <SectionHeading count={attestations.length}>Attestations</SectionHeading>
            <div>
              {attestations.map(att => (
                <AttestationItem
                  key={att.id}
                  attestation={att}
                  attesterName={profiles[att.attester_user_id] || null}
                />
              ))}
            </div>
          </div>
        )}

        {/* Outcome reports */}
        {outcomes.length > 0 && (
          <div>
            <SectionHeading count={outcomes.length}>Outcome reports</SectionHeading>
            <div>
              {outcomes.map(o => (
                <OutcomeItem
                  key={o.id}
                  report={o}
                  reporterName={profiles[o.reporter_user_id] || null}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#2A6B3A" strokeWidth="1.4" fill="rgba(42,107,58,0.08)" />
      <path d="M5 8.2L7 10.2L11 6" stroke="#2A6B3A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
