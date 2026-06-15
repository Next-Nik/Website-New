// ─────────────────────────────────────────────────────────────
// FlameCheck.jsx — the felt-sense read, as a standalone block
//
// Reuses the shared FlameSlider, so Horizon State (which also uses
// it) is untouched. Serves both ends of a session: 'arrive' reads
// where you are now; 'embark' reads again at the close, with the
// arrival value shown as a ghost so you see the shift.
//
// Contract:
//   onComplete(value)  — the read, 0–10
//   onSkip()
//   stage: 'arrive' | 'embark'
//   ghostValue: prior read to show behind the slider (embark)
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { tokens, serif, body, sc } from '../../../../lib/designTokens'
import { FlameSlider } from '../../../../components/FlameCheckIn'

const COPY = {
  arrive: { region: 'Arrive', heading: 'Where are you, right now?', hint: 'No right answer. Just read the flame.' },
  embark: { region: 'Embark', heading: 'And now?',                  hint: 'Where you are, against where you started.' },
}

export default function FlameCheck({ stage = 'arrive', ghostValue = null, onComplete = () => {}, onSkip = () => {} }) {
  const [value, setValue] = useState(5)
  const c = COPY[stage] || COPY.arrive

  return (
    <div style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{
        ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: tokens.gold, margin: '0 0 8px',
      }}>{c.region}</p>

      <h2 style={{
        ...serif, fontWeight: 300, fontSize: 'clamp(26px,4vw,34px)',
        color: tokens.dark, lineHeight: 1.25, margin: '0 0 10px',
      }}>{c.heading}</h2>

      <p style={{ ...body, fontSize: '15px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 24px' }}>{c.hint}</p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
        <FlameSlider value={value} onChange={setValue} ghostValue={ghostValue} />
      </div>

      <div>
        <button onClick={() => onComplete(value)} style={{
          ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
          borderRadius: '40px', padding: '12px 28px', cursor: 'pointer', margin: '0 6px',
        }}>Set →</button>
        <button onClick={onSkip} style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          background: 'transparent', border: `1px solid ${tokens.goldFaint}`, color: tokens.gold,
          borderRadius: '40px', padding: '12px 24px', cursor: 'pointer', margin: '0 6px',
        }}>Skip →</button>
      </div>
    </div>
  )
}
