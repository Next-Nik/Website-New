// ─────────────────────────────────────────────────────────────
// MiddayRecenter.jsx — the pause
//
// Not a protocol. Not a walk. One screen you reach for when you
// feel yourself listing away from the Horizon Self during the day.
// You breathe, you remember who you are, you step back in. That's
// the whole thing — the pause between stimulus and reaction.
//
// Three movements, unstaged, held on one surface:
//   regulate  — the breathing flame (the shared BreathPacer atom)
//   remember  — the Horizon Self statement, held still
//   recommit  — a single quiet line, then back to it
//
// Deliberately frameless: no progress rail, no region labels, no
// "Midday" chrome. It should feel like a moment, not a tool. Writes
// nothing — Midday is ambient by design; the evening owns the journal.
//
// Props:
//   horizonSelfStatement — the life I Am statement (may be null)
//   onExit               — () => void, the single way back to the day
// ─────────────────────────────────────────────────────────────
import { tokens, serif, body, sc } from '../../../lib/designTokens'
import BreathPacer from './BreathPacer'

export default function MiddayRecenter({ horizonSelfStatement = null, onExit = () => {} }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>

        {/* faint opener — names the moment, not the tool */}
        <p style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.24em',
          textTransform: 'uppercase', color: tokens.ghost, margin: '0 0 36px',
        }}>
          Pause
        </p>

        {/* regulate */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <BreathPacer size={84} caption="Breathe." />
        </div>

        {/* a quiet line, then the remembering */}
        <div style={{
          height: '1px', width: '46px', margin: '0 auto 28px',
          background: tokens.goldFaint,
        }} />

        <p style={{
          ...serif, fontWeight: 300, fontSize: 'clamp(22px,4vw,28px)',
          color: tokens.dark, lineHeight: 1.3, margin: '0 0 18px',
        }}>
          Remember who you are.
        </p>

        {horizonSelfStatement ? (
          // user-authored → italic, the only place italic is allowed
          <p style={{
            ...body, fontStyle: 'italic', fontSize: '16px',
            color: 'rgba(15,21,35,0.78)', lineHeight: 1.65, margin: '0 0 30px',
          }}>
            {horizonSelfStatement}
          </p>
        ) : (
          <p style={{
            ...body, fontSize: '15px', color: tokens.ghost,
            lineHeight: 1.65, margin: '0 0 30px',
          }}>
            Who are you at your fullest? Bring that one back into the room.
          </p>
        )}

        {/* recommit — held as a line, not staged as questions */}
        <p style={{
          ...body, fontSize: '14px', color: tokens.ghost,
          lineHeight: 1.6, margin: '0 0 38px',
        }}>
          You're allowed to live as this. And you're choosing to.
        </p>

        {/* release */}
        <button onClick={onExit} style={{
          ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: '#FFFFFF', background: tokens.goldChrome,
          border: 'none', borderRadius: '40px', padding: '13px 30px', cursor: 'pointer',
        }}>
          Back to it →
        </button>

      </div>
    </div>
  )
}
