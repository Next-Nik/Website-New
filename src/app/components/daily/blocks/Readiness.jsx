// ─────────────────────────────────────────────────────────────
// Readiness.jsx — the readiness ritual, as a standalone block
//
// Three thresholds, one at a time: ready, allowed, choosing. The
// Horizon Self statement is held in the middle as the thing each yes
// answers to. A single slowly pulsing Yes per question — not a form.
// A quiet "not today" honours the no without a wall.
//
// Self-contained like the breath blocks: it owns its step state and
// its own pulse animation, styles inline from design tokens. The
// covenant toggle is driven by the parent (it persists "seen"), so
// it's passed in rather than owned here.
//
// Contract:
//   onComplete(answers)  — fired after three yeses; answers = {ready,allowed,choosing:'yes'}
//   onSkip(answers)      — fired on "not today"; the current threshold marked 'no'
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { tokens, serif, body, sc } from '../../../../lib/designTokens'

const QUESTIONS = [
  { key: 'ready',    text: 'Are you ready to step into your Horizon Self?' },
  { key: 'allowed',  text: 'Are you allowed to live as your Horizon Self?' },
  { key: 'choosing', text: 'Are you choosing to step into your Horizon Self?' },
]

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

  return (
    <div>
      <style>{`
        @keyframes rd-pulse-yes {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 ${tokens.goldStrong}; }
          50%      { transform: scale(1.06); box-shadow: 0 0 0 20px transparent; }
        }
        .rd-pulse-yes { animation: rd-pulse-yes 2.8s ease-in-out infinite; transition: transform 0.2s ease; }
        .rd-pulse-yes:hover { transform: scale(1.06); }
        @keyframes rd-fade-in { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        .rd-fade-in { animation: rd-fade-in 0.5s ease-out; }
      `}</style>

      <div className="rd-fade-in">
        <p style={{
          ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: tokens.gold, margin: '0 0 20px',
        }}>Commit</p>

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
          ...serif, fontWeight: 300, fontSize: 'clamp(26px,4vw,34px)', lineHeight: 1.25,
          color: tokens.dark, textAlign: 'center', margin: '0 0 30px',
        }}>{QUESTIONS[step].text}</h2>

        {/* the Horizon Self statement — held in the middle */}
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

        {/* the slowly pulsing yes */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
          <button
            className="rd-pulse-yes"
            onClick={sayYes}
            style={{
              ...sc, fontSize: '16px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#FFFFFF', background: tokens.goldChrome, border: 'none', borderRadius: '50%',
              width: '124px', height: '124px', cursor: 'pointer',
            }}
          >Yes</button>
        </div>

        {/* quiet escape — a no is data, never a wall */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={notToday} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.16em',
            color: tokens.ghost, textTransform: 'uppercase',
          }}>Not today — run lighter →</button>
        </div>

        {protectorCovenant && (
          <div style={{ marginTop: '22px', textAlign: 'center' }}>
            <button onClick={onToggleCovenant} style={{
              background: 'transparent', border: 'none', padding: '8px 0',
              cursor: 'pointer', ...sc, fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.18em', color: tokens.gold,
              borderBottom: `1px solid ${tokens.goldFaint}`,
            }}>{showCovenant ? '— Hide covenant' : '+ Covenant'}</button>
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
