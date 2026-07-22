import { useState } from 'react'
import { DOMAIN_COPY } from '../constants/domainCopy'
import { body, sc } from '../lib/designTokens'

// ─── Domain definitions ───────────────────────────────────────────────────────
//
// The seven personal-side domain paragraphs now live in src/constants/domainCopy.js
// as the single source of truth. This file derives LIFEOS_TIPS from that source
// so any tool still using <DomainTooltip /> sees the same updated copy as the
// richer <InfoIcon /> panels in The Map's teaching layer.
//
// The hover tooltip is a lightweight surface — it shows the domain title plus a
// short opening line. For the full paragraph and the felt question, use the
// <InfoIcon /> panel pattern (see The Map's Step 1 / domain headers).

export const LIFEOS_TIPS = Object.fromEntries(
  Object.entries(DOMAIN_COPY).map(([key, d]) => [
    key,
    {
      aliases: d.title,
      // First sentence of the gloss — short enough for a hover surface.
      desc:    d.gloss.split('. ')[0] + '.',
    },
  ])
)

// Label → id map for components that store labels not ids
export const LIFEOS_LABEL_MAP = {
  'Path': 'path', 'Spark': 'spark', 'Body': 'body',
  'Finances': 'finances', 'Connection': 'connection',
  'Inner Game': 'inner_game', 'Signal': 'signal',
}

// ─── NextUs domain definitions ────────────────────────────────────────────────

export const NEXTUS_TIPS = {
  'human-being':     { tip: "Everything pertaining to the individual.",              desc: "Personal rights and needs. Development. Expression." },
  'society':         { tip: "Everything pertaining to the collective.",              desc: "Governance, structure, frameworks. The science and art of community building and collective well-being." },
  'nature':          { tip: "Ecosystem Earth.",                                      desc: "Earth, air, water, flora, fauna, and everything else pertaining to the life on Earth." },
  'technology':      { tip: "The tools we build for humanity and Earth.",            desc: "The tools we build to aid and amplify humanity and life on Earth." },
  'finance-economy': { tip: "Systems of exchange.",                                  desc: "The management and exchange of resources." },
  'legacy':          { tip: "The footprint of mankind.",                             desc: "What we leave behind for future generations. Each generation's responsibility to the next seven." },
  'vision':          { tip: "Where we are going.",                                   desc: "The orienting force of civilisation. A shared picture of where we are going — and the infrastructure to move toward it together." },
}

export const NEXTUS_LABEL_MAP = {
  'Human Being': 'human-being', 'Society': 'society', 'Nature': 'nature',
  'Technology': 'technology', 'Economy': 'finance-economy',
  'Legacy': 'legacy', 'Vision': 'vision',
}

// ─── Shared tooltip component ─────────────────────────────────────────────────

export function DomainTooltip({ domainKey, label, system = 'nextus-self', position = 'below' }) {
  const [show, setShow] = useState(false)

  const tips = system === 'nextus' ? NEXTUS_TIPS : LIFEOS_TIPS
  const data = tips[domainKey]
  if (!data) return null

  const topLine   = system === 'nextus' ? data.tip     : data.aliases
  const desc      = data.desc

  const tipStyle = {
    position: 'absolute',
    zIndex: 9999,
    background: '#262420',
    borderRadius: '10px',
    padding: '12px 16px',
    width: '260px',
    boxShadow: '0 8px 32px rgba(15,21,35,0.55)',
    pointerEvents: 'none',
    left: '50%',
    transform: 'translateX(-50%)',
    ...(position === 'above' ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {label && <span>{label}</span>}
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{
          background: 'none',
          border: '1px solid rgba(76,107,69,0.45)',
          borderRadius: '50%',
          width: '14px', height: '14px',
          padding: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, lineHeight: 1,
          verticalAlign: 'middle',
        }}
        aria-label={`About ${label || domainKey}`}
      >
        <span style={{ ...sc, fontSize: '13px', color: '#262420', lineHeight: 1 }}>i</span>
      </button>

      {show && (
        <span style={tipStyle}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#262420', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>
            {label || domainKey}
          </span>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: '#262420', display: 'block', marginBottom: '6px', fontWeight: 300 }}>
            {topLine}
          </span>
          <span style={{ ...body, fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.80)', lineHeight: 1.65, display: 'block' }}>
            {desc}
          </span>
        </span>
      )}
    </span>
  )
}
