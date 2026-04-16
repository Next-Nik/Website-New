import { useState } from 'react'

// ─── NextUs Self domain definitions ───────────────────────────────────────────────

export const LIFEOS_TIPS = {
  'path':       { aliases: "Life's Mission · Purpose · Dharma · Soul Alignment", desc: "The work you were built to do — not your job title, your gift. The contribution that runs beneath whatever you do for income." },
  'spark':      { aliases: "Vitality · Energy · Recharge · Joy · Passion",        desc: "Is the fire on? The things that make you feel genuinely alive — not productive, alive. When Spark is low, everything runs on fumes." },
  'body':       { aliases: "Health · Fitness · The Physical",                       desc: "The instrument through which everything else operates. Not aesthetics — capacity. The only one you get." },
  'finances':   { aliases: "Agency · Money · Currency",                             desc: "Do you have the charge to act? This is about agency, not wealth." },
  'connection': { aliases: "Your relationships with others",                        desc: "Not just the presence of people — the quality of what actually passes between you." },
  'inner_game': { aliases: "Your relationship to yourself",                         desc: "The source code — everything else runs on it. The beliefs and stories you carry about who you are." },
  'signal':     { aliases: "Your relationship to the world",                        desc: "Your public-facing persona and personal environment. Is what you're broadcasting aligned with who you actually are?" },
}

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
  'Technology': 'technology', 'Finance & Economy': 'finance-economy',
  'Legacy': 'legacy', 'Vision': 'vision',
}

// ─── Shared tooltip component ─────────────────────────────────────────────────

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const body  = { fontFamily: "'Lora', Georgia, serif" }

export function DomainTooltip({ domainKey, label, system = 'lifeos', position = 'below' }) {
  const [show, setShow] = useState(false)

  const tips = system === 'nextus' ? NEXTUS_TIPS : LIFEOS_TIPS
  const data = tips[domainKey]
  if (!data) return null

  const topLine   = system === 'nextus' ? data.tip     : data.aliases
  const desc      = data.desc

  const tipStyle = {
    position: 'absolute',
    zIndex: 9999,
    background: '#0F1523',
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
          border: '1px solid rgba(200,146,42,0.45)',
          borderRadius: '50%',
          width: '14px', height: '14px',
          padding: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, lineHeight: 1,
          verticalAlign: 'middle',
        }}
        aria-label={`About ${label || domainKey}`}
      >
        <span style={{ ...sc, fontSize: '13px', color: '#A8721A', lineHeight: 1 }}>i</span>
      </button>

      {show && (
        <span style={tipStyle}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: '#A8721A', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>
            {label || domainKey}
          </span>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: '#A8721A', display: 'block', marginBottom: '6px', fontWeight: 300 }}>
            {topLine}
          </span>
          <span style={{ ...serif, fontSize: '13px', fontWeight: 300, color: 'rgba(255,255,255,0.80)', lineHeight: 1.65, display: 'block' }}>
            {desc}
          </span>
        </span>
      )}
    </span>
  )
}
