// src/beta/components/practices/PracticeCard.jsx
//
// Compact card for the practice library listing.
// Composition: kind badge, title, primary domain, attestation count
// (structural, not competitive — see voice notes), short description
// preview, principle strip if any, vetting status.
//
// Props:
//   practice — a row from practices_beta with optional joined fields
//              ({ slug, title, practice_kind, domains, subdomains, lenses,
//                 platform_principles, description, attestation_count,
//                 vetting_status, contributor_role, ... })
//   onClick  — optional override; default navigates to /beta/practice/:slug

import { Link } from 'react-router-dom'
import PrincipleStrip from '../PrincipleStrip'
import { PRACTICE_KIND_BY_SLUG, VETTING_BY_SLUG } from '../../constants/practices'
import { CIV_DOMAIN_BY_SLUG } from '../../constants/domains'

const sc       = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body     = { fontFamily: "'Lora', Georgia, serif" }
const garamond = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

function previewText(text, max = 180) {
  if (!text) return ''
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  // Cut at word boundary
  const cut = trimmed.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return cut.slice(0, lastSpace > max * 0.7 ? lastSpace : max).trim() + '...'
}

export default function PracticeCard({ practice }) {
  const kind = PRACTICE_KIND_BY_SLUG[practice.practice_kind]
  const vetting = VETTING_BY_SLUG[practice.vetting_status]
  const primaryDomain = practice.domains?.[0]
  const domainConfig = primaryDomain ? CIV_DOMAIN_BY_SLUG[primaryDomain] : null
  const principles = practice.platform_principles || []

  return (
    <Link
      to={`/beta/practice/${practice.slug}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: '#FFFFFF',
        border: '1px solid rgba(200,146,42,0.18)',
        borderRadius: '14px',
        padding: '20px 22px',
        marginBottom: '12px',
        transition: 'border-color 150ms ease, transform 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(200,146,42,0.45)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(200,146,42,0.18)'
      }}
    >
      {/* Top row: kind badge + domain + vetting */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        flexWrap: 'wrap',
      }}>
        {kind && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: kind.color,
            background: `${kind.color}12`,
            border: `1px solid ${kind.color}40`,
            borderRadius: '40px',
            padding: '2px 10px',
          }}>
            {kind.label}
          </span>
        )}

        {domainConfig && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: 'rgba(15,21,35,0.55)',
            background: 'rgba(200,146,42,0.04)',
            border: '1px solid rgba(200,146,42,0.18)',
            borderRadius: '40px',
            padding: '2px 8px',
          }}>
            {domainConfig.label}
          </span>
        )}

        {vetting && (
          <span style={{
            ...sc,
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: vetting.color,
            marginLeft: 'auto',
          }}>
            {vetting.label}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{
        ...garamond,
        fontSize: 'clamp(20px, 2.4vw, 26px)',
        fontWeight: 400,
        color: '#0F1523',
        margin: '0 0 8px',
        lineHeight: 1.2,
      }}>
        {practice.title}
      </h3>

      {/* Description preview */}
      {practice.description && (
        <p style={{
          ...body,
          fontSize: '14px',
          color: 'rgba(15,21,35,0.72)',
          lineHeight: 1.6,
          margin: '0 0 12px',
        }}>
          {previewText(practice.description)}
        </p>
      )}

      {/* Bottom row: principles + attestation count */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        marginTop: '4px',
      }}>
        <div>
          {principles.length > 0 && (
            <PrincipleStrip slugs={principles} size="sm" />
          )}
        </div>

        {/* Attestation count — structural language, not competitive */}
        {(practice.attestation_count > 0) && (
          <span style={{
            ...sc,
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'rgba(15,21,35,0.55)',
          }}>
            {practice.attestation_count} {practice.attestation_count === 1 ? 'practitioner has' : 'practitioners have'} attested
          </span>
        )}
      </div>
    </Link>
  )
}
