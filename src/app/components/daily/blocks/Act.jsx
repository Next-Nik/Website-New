// ─────────────────────────────────────────────────────────────
// Act.jsx — the close, as a standalone block
//
// You're regulated, you've named the day. This is the step out:
// you are live. Shows the first threshold if one was named, then
// Engage. The runner's session record / journal write is the later
// stage; here, Engage simply finishes the walk.
//
// Contract: { firstThreshold, onComplete(), onSkip() }
// ─────────────────────────────────────────────────────────────
import { tokens, serif, body, sc } from '../../../../lib/designTokens'

export default function Act({ firstThreshold = null, onComplete = () => {}, onSkip = () => {} }) {
  return (
    <div style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{
        ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: tokens.gold, margin: '0 0 14px',
      }}>Act</p>

      <h2 style={{
        ...serif, fontWeight: 300, fontSize: 'clamp(30px,5vw,42px)',
        color: tokens.dark, lineHeight: 1.2, margin: 0,
      }}>You are <span style={{ color: tokens.gold }}>live</span>.</h2>

      {firstThreshold && (
        <div style={{
          display: 'inline-block', marginTop: '26px', marginBottom: '4px',
          padding: '14px 22px', textAlign: 'left',
          background: tokens.goldTint, border: `1px solid ${tokens.goldFaint}`, borderRadius: '12px',
        }}>
          <p style={{
            ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: tokens.gold, margin: '0 0 6px',
          }}>First threshold{firstThreshold.time_label ? ` · ${firstThreshold.time_label}` : ''}</p>
          <p style={{ ...serif, fontSize: '18px', fontWeight: 300, color: tokens.meta, margin: 0, lineHeight: 1.4 }}>
            {firstThreshold.title}
          </p>
        </div>
      )}

      <div style={{ marginTop: '32px' }}>
        <button onClick={onComplete} style={{
          ...sc, fontSize: '15px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
          borderRadius: '40px', padding: '14px 38px', cursor: 'pointer',
        }}>Engage →</button>
      </div>
    </div>
  )
}
