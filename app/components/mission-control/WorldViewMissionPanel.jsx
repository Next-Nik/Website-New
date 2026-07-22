// ─────────────────────────────────────────────────────────────
// WorldViewMissionPanel.jsx
//
// Replaces the marketing stub previously in Mission Control's
// `activePanel === 'world-view'` Panel.
//
// What it shows:
//   • System reliability tile (Module 11.8) — fetch-log surface
//     so users can see the system's honest tally of what fetched,
//     what failed, and what's not yet built
//   • Per-domain row, all seven civilisational domains
//   • Rollup score 0–10 for each domain (or "—" if no coverage)
//   • Tap a domain to expand:
//       - Headline IndicatorCards (cron-fed live data)
//       - "See all indicators" expander → IndicatorTable for the
//         full catalog, with per-row Suggest-a-Source CTAs on
//         Tier 2 / contributor rows
//       - Contributor signals (Tier 3) below
//       - Domain-level Suggest-a-Source CTA when the spoke is "—"
//   • Honest empty states everywhere — domains without seeded
//     catalog rows show a clear "Catalog not yet seeded" message,
//     not invented data.
//
// Data flow:
//   useCivDomainScores → top-level rollup per domain (one query)
//   useDomainIndicators(domain) → headline cluster (per expansion)
//   fetchAllIndicators(domain)  → full catalog (lazy on expander)
//   fetchContributorSignals(domain) → Tier 3 (per expansion)
//   /api/indicator-reliability  → fetch-log read surface
//
// Component reuse:
//   IndicatorCard, IndicatorTable, ContributorSignalsList,
//   IndicatorReliabilityPanel — all imported as-is.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  useCivDomainScores,
  useDomainIndicators,
} from '../../hooks/useDomainIndicators'
import IndicatorCard         from '../IndicatorCard'
import IndicatorTable        from '../IndicatorTable'
import ContributorSignalsList from '../ContributorSignalsList'
import SuggestSourceCTA       from '../SuggestSourceCTA'
import IndicatorReliabilityPanel from './IndicatorReliabilityPanel'
import {
  TEXT_INK, TEXT_WHITE, TEXT_WHITE_META, TEXT_WHITE_FAINT,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'
import { at } from '../../../lib/designTokens'

// Display order for the seven civ domains in the panel — same as the
// civ wheel canonical spoke order so the panel reads as the wheel
// laid flat.
const CIV_DOMAIN_DISPLAY = [
  { id: 'vision',          label: 'Vision' },
  { id: 'human-being',     label: 'Human Being' },
  { id: 'nature',          label: 'Nature' },
  { id: 'finance-economy', label: 'Economy' },
  { id: 'technology',      label: 'Technology' },
  { id: 'legacy',          label: 'Legacy' },
  { id: 'society',         label: 'Society' },
]

// Wheel key alias for matching scores.
const DOMAIN_TO_WHEEL = {
  'human-being':     'human',
  'society':         'society',
  'nature':          'nature',
  'technology':      'tech',
  'finance-economy': 'finance',
  'legacy':          'legacy',
  'vision':          'vision',
}

// Score colour band — same palette as Design System v3.
function scoreColour(score) {
  if (score == null) return TEXT_WHITE_FAINT
  if (score >= 7)    return at.verdigris             // progress
  if (score >= 4)    return at.brass                 // amber middle
  if (score >= 2)    return 'rgba(169,116,63,0.65)'  // friction (muted brass)
  return '#D86464'                      // crisis (lighter red for dark bg)
}

function ScorePill({ score, contributing, total }) {
  const colour = scoreColour(score)
  const label = score == null ? '—' : score.toFixed(1)
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 8,
      padding: '4px 12px',
      borderRadius: 14,
      border: `1px solid ${colour}55`,
      background: `${colour}14`,
    }}>
      <span style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 22,
        fontWeight: 400,
        color: colour,
        lineHeight: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: FONT_SC,
        fontSize: 13,
        letterSpacing: '0.18em',
        color: TEXT_WHITE_META,
      }}>
        / 10
      </span>
      {total > 0 && (
        <span style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.16em',
          color: TEXT_WHITE_FAINT,
          marginLeft: 4,
        }}>
          {contributing}/{total}
        </span>
      )}
    </span>
  )
}

export default function WorldViewMissionPanel() {
  const { scores, details, loading } = useCivDomainScores()
  const [expandedDomain, setExpandedDomain] = useState(null)

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Header strip */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingBottom: 12,
        borderBottom: `1px solid ${at.verdigrisEdge}`,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: at.brass,
        }}>
          STATE OF THE WORLD
        </div>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: TEXT_WHITE_FAINT,
        }}>
          {loading ? 'LOADING…' : 'LIVE DATA'}
        </div>
      </div>

      {/* Intro */}
      <p style={{
        fontFamily: FONT_BODY,
        fontSize: 14,
        color: TEXT_WHITE_META,
        lineHeight: 1.6,
        margin: '0 0 18px',
      }}>
        Each domain rolls up a 0–10 score from headline indicators with live
        cron-fed data. Empty state means the catalog is not yet seeded for
        that domain, or values have not yet been collected. Where the system
        does not yet have a source, we welcome suggestions.
      </p>

      {/* System reliability tile (Module 11.8) */}
      <div style={{ marginBottom: 18 }}>
        <IndicatorReliabilityPanel hours={24} />
      </div>

      {/* Per-domain rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CIV_DOMAIN_DISPLAY.map(domain => {
          const wheelKey = DOMAIN_TO_WHEEL[domain.id]
          const score = scores?.[wheelKey] ?? null
          const detail = details?.[wheelKey]
          const isExpanded = expandedDomain === domain.id

          return (
            <DomainRow
              key={domain.id}
              domain={domain}
              score={score}
              detail={detail}
              isExpanded={isExpanded}
              onToggle={() => setExpandedDomain(prev => prev === domain.id ? null : domain.id)}
            />
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 22,
        paddingTop: 14,
        borderTop: `1px solid ${at.verdigrisEdge}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: TEXT_WHITE_FAINT,
        }}>
          DATA SOURCING LAYER · MODULE 11
        </div>
      </div>
    </div>
  )
}

// ─── DomainRow ──────────────────────────────────────────────
function DomainRow({ domain, score, detail, isExpanded, onToggle }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.025)',
      border: `1px solid ${isExpanded ? at.verdigris : at.verdigrisEdge}`,
      borderRadius: 14,
      overflow: 'hidden',
      transition: 'border-color 0.2s ease',
    }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '14px 16px',
          cursor: 'pointer',
          fontFamily: FONT_BODY,
          gap: 12,
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 20,
            fontWeight: 500,
            color: TEXT_WHITE,
          }}>
            {domain.label}
          </div>
          {detail && detail.total > 0 && (
            <div style={{
              fontFamily: FONT_SC,
              fontSize: 13,
              letterSpacing: '0.16em',
              color: TEXT_WHITE_FAINT,
              marginTop: 4,
            }}>
              {detail.contributing > 0
                ? `${detail.contributing} OF ${detail.total} HEADLINE INDICATORS SCORED`
                : `${detail.total} HEADLINE INDICATORS · NONE SCORED YET`
              }
            </div>
          )}
          {(!detail || detail.total === 0) && (
            <div style={{
              fontFamily: FONT_SC,
              fontSize: 13,
              letterSpacing: '0.16em',
              color: TEXT_WHITE_FAINT,
              marginTop: 4,
            }}>
              CATALOG NOT YET SEEDED
            </div>
          )}
        </div>
        <ScorePill score={score} contributing={detail?.contributing || 0} total={detail?.total || 0} />
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          color: at.brass,
          width: 18,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          {isExpanded ? '–' : '+'}
        </span>
      </button>

      {isExpanded && (
        <div style={{
          borderTop: `1px solid ${at.verdigrisEdge}`,
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <DomainExpanded domain={domain} score={score} detail={detail} />
        </div>
      )}
    </div>
  )
}

// ─── DomainExpanded — headlines, full catalog, contributor signals ──
function DomainExpanded({ domain, score, detail }) {
  const { headlines, loading } = useDomainIndicators(domain.id)
  const hasHeadlines = !loading && Array.isArray(headlines) && headlines.length > 0

  // Headline indicators that are missing a value — those are the rows
  // most in need of a source suggestion. We surface a per-headline CTA
  // when the score is null, since "—" means we couldn't roll up the
  // domain at all.
  const missingHeadlines = hasHeadlines
    ? headlines.filter(ind =>
        !(ind?.value && (ind.value.numeric != null || ind.value.text)) &&
        ind?.tier !== 'api'
      )
    : []

  const showDomainLevelCTA = score == null && missingHeadlines.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Headline cluster */}
      <div>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: at.brass,
          marginBottom: 10,
        }}>
          HEADLINE INDICATORS
        </div>
        {loading && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_WHITE_FAINT }}>
            Loading…
          </p>
        )}
        {!loading && !hasHeadlines && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_WHITE_FAINT }}>
            No headline indicators in catalog yet for this domain.
          </p>
        )}
        {hasHeadlines && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
          }}>
            {headlines.map(ind => (
              <IndicatorCard key={ind.id} indicator={ind} />
            ))}
          </div>
        )}
      </div>

      {/* Domain-level CTA: when the spoke shows "—" because not enough
          headlines have data, invite the visitor to point us at a source. */}
      {showDomainLevelCTA && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${at.verdigrisEdge}`,
          borderRadius: 12,
          padding: '14px 16px',
        }}>
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: TEXT_WHITE_META,
            lineHeight: 1.55,
            margin: '0 0 10px',
          }}>
            This spoke shows <strong>—</strong> because we don't yet have
            enough live sources flowing in. Several headline indicators are
            catalogued but their fetchers aren't built. If you know a
            defensible public source for any of them, point us at it.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missingHeadlines.slice(0, 5).map(ind => (
              <div key={ind.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: TEXT_WHITE }}>
                  {ind.name}
                </span>
                <SuggestSourceCTA indicatorId={ind.id} indicatorName={ind.name} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* See all indicators (self-managed expander, lazy-loads) */}
      {hasHeadlines && (
        <IndicatorTable domainSlug={domain.id} />
      )}

      {/* Contributor signals (self-managed expander, lazy-loads) */}
      <ContributorSignalsList domainSlug={domain.id} />

    </div>
  )
}
