import { useState, useRef, useEffect } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { FlameCheckIn, FlameGlyph } from '../../components/FlameCheckIn'

const AUDIO_FILE = 'foundation-baseline.mp3'
const BUCKET     = 'nextus-audio'

// ─── Shared styles ────────────────────────────────────────────────────────────

const sc    = { fontFamily: "var(--font-sc)" }
const serif = { fontFamily: "var(--font-body)" }
const gold  = { color: "var(--gold-dk)" }
const muted = { color: "var(--text-muted)" }
const meta  = { color: "var(--text-meta)" }

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ url, onEnded }) {
  const audioRef                = useRef(null)
  const [playing,   setPlaying] = useState(false)
  const [current,   setCurrent] = useState(0)
  const [duration,  setDuration] = useState(0)
  const [loaded,    setLoaded]  = useState(false)

  useEffect(() => {
    const a = new Audio(url)
    a.preload = 'metadata'
    audioRef.current = a

    a.addEventListener('loadedmetadata', () => { setDuration(a.duration); setLoaded(true) })
    a.addEventListener('timeupdate',     () => setCurrent(a.currentTime))
    a.addEventListener('ended',          () => {
      setPlaying(false)
      setCurrent(0)
      a.currentTime = 0
      onEnded?.()
    })

    return () => { a.pause(); a.src = '' }
  }, [url])

  function fmt(s) {
    if (!s || isNaN(s)) return '--:--'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  function toggle() {
    const a = audioRef.current; if (!a) return
    if (a.paused) { a.play(); setPlaying(true) }
    else          { a.pause(); setPlaying(false) }
  }

  function seek(e) {
    const a = audioRef.current; if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: playing ? 'rgba(200,146,42,0.1)' : 'rgba(200,146,42,0.05)',
          border: '1.5px solid rgba(200,146,42,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: loaded ? 'pointer' : 'wait', flexShrink: 0,
          ...gold, fontSize: '18px', transition: 'all 0.2s',
        }}
      >
        {playing ? '\u23F8' : '\u25B6'}
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          onClick={seek}
          style={{
            width: '100%', height: '4px',
            background: 'rgba(200,146,42,0.15)',
            borderRadius: '2px', cursor: 'pointer', position: 'relative',
          }}
        >
          <div style={{
            height: '100%', width: `${pct}%`,
            background: 'var(--gold)', borderRadius: '2px',
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...sc, fontSize: '0.75rem', letterSpacing: '0.08em', ...muted }}>{fmt(current)}</span>
          <span style={{ ...sc, fontSize: '0.75rem', letterSpacing: '0.08em', ...muted }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Auth modal ───────────────────────────────────────────────────────────────

function AuthModal({ onDismiss }) {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div
      onClick={e => e.target === e.currentTarget && onDismiss()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,21,35,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
    >
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '36px 32px 28px', maxWidth: '400px', width: '100%' }}>
        <span style={{ display: 'block', ...sc, fontSize: '0.75rem', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '12px' }}>Foundation</span>
        <h2 style={{ ...sc, fontSize: '1.375rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1.2, marginBottom: '10px' }}>Sign in to listen.</h2>
        <p style={{ ...serif, fontSize: '1rem', fontWeight: 300, ...meta, lineHeight: 1.7, marginBottom: '24px' }}>
          Foundation is part of Life OS {'\u2014'} a free account keeps your progress and gives you access to the full protocol.
        </p>
        <a href={`/login.html?redirect=${returnUrl}`} style={{ display: 'block', width: '100%', padding: '14px', textAlign: 'center', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '40px', ...sc, fontSize: '0.9375rem', letterSpacing: '0.16em', ...gold, textDecoration: 'none', marginBottom: '12px' }}>
          Sign in or create account {'\u2192'}
        </a>
        <button onClick={onDismiss} style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, cursor: 'pointer', padding: '4px' }}>
          Not now
        </button>
      </div>
    </div>
  )
}

// ─── Delta display — shown after the after check-in ──────────────────────────

function FlameDelta({ before, after }) {
  const delta  = after - before
  const color  = delta > 0 ? '#5A8AB8' : delta < 0 ? '#8A7030' : 'var(--text-muted)'
  const symbol = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2014'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px',
      padding: '16px 20px',
      background: 'rgba(200,146,42,0.03)',
      border: '1px solid rgba(200,146,42,0.15)',
      borderRadius: '10px',
      marginTop: '16px',
    }}>
      {/* Before */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '0.5rem', letterSpacing: '0.16em', ...muted, marginBottom: '6px' }}>BEFORE</div>
        <FlameGlyph value={before} size={36} ghost />
      </div>

      {/* Arrow + delta */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '1.125rem', color, lineHeight: 1 }}>{symbol}</div>
        <div style={{ ...serif, fontSize: '0.75rem', fontStyle: 'italic', color, marginTop: '4px' }}>
          {delta === 0
            ? 'holding steady'
            : `${Math.abs(delta).toFixed(1)} point${Math.abs(delta) !== 1 ? 's' : ''} ${delta > 0 ? 'up' : 'down'}`}
        </div>
      </div>

      {/* After */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ ...sc, fontSize: '0.5rem', letterSpacing: '0.16em', ...muted, marginBottom: '6px' }}>AFTER</div>
        <FlameGlyph value={after} size={36} />
      </div>
    </div>
  )
}

// ─── Phase block wrapper ──────────────────────────────────────────────────────

function PhaseBlock({ number, name, desc, children }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
        <span style={{ ...sc, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', ...gold, flexShrink: 0 }}>{number}</span>
        <span style={{ ...serif, fontSize: '1.25rem', fontWeight: 300, color: 'var(--text)' }}>{name}</span>
      </div>
      <p style={{ ...serif, fontSize: '1rem', fontWeight: 300, ...meta, lineHeight: 1.75, marginBottom: '20px' }}>{desc}</p>
      {children}
    </div>
  )
}

function PhasePlaceholder({ title }) {
  return (
    <div style={{ background: 'rgba(15,21,35,0.015)', border: '1.5px solid rgba(200,146,42,0.2)', borderRadius: '14px', padding: '24px 28px' }}>
      <span style={{ display: 'block', ...sc, fontSize: '0.75rem', letterSpacing: '0.14em', ...muted, marginBottom: '8px' }}>Coming</span>
      <div style={{ ...serif, fontSize: '1.1875rem', fontWeight: 300, color: 'var(--text-muted)', marginBottom: '6px' }}>{title}</div>
      <p style={{ ...serif, fontSize: '0.875rem', fontStyle: 'italic', ...muted, lineHeight: 1.6 }}>
        This phase unlocks as the protocol develops.
      </p>
    </div>
  )
}

function QuoteBlock({ text, cite }) {
  return (
    <div style={{ borderLeft: '2px solid rgba(200,146,42,0.2)', padding: '16px 0 16px 24px', margin: '40px 0' }}>
      <p style={{ ...serif, fontSize: '1.0625rem', fontStyle: 'italic', fontWeight: 300, ...meta, lineHeight: 1.75, marginBottom: '12px' }}>
        {'\u201C'}{text}{'\u201D'}
      </p>
      <span style={{ ...sc, fontSize: '0.75rem', letterSpacing: '0.12em', ...gold }}>{'\u2014'} {cite}</span>
    </div>
  )
}

// ─── Baseline Player Card — contains the full before/audio/after flow ─────────

function BaselineCard({ user, audioUrl, audioLoading, audioError }) {
  // flow: 'before' | 'listening' | 'after' | 'done'
  const [flow,         setFlow]         = useState('before')
  const [beforeResult, setBeforeResult] = useState(null)
  const [afterResult,  setAfterResult]  = useState(null)
  const [showModal,    setShowModal]    = useState(false)

  function handleBeforeComplete(data) {
    setBeforeResult(data)
    setFlow('listening')
  }

  function handleAfterComplete(data) {
    setAfterResult(data)
    setFlow('done')
  }

  function handleAudioEnded() {
    // Gently prompt to do the after check-in if not already there
    if (flow === 'listening') setFlow('after')
  }

  // Unauth — gate on play click
  if (!user) {
    return (
      <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '28px 28px 24px' }}>
        <span style={{ display: 'block', ...sc, fontSize: '0.75rem', letterSpacing: '0.14em', ...muted, marginBottom: '16px' }}>Guided audio</span>
        <div style={{ ...serif, fontSize: '1.1875rem', fontWeight: 300, color: 'var(--text)', marginBottom: '4px' }}>Foundation {'\u00B7'} Baseline</div>
        <span style={{ display: 'block', ...sc, fontSize: '0.75rem', letterSpacing: '0.1em', ...muted, marginBottom: '22px' }}>20 min {'\u00B7'} Part 1 of 3</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', ...gold, fontSize: '18px' }}>
            {'\u25B6'}
          </button>
          <div style={{ flex: 1, height: '4px', background: 'rgba(200,146,42,0.15)', borderRadius: '2px' }} />
        </div>
        {showModal && <AuthModal onDismiss={() => setShowModal(false)} />}
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '28px 28px 24px' }}>
      <span style={{ display: 'block', ...sc, fontSize: '0.75rem', letterSpacing: '0.14em', ...muted, marginBottom: '16px' }}>Guided audio</span>
      <div style={{ ...serif, fontSize: '1.1875rem', fontWeight: 300, color: 'var(--text)', marginBottom: '4px' }}>Foundation {'\u00B7'} Baseline</div>
      <span style={{ display: 'block', ...sc, fontSize: '0.75rem', letterSpacing: '0.1em', ...muted, marginBottom: '24px' }}>20 min {'\u00B7'} Part 1 of 3</span>

      {/* ── BEFORE ──────────────────────────────────────────────────────── */}
      {flow === 'before' && (
        <div>
          <div style={{ ...sc, fontSize: '0.5625rem', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>
            Before you begin
          </div>
          <FlameCheckIn
            audioPhase="baseline"
            onComplete={handleBeforeComplete}
            onSkip={() => setFlow('listening')}
          />
        </div>
      )}

      {/* ── LISTENING ───────────────────────────────────────────────────── */}
      {flow === 'listening' && (
        <div>
          {beforeResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>
              <FlameGlyph value={beforeResult.afterValue} size={28} />
              <span style={{ ...serif, fontSize: '0.875rem', fontStyle: 'italic', ...muted }}>
                You came in at {'\u2014'} {beforeResult.label || 'noted'}. Now listen.
              </span>
            </div>
          )}

          {audioLoading && (
            <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted }}>Loading audio...</p>
          )}
          {audioError && (
            <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', color: 'rgba(138,48,48,0.7)' }}>{audioError}</p>
          )}
          {!audioLoading && !audioError && audioUrl && (
            <AudioPlayer url={audioUrl} onEnded={handleAudioEnded} />
          )}

          <button
            onClick={() => setFlow('after')}
            style={{
              display: 'block', width: '100%', marginTop: '20px',
              padding: '12px', textAlign: 'center',
              ...sc, fontSize: '0.8125rem', letterSpacing: '0.14em', ...gold,
              background: 'rgba(200,146,42,0.04)',
              border: '1px solid rgba(200,146,42,0.3)',
              borderRadius: '40px', cursor: 'pointer',
            }}
          >
            Check in after {'\u2192'}
          </button>
        </div>
      )}

      {/* ── AFTER ───────────────────────────────────────────────────────── */}
      {flow === 'after' && (
        <div>
          <div style={{ ...sc, fontSize: '0.5625rem', letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(200,146,42,0.1)' }}>
            After the audio
          </div>
          <FlameCheckIn
            audioPhase="baseline"
            onComplete={handleAfterComplete}
            onSkip={() => setFlow('done')}
          />
        </div>
      )}

      {/* ── DONE ────────────────────────────────────────────────────────── */}
      {flow === 'done' && (
        <div>
          {beforeResult && afterResult && (
            <FlameDelta before={beforeResult.afterValue} after={afterResult.afterValue} />
          )}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ ...serif, fontSize: '0.9375rem', fontStyle: 'italic', ...muted, lineHeight: 1.75, marginBottom: '16px' }}>
              {afterResult && afterResult.afterValue > (beforeResult?.afterValue ?? 5)
                ? 'The audio did something. That\'s the data.'
                : afterResult && afterResult.afterValue < (beforeResult?.afterValue ?? 5)
                ? 'Honest is what matters here. The pattern shows over time.'
                : 'The ground holds even when nothing shifts. That\'s sometimes the work.'}
            </p>
            <button
              onClick={() => { setFlow('before'); setBeforeResult(null); setAfterResult(null) }}
              style={{ ...sc, fontSize: '0.75rem', letterSpacing: '0.12em', ...gold, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Listen again {'\u2192'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Foundation page ─────────────────────────────────────────────────────

export function FoundationPage() {
  const { user, loading: authLoading } = useAuth()
  const [audioUrl,     setAudioUrl]    = useState(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError,   setAudioError]  = useState(null)

  useEffect(() => {
    if (!user) return
    setAudioLoading(true)
    try {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(AUDIO_FILE)
      if (data?.publicUrl) {
        setAudioUrl(data.publicUrl)
      } else {
        setAudioError('Unable to load audio. Please try again shortly.')
      }
    } catch {
      setAudioError('Something went wrong. Please refresh the page.')
    } finally {
      setAudioLoading(false)
    }
  }, [user])

  if (authLoading) return <div className="loading" />

  return (
    <div className="page-shell">
      <Nav activePath="life-os" />

      <div className="tool-wrap">
        {/* Header */}
        <div className="tool-header">
          <span className="tool-eyebrow">Life OS {'\u00B7'} Foundation</span>
          <h1 style={{
            ...serif,
            fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)',
            fontWeight: 300, color: 'var(--text)',
            lineHeight: 1.06, letterSpacing: '-0.01em',
            marginBottom: '16px',
          }}>
            The layer beneath<br />
            <em style={{ ...gold }}>everything else.</em>
          </h1>
          <p style={{ ...serif, fontSize: '1.0625rem', fontWeight: 300, fontStyle: 'italic', ...meta, lineHeight: 1.65, maxWidth: '480px' }}>
            Most frameworks begin after baseline stability is already online. Foundation builds it.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', margin: '40px 0' }} />

        {/* Phase 1 — Baseline (live with flame check-in) */}
        <PhaseBlock
          number="Phase 1"
          name="Baseline"
          desc="Regulated internal stability — the floor you stand on. Check in before and after to track what the audio actually does to your system."
        >
          <BaselineCard
            user={user}
            audioUrl={audioUrl}
            audioLoading={audioLoading}
            audioError={audioError}
          />
        </PhaseBlock>

        {/* Phase 2 + 3 placeholders */}
        <PhaseBlock
          number="Phase 2"
          name="Calibrating"
          desc="Agency, temporal clarity, and directional awareness — the heading you face. Complete Baseline first."
        >
          <PhasePlaceholder title="Foundation \u00B7 Calibrating" />
        </PhaseBlock>

        <PhaseBlock
          number="Phase 3"
          name="Embodying"
          desc="Action from the Horizon orientation — the accomplished, resourced stance you act from. The completion of the cycle."
        >
          <PhasePlaceholder title="Foundation \u00B7 Embodying" />
        </PhaseBlock>

        {/* Quotes */}
        <QuoteBlock
          text="It has helped me reset my baseline in the middle of the day — to relax, let go, and create space for a more supportive inner story. One that naturally inspires aligned action rather than effort or striving."
          cite="David William Pierce"
        />
        <QuoteBlock
          text="There was this sense of feeling held throughout. His presence is unmistakably there."
          cite="David William Pierce"
        />

        {/* How to use */}
        <div style={{ background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', borderRadius: '14px', padding: '24px 28px', marginTop: '48px' }}>
          <span style={{ display: 'block', ...sc, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', ...gold, textTransform: 'uppercase', marginBottom: '10px' }}>How to use this</span>
          <p style={{ ...serif, fontSize: '1rem', fontWeight: 300, ...meta, lineHeight: 1.75 }}>
            Return to Baseline as often as you need it {'\u2014'} morning, midday, or whenever the ground feels unsteady. The before and after check-ins are optional but the data compounds. Over time you{'\u2019'}ll see what the audio actually does to your system, consistently, across weeks and months.
          </p>
        </div>
      </div>
    </div>
  )
}
