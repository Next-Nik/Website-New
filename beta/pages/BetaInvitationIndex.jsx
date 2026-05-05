// src/beta/pages/BetaInvitationIndex.jsx
// Module 13: invitation index at /beta/invitation
// Lists all active invitations, filterable by domain.

import { useState, useEffect } from 'react'
import { Link }                from 'react-router-dom'
import { Nav }                 from '../../components/Nav'
import { SiteFooter }          from '../../components/SiteFooter'
import { supabase }            from '../../hooks/useSupabase'

const body  = { fontFamily: "'Lora', Georgia, serif" }
const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const gold  = '#A8721A'
const dark  = '#0F1523'
const parch = '#FAFAF7'

const CIV_DOMAINS = [
  { value: 'human-being',    label: 'Human Being'       },
  { value: 'society',        label: 'Society'            },
  { value: 'nature',         label: 'Nature'             },
  { value: 'technology',     label: 'Technology'         },
  { value: 'finance-economy',label: 'Finance and Economy'},
  { value: 'legacy',         label: 'Legacy'             },
  { value: 'vision',         label: 'Vision'             },
]

const CIV_DOMAIN_LABEL = Object.fromEntries(CIV_DOMAINS.map(d => [d.value, d.label]))

// ── Invitation list card ─────────────────────────────────────

function InvitationListCard({ invitation }) {
  const domains = invitation.domains || []
  const primaryDomain = domains[0]

  return (
    <Link
      to={`/beta/invitation/${invitation.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        padding: '24px 28px',
        background: '#FFFFFF',
        border: '1px solid rgba(200,146,42,0.16)',
        borderLeft: '3px solid rgba(200,146,42,0.55)',
        borderRadius: '12px',
        marginBottom: '14px',
        transition: 'border-left-color 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderLeftColor = gold
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(200,146,42,0.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderLeftColor = 'rgba(200,146,42,0.55)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {/* Domain tags */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {domains.map((d, i) => (
            <span key={d} style={{
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.16em',
              color: i === 0 ? gold : 'rgba(15,21,35,0.45)',
              background: i === 0 ? 'rgba(200,146,42,0.08)' : 'rgba(15,21,35,0.04)',
              border: `1px solid ${i === 0 ? 'rgba(200,146,42,0.28)' : 'rgba(15,21,35,0.10)'}`,
              borderRadius: '4px',
              padding: '2px 8px',
              textTransform: 'uppercase',
            }}>
              {CIV_DOMAIN_LABEL[d] || d}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 style={{
          ...body,
          fontSize: 'clamp(18px, 2.2vw, 22px)',
          fontWeight: 300,
          color: dark,
          lineHeight: 1.3,
          margin: '0 0 10px',
        }}>
          {invitation.title || invitation.slug}
        </h3>

        {/* Extractive practice teaser */}
        {invitation.extractive_practice && (
          <p style={{
            ...body,
            fontSize: '14px',
            fontWeight: 300,
            color: 'rgba(15,21,35,0.60)',
            lineHeight: 1.65,
            margin: '0 0 10px',
          }}>
            {invitation.extractive_practice.length > 160
              ? invitation.extractive_practice.slice(0, 160) + '...'
              : invitation.extractive_practice}
          </p>
        )}

        {/* Four-part structure preview */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {['Surface', 'Current best available', 'The gap', 'The invitation'].map((label, i) => (
            <span key={i} style={{
              ...sc,
              fontSize: '10px',
              letterSpacing: '0.14em',
              color: 'rgba(15,21,35,0.35)',
            }}>
              {String(i + 1).padStart(2, '0')} {label}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

// ── Domain filter chips ──────────────────────────────────────

function DomainFilter({ selected, onChange }) {
  function toggle(val) {
    onChange(selected === val ? null : val)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '36px' }}>
      <button
        onClick={() => onChange(null)}
        style={{
          ...sc,
          fontSize: '11px',
          letterSpacing: '0.14em',
          padding: '6px 14px',
          borderRadius: '40px',
          cursor: 'pointer',
          border: selected === null ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.22)',
          background: selected === null ? 'rgba(200,146,42,0.10)' : 'transparent',
          color: selected === null ? gold : 'rgba(15,21,35,0.50)',
          transition: 'all 0.15s',
        }}
      >
        All domains
      </button>
      {CIV_DOMAINS.map(d => {
        const on = selected === d.value
        return (
          <button
            key={d.value}
            onClick={() => toggle(d.value)}
            style={{
              ...sc,
              fontSize: '11px',
              letterSpacing: '0.14em',
              padding: '6px 14px',
              borderRadius: '40px',
              cursor: 'pointer',
              border: on ? '1.5px solid rgba(200,146,42,0.78)' : '1.5px solid rgba(200,146,42,0.18)',
              background: on ? 'rgba(200,146,42,0.10)' : 'transparent',
              color: on ? gold : 'rgba(15,21,35,0.50)',
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

// ── Empty state ──────────────────────────────────────────────

function EmptyState({ domain }) {
  return (
    <div style={{ padding: '72px 0', textAlign: 'center' }}>
      <p style={{
        ...body,
        fontSize: '17px',
        fontWeight: 300,
        color: dark,
        lineHeight: 1.6,
        margin: '0 0 14px',
      }}>
        {domain
          ? `No active invitations in ${CIV_DOMAIN_LABEL[domain] || domain} yet.`
          : 'No active invitations yet.'}
      </p>
      <p style={{
        ...body,
        fontSize: '15px',
        fontWeight: 300,
        color: 'rgba(15,21,35,0.50)',
        lineHeight: 1.75,
        margin: 0,
        maxWidth: '400px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        The Technology domain is where the invitation architecture begins. More will follow as the platform grows.
      </p>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export function BetaInvitationIndexPage() {
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [domainFilter, setDomainFilter] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('invitations_beta')
        .select('id, slug, title, subtitle, extractive_practice, domains, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setInvitations(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = domainFilter
    ? invitations.filter(inv => (inv.domains || []).includes(domainFilter))
    : invitations

  return (
    <div style={{ background: parch, minHeight: '100vh' }}>
      <Nav activePath="" />

      <style>{`
        @media (max-width: 640px) {
          .beta-inv-index { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      <div className="beta-inv-index" style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 160px',
      }}>

        {/* Page header */}
        <div style={{ marginBottom: '52px' }}>
          <p style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.22em',
            color: gold,
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '14px',
          }}>
            Invitations
          </p>
          <h1 style={{
            ...body,
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 300,
            color: dark,
            lineHeight: 1.06,
            letterSpacing: '-0.01em',
            margin: '0 0 20px',
          }}>
            Where the gap is.
          </h1>
          <p style={{
            ...body,
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            fontWeight: 300,
            color: 'rgba(15,21,35,0.65)',
            lineHeight: 1.75,
            maxWidth: '540px',
            margin: 0,
          }}>
            For every extractive practice in active use, a surface: here is the current best available regenerative alternative, the honest gap between them, and where effort, capital, and attention could make the most difference.
          </p>
        </div>

        {/* Domain filter */}
        <DomainFilter selected={domainFilter} onChange={setDomainFilter} />

        {/* Loading */}
        {loading && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div className="loading" />
          </div>
        )}

        {/* List */}
        {!loading && filtered.length === 0 && <EmptyState domain={domainFilter} />}
        {!loading && filtered.map(inv => (
          <InvitationListCard key={inv.id} invitation={inv} />
        ))}

        {/* Domain count summary */}
        {!loading && filtered.length > 0 && (
          <p style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: 'rgba(15,21,35,0.40)',
            marginTop: '28px',
          }}>
            {filtered.length} invitation{filtered.length !== 1 ? 's' : ''}
            {domainFilter ? ` in ${CIV_DOMAIN_LABEL[domainFilter]}` : ' across all domains'}
          </p>
        )}

      </div>

      <SiteFooter />
    </div>
  )
}
