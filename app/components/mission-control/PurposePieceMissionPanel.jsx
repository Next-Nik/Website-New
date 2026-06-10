// ─────────────────────────────────────────────────────────────
// PurposePieceMissionPanel.jsx
//
// The live in-dashboard readout of Purpose Piece. Replaces the
// marketing stub previously in Mission Control's `activePanel ===
// 'purpose-piece'` Panel.
//
// Three states:
//
//   1. NOT YET PLACED — welcome card + "BEGIN" CTA.
//   2. PLACEMENT COMPLETE (v10 shape) — the real ProfileCard
//      (archetype + civilisational statement + sections + horizon
//      goal) AND the real PlacementCard (territory description,
//      mode, join/start/transmit fork with framing). Both are
//      imported from the source tool — same source of truth.
//   3. OLDER ROW (v9 / pre-v9) — coordinates summary chip
//      (archetype · domain · scale) plus a "Re-place yourself"
//      CTA. Older rows don't have the rich profile/placement
//      JSON the v10 cards expect.
//
// Readiness routing (when a join/start/transmit button is clicked
// inside PlacementCard) mirrors the page's handleReadinessChoice
// exactly:
//   join     → /nextus/contributors?pp_archetype=…&pp_domain=…&pp_scale=…
//   start    → /nextus/place
//   transmit → /domain/:slug
//
// Component reuse: ProfileCard, PlacementCard imported from
// PurposePiece.jsx — no duplicated render logic. They use the
// source tool's local style constants which match the beta tokens
// in hex value.
//
// Props:
//   purposeData — full purpose_piece_results row (already loaded
//                 by useMissionControlData)
//   onNavigate  — react-router navigate function
//
// Note: this panel uses purposeData passed in from the parent
// rather than re-fetching, because the row is already loaded by
// useMissionControlData. Mission Control reloads it when the
// dashboard re-renders.
// ─────────────────────────────────────────────────────────────

import { ProfileCard, PlacementCard } from '../../../tools/purpose-piece/PurposePiece'
import {
  GOLD, GOLD_DK, GOLD_LT, GOLD_RULE,
  TEXT_INK, TEXT_META, TEXT_FAINT,
  BG_CARD,
  FONT_DISPLAY, FONT_SC, FONT_BODY,
} from './tokens'

// Resolve placement coordinates from any writer era. The data hook
// passes the full row; we walk all known shapes.
function resolveCoordinates(purposeData) {
  if (!purposeData) return { archetype: null, domain: null, domainSlug: null, scale: null }
  const archetype =
    purposeData.archetype ||
    purposeData.profile?.archetype ||
    purposeData.session?.archetype ||
    purposeData.session?.tentative?.archetype?.archetype ||
    null
  const domain =
    purposeData.domain ||
    purposeData.profile?.domain ||
    purposeData.session?.domain ||
    purposeData.session?.tentative?.domain?.domain ||
    null
  const scale =
    purposeData.scale ||
    purposeData.profile?.scale ||
    purposeData.session?.scale ||
    purposeData.session?.tentative?.scale?.scale ||
    null
  const domainSlug =
    purposeData.session?.domain_id ||
    purposeData.domain_slug ||
    (domain ? domain.toLowerCase().replace(/[^a-z]+/g, '-') : null)
  return { archetype, domain, domainSlug, scale }
}

export default function PurposePieceMissionPanel({ purposeData, onNavigate }) {

  // ─── Mirror of the page's readiness routing ─────────────────
  function handleReadinessChoice(path) {
    const { archetype, domainSlug, scale } = resolveCoordinates(purposeData)
    if (path === 'join') {
      const p = new URLSearchParams()
      if (archetype)  p.set('pp_archetype', archetype)
      if (domainSlug) p.set('pp_domain',    domainSlug)
      if (scale)      p.set('pp_scale',     scale)
      p.set('pp_from', 'purpose-piece')
      onNavigate(`/nextus/contributors?${p.toString()}`)
    } else if (path === 'start') {
      onNavigate('/nextus/place')
    } else if (path === 'transmit') {
      onNavigate(`/domain/${domainSlug || ''}`)
    }
  }

  // ─── State 1: Not yet placed ────────────────────────────────
  if (!purposeData) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{
          background: BG_CARD,
          border: `1px solid ${GOLD_RULE}`,
          borderLeft: `3px solid ${GOLD}`,
          borderRadius: 14,
          padding: '20px 22px',
          marginBottom: 18,
        }}>
          <p style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 18,
            fontStyle: 'italic',
            color: TEXT_INK,
            lineHeight: 1.55,
            margin: 0,
          }}>
            Where you fit in building the future of the planet.
          </p>
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 14,
            color: TEXT_META,
            lineHeight: 1.65,
            margin: '12px 0 0',
          }}>
            About an hour to do well. You'll come away with an archetype, a
            civilisational domain, a scale, and a placement — a real picture of
            how your contribution travels and what to do next.
          </p>
        </div>
        <button onClick={() => onNavigate('/tools/purpose-piece')} style={primaryBtnStyle}>
          BEGIN PURPOSE PIECE →
        </button>
      </div>
    )
  }

  const coords = resolveCoordinates(purposeData)
  const hasCoords = coords.archetype || coords.domain || coords.scale

  // ─── State 3: Older row, no rich profile/placement ──────────
  // If the row exists but doesn't carry v10 profile/placement
  // JSON, show a coordinates chip + a re-place invitation.
  const profile = purposeData.profile || purposeData.session?.profile
  const placement = purposeData.session?.placement
  const isV10 = !!(profile && placement)

  if (!isV10) {
    return (
      <div style={{ padding: '8px 0' }}>
        {/* Coordinates chip */}
        {hasCoords && (
          <div style={{
            background: BG_CARD,
            border: `1px solid ${GOLD_RULE}`,
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 16,
          }}>
            <div style={{
              fontFamily: FONT_SC,
              fontSize: 13,
              letterSpacing: '0.18em',
              color: TEXT_FAINT,
              marginBottom: 6,
            }}>
              YOUR COORDINATES
            </div>
            <div style={{
              fontFamily: FONT_SC,
              fontSize: 14,
              letterSpacing: '0.10em',
              color: GOLD_DK,
            }}>
              {[coords.archetype, coords.domain, coords.scale]
                .filter(Boolean)
                .map(s => s.toUpperCase())
                .join(' · ')}
            </div>
          </div>
        )}
        <div style={{
          fontFamily: FONT_BODY,
          fontSize: 14,
          color: TEXT_META,
          lineHeight: 1.6,
          marginBottom: 14,
        }}>
          {hasCoords ? (
            <>Your placement was set in an earlier version. Re-run Purpose Piece
            to get the full v10 profile — territory description, mode, and the
            join/start/transmit fork.</>
          ) : (
            <>Your row is partial. Run Purpose Piece end-to-end to get a full
            placement.</>
          )}
        </div>
        <button onClick={() => onNavigate('/tools/purpose-piece')} style={primaryBtnStyle}>
          {hasCoords ? 'REVISIT YOUR FIT →' : 'COMPLETE PURPOSE PIECE →'}
        </button>
      </div>
    )
  }

  // ─── State 2: v10 placement complete ────────────────────────
  // Both ProfileCard and PlacementCard render in their full form.
  // The session blob carries civilisational_statement and horizon_goal
  // for ProfileCard; placement and session for PlacementCard.
  const civilisationalStatement =
    purposeData.session?.civilisational_statement ||
    purposeData.session?.civStatement ||
    null
  const horizonGoal =
    purposeData.session?.horizon_goal ||
    purposeData.session?.horizonGoal ||
    null

  return (
    <div style={{ padding: '4px 0' }}>

      {/* Header summary chip + revisit affordance */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingBottom: 12,
        borderBottom: `1px solid ${GOLD_RULE}`,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: GOLD_DK,
        }}>
          {[coords.archetype, coords.domain, coords.scale]
            .filter(Boolean)
            .map(s => s.toUpperCase())
            .join(' · ')}
        </div>
        <button
          onClick={() => onNavigate('/tools/purpose-piece')}
          style={ghostBtnStyle}
        >
          REVISIT →
        </button>
      </div>

      {/* The real ProfileCard from the page */}
      <ProfileCard
        profile={profile}
        civilisationalStatement={civilisationalStatement}
        horizonGoal={horizonGoal}
      />

      {/* The real PlacementCard from the page */}
      <PlacementCard
        placement={placement}
        session={purposeData.session}
        onChooseReadiness={handleReadinessChoice}
      />

      {/* Footer */}
      <div style={{
        marginTop: 22,
        paddingTop: 14,
        borderTop: `1px solid ${GOLD_RULE}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          fontFamily: FONT_SC,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: TEXT_FAINT,
        }}>
          PLACEMENT · YOUR FIT IN THE WORK
        </div>
        <button onClick={() => onNavigate('/tools/purpose-piece')} style={ghostBtnStyle}>
          REVISIT YOUR FIT →
        </button>
      </div>
    </div>
  )
}

const primaryBtnStyle = {
  background: 'transparent',
  border: `1px solid ${GOLD}`,
  color: GOLD_DK,
  padding: '12px 20px',
  fontFamily: FONT_SC,
  fontSize: 13,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: 0,
}

const ghostBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: GOLD_DK,
  padding: '6px 0',
  fontFamily: FONT_SC,
  fontSize: 13,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}
