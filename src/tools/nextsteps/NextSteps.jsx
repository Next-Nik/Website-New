// NEXTUS: NEXTSTEPS — The Navigation Tool
// src/tools/nextsteps/NextSteps.jsx
//
// The five phases of NextSteps run inside this one route. Phases:
//   1. Arrival         — one warm orienting line, one open input
//   2. Reflection      — the three-beat reframe runs (or board-mirror for diffuse)
//   3. Domain Landing  — toward-sentence anchored in domain, Horizon Goal,
//                        "not first, not alone" signal; Track created here
//   4. Path            — 2–3 ordered Steps, each routable
//   5. Loop            — the returning surface: existing tracks, advancement
//
// The phase the person lands in depends on:
//   - No tracks for this user        → Phase 1 (Arrival)
//   - One or more tracks exist       → Phase 5 (Loop) with option to start new
//   - A specific track in URL state  → that track's current phase (3, 4, or 5)
//
// (Foundation: docs/NextSteps_Conceptual_Foundation_v1_1.md)

import { useState, useEffect } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'
import { ArrivalReflection } from './phases/ArrivalReflection'
import { DomainLanding } from './phases/DomainLanding'
import { PathView } from './phases/PathView'
import { TrackLoop } from './phases/TrackLoop'
import { serif, body, sc } from '../../lib/designTokens'

export function NextStepsPage() {
  const { user, loading } = useAuth()

  // Phase machine state
  // 'loading'       — figuring out where to land
  // 'arrival'       — Phase 1+2 conversation (the ArrivalReflection component
  //                   handles both internally; reflection lands when the
  //                   structured payload arrives)
  // 'landing'       — Phase 3, after a fresh Reflection
  // 'path'          — Phase 4, viewing or generating the path
  // 'loop'          — Phase 5, the returning surface
  const [phase, setPhase] = useState('loading')

  // The active Track (when in Phase 3, 4, or returning to one from Phase 5)
  const [activeTrack, setActiveTrack] = useState(null)

  // All the user's Tracks (drives the Loop view)
  const [tracks, setTracks] = useState([])

  // Initial routing: where does this person land?
  useEffect(() => {
    if (loading) return
    if (!user) {
      // Unauthenticated: jump into Arrival anyway. NextSteps is meant to be
      // approachable to the no-form-no-function person; we'll prompt for
      // sign-up at Track-creation time.
      setPhase('arrival')
      return
    }
    loadTracks()
  }, [user, loading])

  async function loadTracks() {
    try {
      const res = await fetch(`/api/nextsteps-track?userId=${user.id}`)
      if (!res.ok) throw new Error(`load tracks ${res.status}`)
      const { tracks: list } = await res.json()
      setTracks(list || [])
      // If the user has tracks, land in the Loop. Otherwise, Arrival.
      if (list && list.length > 0) {
        setPhase('loop')
      } else {
        setPhase('arrival')
      }
    } catch (err) {
      console.error('NextSteps loadTracks error:', err)
      setPhase('arrival')
    }
  }

  // Called by ArrivalReflection when the Reflection lands (Phase 2 complete).
  // Creates the Track and advances to Phase 3 (Domain Landing).
  async function handleReflectionLanding(reflection, originalConcern) {
    if (!user) {
      // Unauthenticated user — kick to login with a return-to.
      // Better: hold the reflection in session and replay after auth.
      // For now, save to sessionStorage and route to login.
      sessionStorage.setItem(
        'nextsteps_pending_reflection',
        JSON.stringify({ reflection, originalConcern })
      )
      window.location.href = `${ROUTES.login}?next=${encodeURIComponent('/tools/nextsteps')}`
      return
    }

    try {
      const res = await fetch('/api/nextsteps-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          original_concern: originalConcern,
          toward_sentence: reflection.toward_sentence,
          domains: reflection.domains,
          scale: reflection.scale,
          problem_chains: reflection.problem_chains || [],
        }),
      })
      if (!res.ok) throw new Error(`create track ${res.status}`)
      const { track } = await res.json()

      // Attach the reframe_text to the in-memory track for the Domain
      // Landing screen to show (we don't persist reframe_text on the
      // Track table; it lives in the chat transcript).
      setActiveTrack({ ...track, _reframe_text: reflection.reframe_text, _closing: reflection.closing })
      setPhase('landing')
    } catch (err) {
      console.error('NextSteps reflection landing error:', err)
      alert('Something went wrong creating your track. Please try again.')
    }
  }

  // Phase 3 → Phase 4: user accepts the domain landing, we generate the path.
  async function handleAcceptLanding() {
    if (!activeTrack) return
    setPhase('path')
  }

  // Phase 5 → Phase 3/4: user opens an existing track from the Loop.
  async function handleOpenTrack(trackId) {
    try {
      const res = await fetch(`/api/nextsteps-track?id=${trackId}`)
      if (!res.ok) throw new Error(`open track ${res.status}`)
      const { track, steps } = await res.json()
      setActiveTrack({ ...track, _steps: steps })
      // If the track has steps, go to path view. Otherwise it's still planning.
      setPhase(steps && steps.length > 0 ? 'path' : 'landing')
    } catch (err) {
      console.error('NextSteps open track error:', err)
    }
  }

  // Phase 5: user wants to start a new track.
  function handleStartNew() {
    setActiveTrack(null)
    setPhase('arrival')
  }

  // Back to Loop from a Track view.
  async function handleBackToLoop() {
    setActiveTrack(null)
    await loadTracks()
    setPhase('loop')
  }

  if (loading || phase === 'loading') {
    return (
      <div className="page-shell">
        <Nav activePath="nextsteps" />
        <div style={{ padding: '80px 24px', textAlign: 'center', ...body, color: 'rgba(15,21,35,0.72)' }}>
          Finding your bearings…
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Nav activePath="nextsteps" />

      <NextStepsHeader phase={phase} hasOtherTracks={tracks.length > 0} onBackToLoop={handleBackToLoop} />

      <div className={`nextsteps-stage${phase === 'arrival' ? ' nextsteps-stage--chat' : ''}`}>
        {phase === 'arrival' && (
          <ArrivalReflection
            user={user}
            onReflectionLanded={handleReflectionLanding}
          />
        )}

        {phase === 'landing' && activeTrack && (
          <DomainLanding
            track={activeTrack}
            onAccept={handleAcceptLanding}
          />
        )}

        {phase === 'path' && activeTrack && (
          <PathView
            track={activeTrack}
            user={user}
            onBackToLoop={handleBackToLoop}
          />
        )}

        {phase === 'loop' && (
          <TrackLoop
            tracks={tracks}
            onOpenTrack={handleOpenTrack}
            onStartNew={handleStartNew}
          />
        )}
      </div>

      <style>{`
        .nextsteps-stage {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 24px 96px;
        }
        .nextsteps-stage--chat {
          max-width: 100%;
          padding: 0;
        }
        .ns-header {
          max-width: 720px;
          margin: 0 auto;
          padding: 56px 24px 0;
        }
        .ns-eyebrow {
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          color: #A8721A;
          text-transform: uppercase;
        }
        .ns-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 2.75rem;
          font-weight: 400;
          color: #0F1523;
          margin: 6px 0 0;
          letter-spacing: -0.01em;
        }
        .ns-subtitle {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.05rem;
          font-weight: 300;
          color: rgba(15,21,35,0.78);
          line-height: 1.6;
          margin: 14px 0 0;
          max-width: 520px;
        }
        .ns-back {
          background: none;
          border: none;
          color: #A8721A;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.78rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 0;
          margin-bottom: 18px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ns-back:hover { text-decoration: underline; }
        @media (max-width: 640px) {
          .ns-title { font-size: 2.1rem; }
          .ns-subtitle { font-size: 0.98rem; }
          .nextsteps-stage { padding: 24px 18px 80px; }
          .ns-header { padding: 36px 18px 0; }
        }
      `}</style>
    </div>
  )
}

function NextStepsHeader({ phase, hasOtherTracks, onBackToLoop }) {
  const showBack =
    hasOtherTracks && (phase === 'arrival' || phase === 'landing' || phase === 'path')

  // On arrival the conversation IS the entry point — no header narration.
  if (phase === 'arrival') {
    return showBack ? (
      <div className="ns-header ns-header--minimal">
        <button className="ns-back" onClick={onBackToLoop} type="button">
          ← Your tracks
        </button>
      </div>
    ) : null
  }

  return (
    <div className="ns-header">
      {showBack && (
        <button className="ns-back" onClick={onBackToLoop} type="button">
          ← Your tracks
        </button>
      )}
      <p className="ns-subtitle">
        {phase === 'landing' && 'Here is what your caring is for.'}
        {phase === 'path'    && 'Your path. Short, ordered, real.'}
        {phase === 'loop'    && "The work you're walking."}
      </p>
    </div>
  )
}
