// ─────────────────────────────────────────────────────────────
// FoundationAudio.jsx — the Foundation audio, as standalone blocks
//
// Reuses the same files Horizon State plays (public nextus-audio
// bucket), so the protocol is untouched. Broken into three blocks —
// Baseline, Calibration, Embodiment — each addable on its own. A
// light player: press play, listen, continue when you're ready.
//
// Contract:
//   phase: 'baseline' | 'calibration' | 'embodiment'
//   onComplete(), onSkip()
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { tokens, serif, body, sc } from '../../../../lib/designTokens'
import { supabase } from '../../../../hooks/useSupabase'

const BUCKET = 'nextus-audio'
const PHASE_AUDIO = {
  baseline:    'foundation-baseline.mp3',
  calibration: 'foundation-calibration.mp3',
  embodiment:  'foundation-embodiment.mp3',
}
const COPY = {
  baseline:    { heading: 'Audio · Baseline',    hint: 'The regulated floor. Around twenty minutes.' },
  calibration: { heading: 'Audio · Calibration', hint: 'Opens with your I Am statements.' },
  embodiment:  { heading: 'Audio · Embodiment',  hint: 'Settle it into the body.' },
}

export default function FoundationAudio({ phase = 'baseline', title = null, onComplete = () => {}, onSkip = () => {} }) {
  const [url, setUrl] = useState(null)
  const [ended, setEnded] = useState(false)
  const c = COPY[phase] || COPY.baseline

  useEffect(() => {
    const file = PHASE_AUDIO[phase] || PHASE_AUDIO.baseline
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(file)
    setUrl(data?.publicUrl || null)
    setEnded(false)
  }, [phase])

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ textAlign: 'right', marginBottom: '16px' }}>
        <button onClick={onSkip} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '13px', fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(15,21,35,0.55)', opacity: 0.6,
        }}>Skip</button>
      </div>
      <p style={{
        ...sc, fontSize: '13px', fontWeight: 600, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: tokens.gold, margin: '0 0 8px',
      }}>Listen</p>

      <h2 style={{
        ...serif, fontWeight: 300, fontSize: 'clamp(26px,4vw,34px)',
        color: tokens.dark, lineHeight: 1.25, margin: '0 0 10px',
      }}>{title || c.heading}</h2>

      <p style={{ ...body, fontSize: '15px', color: tokens.ghost, lineHeight: 1.6, margin: '0 0 24px' }}>{c.hint}</p>

      {url ? (
        <audio
          controls
          src={url}
          onEnded={() => setEnded(true)}
          style={{ width: '100%', marginBottom: '28px' }}
        />
      ) : (
        <p style={{ ...body, fontSize: '14px', color: tokens.ghost, margin: '0 0 28px' }}>Loading…</p>
      )}

      <div>
        <button onClick={onComplete} style={{
          ...sc, fontSize: '14px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#FFFFFF', background: tokens.goldChrome, border: 'none',
          borderRadius: '40px', padding: '12px 28px', cursor: 'pointer', margin: '0 6px',
        }}>{ended ? 'Continue →' : 'Done →'}</button>

      </div>
    </div>
  )
}
