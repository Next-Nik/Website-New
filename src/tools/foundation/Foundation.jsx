import { useState, useRef, useEffect } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'

const AUDIO_FILE = 'foundation-baseline.mp3'
const BUCKET     = 'nextus-audio'

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ url }) {
  const audioRef              = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const a = new Audio(url)
    a.preload = 'metadata'
    audioRef.current = a

    a.addEventListener('loadedmetadata', () => setDuration(a.duration))
    a.addEventListener('timeupdate',     () => setCurrent(a.currentTime))
    a.addEventListener('ended', () => {
      setPlaying(false)
      setCurrent(0)
      a.currentTime = 0
    })

    return () => {
      a.pause()
      a.src = ''
    }
  }, [url])

  function fmt(s) {
    if (!s || isNaN(s)) return '--:--'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.play(); setPlaying(true) }
    else          { a.pause(); setPlaying(false) }
  }

  function seek(e) {
    const a = audioRef.current
    if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {/* Play/pause button */}
      <button
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          width: '48px', height: '48px',
          borderRadius: '50%',
          background: 'rgba(200,146,42,0.05)',
          border: '1.5px solid rgba(200,146,42,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          color: 'var(--gold-dk)', fontSize: '16px',
          transition: 'all 0.2s',
        }}
      >
        {playing ? '\u23F8' : '\u25B6'}
      </button>

      {/* Progress */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          onClick={seek}
          style={{
            width: '100%', height: '4px',
            background: 'rgba(200,146,42,0.15)',
            borderRadius: '2px', cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--gold)',
            borderRadius: '2px',
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            {fmt(current)}
          </span>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            {fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Unauth Player ────────────────────────────────────────────────────────────

function UnauthPlayer({ onPlay }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <button
        onClick={onPlay}
        aria-label="Listen"
        style={{
          width: '48px', height: '48px',
          borderRadius: '50%',
          background: 'rgba(200,146,42,0.05)',
          border: '1.5px solid rgba(200,146,42,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          color: 'var(--gold-dk)', fontSize: '16px',
          transition: 'all 0.2s',
        }}
      >
        {'\u25B6'}
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{
          width: '100%', height: '4px',
          background: 'rgba(200,146,42,0.15)',
          borderRadius: '2px',
        }}>
          <div style={{ width: '0%', height: '100%', background: 'var(--gold)', borderRadius: '2px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>0:00</span>
          <span style={{ fontFamily: 'var(--font-sc)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>20:00</span>
        </div>
      </div>
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onDismiss }) {
  const returnUrl = encodeURIComponent(window.location.href)
  return (
    <div
      onClick={e => e.target === e.currentTarget && onDismiss()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,21,35,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'fadeUp 0.2s ease',
      }}
    >
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid rgba(200,146,42,0.78)',
        borderRadius: '14px',
        padding: '36px 32px 28px',
        maxWidth: '400px', width: '100%',
      }}>
        <span style={{
          display: 'block',
          fontFamily: 'var(--font-sc)', fontSize: '0.75rem',
          letterSpacing: '0.2em', color: 'var(--gold-dk)',
          textTransform: 'uppercase', marginBottom: '12px',
        }}>Foundation</span>
        <h2 style={{
          fontFamily: 'var(--font-sc)', fontSize: '1.375rem',
          fontWeight: 400, color: 'var(--text)',
          lineHeight: 1.2, marginBottom: '10px',
        }}>Sign in to listen.</h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '1rem',
          fontWeight: 300, color: 'var(--text-meta)',
          lineHeight: 1.7, marginBottom: '24px',
        }}>
          Foundation is part of Life OS {'\u2014'} a free account keeps your progress and gives you access to the full protocol.
        </p>
        <a
          href={`/login.html?redirect=${returnUrl}`}
          style={{
            display: 'block', width: '100%',
            padding: '14px', textAlign: 'center',
            background: 'rgba(200,146,42,0.05)',
            border: '1.5px solid rgba(200,146,42,0.78)',
            borderRadius: '40px',
            fontFamily: 'var(--font-sc)', fontSize: '0.9375rem',
            letterSpacing: '0.16em', color: 'var(--gold-dk)',
            textDecoration: 'none', marginBottom: '12px',
            display: 'block',
          }}
        >
          Sign in or create account {'\u2192'}
        </a>
        <button
          onClick={onDismiss}
          style={{
            display: 'block', width: '100%',
            textAlign: 'center', background: 'none', border: 'none',
            fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
            fontStyle: 'italic', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '4px',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}

// ─── Player Card ──────────────────────────────────────────────────────────────

function PlayerCard({ user, audioUrl, loading, error }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid rgba(200,146,42,0.78)',
      borderRadius: '14px',
      padding: '28px 28px 24px',
      marginBottom: '8px',
    }}>
      <span style={{
        display: 'block',
        fontFamily: 'var(--font-sc)', fontSize: '0.75rem',
        letterSpacing: '0.14em', color: 'var(--text-meta)',
        marginBottom: '16px',
      }}>Guided audio</span>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.1875rem', fontWeight: 300, color: 'var(--text)', marginBottom: '4px' }}>
        Foundation {'\u00B7'} Baseline
      </div>
      <span style={{
        display: 'block',
        fontFamily: 'var(--font-sc)', fontSize: '0.75rem',
        letterSpacing: '0.1em', color: 'var(--text-muted)',
        marginBottom: '22px',
      }}>20 min {'\u00B7'} Part 1 of 3</span>

      {loading && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
          Loading...
        </p>
      )}
      {error && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9375rem', fontStyle: 'italic', color: 'rgba(138,48,48,0.7)' }}>
          {error}
        </p>
      )}
      {!loading && !error && user && audioUrl && (
        <AudioPlayer url={audioUrl} />
      )}
      {!loading && !error && !user && (
        <>
          <UnauthPlayer onPlay={() => setShowModal(true)} />
          {showModal && <AuthModal onDismiss={() => setShowModal(false)} />}
        </>
      )}
    </div>
  )
}

// ─── Phase Block ──────────────────────────────────────────────────────────────

function PhaseBlock({ number, name, desc, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <span style={{
          fontFamily: 'var(--font-sc)', fontSize: '0.75rem',
          fontWeight: 600, letterSpacing: '0.2em',
          color: 'var(--gold-dk)', flexShrink: 0,
        }}>{number}</span>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '1.25rem',
          fontWeight: 300, color: 'var(--text)',
        }}>{name}</span>
      </div>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '1rem',
        fontWeight: 300, color: 'var(--text-meta)',
        lineHeight: 1.75, marginBottom: '20px',
      }}>{desc}</p>
      {children}
    </div>
  )
}

function PhasePlaceholder({ title }) {
  return (
    <div style={{
      background: 'rgba(15,21,35,0.015)',
      border: '1.5px solid rgba(200,146,42,0.2)',
      borderRadius: '14px',
      padding: '24px 28px',
    }}>
      <span style={{
        display: 'block',
        fontFamily: 'var(--font-sc)', fontSize: '0.75rem',
        letterSpacing: '0.14em', color: 'var(--text-muted)',
        marginBottom: '8px',
      }}>Coming</span>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.1875rem', fontWeight: 300, color: 'var(--text-muted)', marginBottom: '6px' }}>
        {title}
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        This phase unlocks as the protocol develops. Return here when it{'\u2019'}s ready.
      </p>
    </div>
  )
}

function QuoteBlock({ text, cite }) {
  return (
    <div style={{
      borderLeft: '2px solid rgba(200,146,42,0.2)',
      padding: '16px 0 16px 24px',
      margin: '40px 0',
    }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '1.0625rem',
        fontStyle: 'italic', fontWeight: 300,
        color: 'var(--text-meta)', lineHeight: 1.75,
        marginBottom: '12px',
      }}>{'\u201C'}{text}{'\u201D'}</p>
      <span style={{
        fontFamily: 'var(--font-sc)', fontSize: '0.75rem',
        letterSpacing: '0.12em', color: 'var(--gold-dk)',
      }}>{'\u2014'} {cite}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FoundationPage() {
  const { user, loading: authLoading } = useAuth()
  const [audioUrl,      setAudioUrl]   = useState(null)
  const [audioLoading,  setAudioLoading] = useState(false)
  const [audioError,    setAudioError]  = useState(null)

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
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)',
            fontWeight: 300, color: 'var(--text)',
            lineHeight: 1.06, letterSpacing: '-0.01em',
            marginBottom: '16px',
          }}>
            The layer beneath<br />
            <em style={{ color: 'var(--gold-dk)' }}>everything else.</em>
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '1.0625rem',
            fontWeight: 300, fontStyle: 'italic',
            color: 'var(--text-meta)', lineHeight: 1.65,
            maxWidth: '480px',
          }}>
            Most frameworks begin after baseline stability is already online. Foundation builds it.
          </p>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(200,146,42,0.2)', margin: '40px 0' }} />

        {/* Phase 1 — Baseline (live) */}
        <PhaseBlock
          number="Phase 1"
          name="Baseline"
          desc="Regulated internal stability — the floor you stand on. If everything feels like too much, or like nothing is landing, this is where you start."
        >
          <PlayerCard
            user={user}
            audioUrl={audioUrl}
            loading={audioLoading}
            error={audioError}
          />
        </PhaseBlock>

        {/* Phase 2 — Calibrating (placeholder) */}
        <PhaseBlock
          number="Phase 2"
          name="Calibrating"
          desc="Agency, temporal clarity, and directional awareness — the heading you face. Complete Baseline first."
        >
          <PhasePlaceholder title="Foundation · Calibrating" />
        </PhaseBlock>

        {/* Phase 3 — Embodying (placeholder) */}
        <PhaseBlock
          number="Phase 3"
          name="Embodying"
          desc="Action from the Horizon orientation — the accomplished, resourced stance you act from. The completion of the cycle."
        >
          <PhasePlaceholder title="Foundation · Embodying" />
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

        {/* Protocol note */}
        <div style={{
          background: 'rgba(200,146,42,0.05)',
          border: '1.5px solid rgba(200,146,42,0.78)',
          borderRadius: '14px',
          padding: '24px 28px',
          marginTop: '48px',
        }}>
          <span style={{
            display: 'block',
            fontFamily: 'var(--font-sc)', fontSize: '0.75rem',
            fontWeight: 600, letterSpacing: '0.2em',
            color: 'var(--gold-dk)', textTransform: 'uppercase',
            marginBottom: '10px',
          }}>How to use this</span>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '1rem',
            fontWeight: 300, color: 'var(--text-meta)', lineHeight: 1.75,
          }}>
            Return to Baseline as often as you need it {'\u2014'} morning, midday, or whenever the ground feels unsteady. The phases are sequential but revisitable. Someone may complete all three and return to Baseline during periods of high stress. The protocol trains access and re-entry, not permanent residence.
          </p>
        </div>
      </div>
    </div>
  )
}
