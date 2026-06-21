// ─────────────────────────────────────────────────────────────
// Readiness.jsx · the readiness ritual, as a standalone block
//
// Three thresholds, one at a time: ready, allowed, choosing. The
// three questions are almost the same sentence; the only thing that
// moves is one word. So that word is now the loud thing on the page,
// styled to its own meaning: ready ignites, allowed opens, choosing
// commits. Nobody can mistake which threshold they're answering.
//
// The Horizon Self statement is held in the middle as the thing each
// yes answers to. A single slowly pulsing Yes per question that now
// presses in on tap, so the click registers in the body.
//
// Contract:
//   onComplete(answers)  · fired after three yeses; answers = {ready,allowed,choosing:'yes'}
//   onSkip(answers)      · fired on "not today"; the current threshold marked 'no'
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { tokens, serif, body, sc } from '../../../../lib/designTokens'

// Each threshold word, designed to its meaning. Text colours only.
//   ready    · ignition, primed, on the blocks (a charged orange, a start line)
//   allowed  · permission, green light, room to be (an open green)
//   choosing · will, gravity, the deliberate act (a deep committed maroon)
// These echo the Spark / Body / Path domain hues. If domain colour
// should stay reserved, swap the three values below for a neutral trio.
const KW = {
  ready:    { color: '#E8722E', weight: 700, scale: 1.16, borderBottom: '3px solid #E8722E', paddingBottom: '2px', letterSpacing: 'normal' },
  allowed:  { color: '#2A8C4F', weight: 600, scale: 1.16, letterSpacing: '0.06em' },
  choosing: { color: '#6B1F2E', weight: 800, scale: 1.22, letterSpacing: '-0.005em', boxShadow: 'inset 0 -0.30em 0 rgba(107,31,46,0.12)' },
}

const QUESTIONS = [
  { key: 'ready',    pre: 'Are you ', word: 'ready',    post: ' to step into your Horizon Self?' },
  { key: 'allowed',  pre: 'Are you ', word: 'allowed',  post: ' to live as your Horizon Self?' },
  { key: 'choosing', pre: 'Are you ', word: 'choosing', post: ' to step into your Horizon Self?' },
]

function Keyword({ kind, children }) {
  const k = KW[kind] || {}
  return (
    <span style={{
      display: 'inline-block', lineHeight: 1,
      fontWeight: k.weight, color: k.color,
      fontSize: `${k.scale}em`, letterSpacing: k.letterSpacing,
      borderBottom: k.borderBottom, paddingBottom: k.paddingBottom,
      boxShadow: k.boxShadow,
    }}>{children}</span>
  )
}

export default function Readiness({
  horizonSelfStatement = null,
  protectorCovenant = null,
  showCovenant = false,
  onToggleCovenant = () => {},
  onComplete = () => {},
  onSkip = () => {},
}) {
  const [step, setStep] = useState(0)

  function sayYes() {
    const next = { ready: 'yes', allowed: 'yes', choosing: 'yes' }
    if (step < QUESTIONS.length - 1) setStep(s => s + 1)
    else onComplete(next)
  }

  function notToday() {
    const answers = { ready: null, allowed: null, choosing: null }
    QUESTIONS.slice(0, step).forEach(q => { answers[q.key] = 'yes' })
    answers[QUESTIONS[step].key] = 'no'
    onSkip(answers)
  }

  const q = QUESTIONS[step]

  return (
    <div>
      <style>{`
        @keyframes rd-pulse-yes {
          0%, 100% { box-shadow: 0 6px 16px rgba(168,114,26,0.28), 0 0 0 0 ${tokens.goldStrong}; }
          50%      { box-shadow: 0 6px 16px rgba(168,114,26,0.28), 0 0 0 18px transparent; }
        }
        .rd-yes { animation: rd-pulse-yes 2.8s ease-in-out infinite; transition: transform 0.16s ease, box-shadow 0.16s ease; }
        .rd-yes:hover  { transform: scale(1.06); }
        /* the press: it sinks in and the glow collapses inward */
        .rd-yes:active {
          transform: scale(0.93);
          box-shadow: 0 2px 6px rgba(168,114,26,0.30), inset 0 3px 10px rgba(0,0,0,0.22);
          animation: none;
        }
        @keyframes rd-fade-in { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        .rd-fade-in { animation: rd-fade-in 0.5s ease-out; }
      `}</style>

      <div className="rd-fade-in" key={step}>
        <p style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: tokens.gold, margin: '0 0 20px',
        }}>Choose</p>

        {/* three thresholds, one at a time */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '22px' : '7px', height: '7px', borderRadius: '4px',
              background: i < step ? tokens.goldChrome : i === step ? tokens.gold : tokens.goldFaint,
              transition: 'all 0.4s ease',
            }} />
          ))}
        </div>

        <h2 style={{
          ...serif, fontWeight: 300, fontSize: 'clamp(26px,4vw,34px)', lineHeight: 1.3,
          color: tokens.dark, textAlign: 'center', margin: '0 0 30px',
        }}>{q.pre}<Keyword kind={q.key}>{q.word}</Keyword>{q.post}</h2>

        {/* the Horizon Self statement · held in the middle */}
        {horizonSelfStatement ? (
          <div style={{
            margin: '0 auto 36px', maxWidth: '460px', padding: '28px 30px', textAlign: 'center',
            background: tokens.goldTint, border: `1px solid ${tokens.goldFaint}`, borderRadius: '14px',
          }}>
            <p style={{
              ...serif, fontStyle: 'italic', fontSize: 'clamp(20px,3vw,26px)', fontWeight: 300,
              color: tokens.gold, lineHeight: 1.45, margin: 0,
            }}>{horizonSelfStatement}</p>
          </div>
        ) : (
          <p style={{
            ...body, textAlign: 'center', color: tokens.ghost, fontSize: '15px',
            margin: '0 auto 36px', maxWidth: '420px', lineHeight: 1.6,
          }}>
            Your integrated Horizon Self statement lands here once your Map’s synthesis runs.
          </p>
        )}

        {/* the slowly pulsing yes · now with a real press */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
          <button
            className="rd-yes"
            onClick={sayYes}
            style={{
              ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#FFFFFF', background: tokens.goldChrome, border: 'none', borderRadius: '50%',
              width: '124px', height: '124px', cursor: 'pointer', outline: 'none',
              boxShadow: '0 6px 16px rgba(168,114,26,0.28)',
            }}
          >Yes</button>
        </div>

        {/* quiet escape · a no is data, never a wall */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={notToday} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em',
            color: tokens.ghost, textTransform: 'uppercase',
          }}>Not today · run lighter →</button>
        </div>

        {protectorCovenant && (
          <div style={{ marginTop: '22px', textAlign: 'center' }}>
            <button onClick={onToggleCovenant} style={{
              background: 'transparent', border: 'none', padding: '8px 0',
              cursor: 'pointer', ...sc, fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.18em', color: tokens.gold,
              borderBottom: `1px solid ${tokens.goldFaint}`,
            }}>{showCovenant ? '− Hide covenant' : '+ Covenant'}</button>
            {showCovenant && (
              <div style={{
                marginTop: '14px', padding: '20px 22px', textAlign: 'left',
                background: tokens.goldTint,
                borderLeft: `2px solid ${tokens.goldChrome}`, borderRadius: '4px',
              }}>
                <p style={{
                  margin: 0, ...serif, fontSize: '18px', fontWeight: 300,
                  color: tokens.meta, lineHeight: 1.6,
                }}>{protectorCovenant}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
