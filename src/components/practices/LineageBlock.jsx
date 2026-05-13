// src/beta/components/practices/LineageBlock.jsx
//
// Renders lineage attribution as a block-quote.
//
// Default rendering: gold left border, Lora body text.
// When traditional / indigenous / ancestral lineage is detected:
//   - text renders in Cormorant Garamond italic
//   - the slim gold border thickens slightly
//   - prefixed with the indigenous-relational PrincipleBadge
// The attributed source's self-description is never abbreviated or
// paraphrased.
//
// Props:
//   text             — the lineage attribution text (string)
//   forceTraditional — boolean override; when true, always render with extra
//                      dignity even if heuristics do not detect a marker
//   className        — passthrough

import PrincipleBadge from '../PrincipleBadge'
import { detectsTraditionalLineage } from '../../constants/practices'

const sc      = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body    = { fontFamily: "'Lora', Georgia, serif" }
const garamond = { fontFamily: "'Cormorant Garamond', Georgia, serif" }

export default function LineageBlock({ text, forceTraditional = false, className }) {
  if (!text || !text.trim()) return null

  const isTraditional = forceTraditional || detectsTraditionalLineage(text)

  return (
    <div className={className} style={{ marginTop: '4px' }}>
      <span style={{
        ...sc,
        fontSize: '11px',
        letterSpacing: '0.18em',
        color: 'rgba(15,21,35,0.55)',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: '10px',
      }}>
        Lineage
      </span>

      <blockquote style={{
        margin: 0,
        padding: '12px 18px',
        borderLeft: isTraditional
          ? '3px solid #A8721A'
          : '2px solid rgba(200,146,42,0.55)',
        background: isTraditional
          ? 'rgba(200,146,42,0.04)'
          : 'transparent',
        borderRadius: '0 6px 6px 0',
      }}>
        {isTraditional && (
          <div style={{ marginBottom: '10px' }}>
            <PrincipleBadge slug="indigenous-relational" weight="primary" />
          </div>
        )}

        <p style={{
          ...(isTraditional ? garamond : body),
          fontSize: isTraditional ? '17px' : '15px',
          fontStyle: isTraditional ? 'italic' : 'normal',
          fontWeight: isTraditional ? 400 : 400,
          color: '#0F1523',
          lineHeight: 1.7,
          margin: 0,
          whiteSpace: 'pre-wrap', // preserve contributor's original line breaks
        }}>
          {text}
        </p>
      </blockquote>
    </div>
  )
}
