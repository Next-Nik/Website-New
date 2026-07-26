// NEXTUS: NEXTSTEPS — The Path Tool
// src/tools/nextsteps/NextSteps.jsx
//
// "NextSteps is the tool that turns caring into a path."
// (Foundation: docs/NextSteps_Conceptual_Foundation_v2_0_1.md)
//
// ─── A NOTE ON THE WORD "PHASE" ──────────────────────────────────────────────
// In v2.0 "phase" became a load-bearing domain object: one node in the ordered
// ROUTE between a person's Now and their Horizon, defined by its exit condition
// and never by time. This file used to call its own screens "phases" too, which
// would now collide with the real thing in every file and every conversation.
// The screens are STAGES, and they live in ./stages/. Phase means the route
// object and nothing else.
// ─────────────────────────────────────────────────────────────────────────────
//
// The stages, all inside this one route:
//   1. Arrival     — one warm orienting line, one open input
//   2. Reflection  — the three-beat reframe runs (or board-mirror for diffuse)
//   3. Landing     — toward-sentence anchored in a domain; the Track is created
//   4. Route       — the AI drafts the phases; the PERSON ratifies them
//   5. Path        — the steps inside the current phase; the walking
//   6. Loop        — the returning surface: your tracks, advanced
//
// Stage 4 is new in v2.0 and it is the one that closes the handstand gap. The
// platform already knew the Horizon, the Now, and the next step, and had
// nothing to say about the middle. The route is the middle.

import { useState, useEffect } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'
import { ArrivalReflection } from './stages/ArrivalReflection'
import { DomainLanding } from './stages/DomainLanding'
import { RouteDraft } from './stages/RouteDraft'
import { PathView } from './stages/PathView'
import { TrackLoop } from './stages/TrackLoop'
import { serif, body, sc } from '../../lib/designTokens'
import { authedFetch } from '../../lib/actorCallsClient'

export function NextStepsPage() {
  const { user, loading } = useAuth()

  // Stage machine:
  //   'loading'  — figuring out where to land
  //   'arrival'  — the conversation (arrival + reflection are one component)
  //   'landing'  — the domain landing, after a fresh Reflection
  //   'route'    — the drafted route, awaiting the person's ratification
  //   'path'     — the steps inside the current phase
  //   'loop'     — the returning surface
  const [stage, setStage] = useState('loading')

  const [activeTrack, setActiveTrack] = useState(null)
  const [phases, setPhases] = useState([])
  const [routeNote, setRouteNote] = useState(null)
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState(null)
  // Arrival failures need their own slot. draftError is only rendered on the
  // route stage, so routing an arrival failure into it left the person on a
  // dead screen with nothing said.
  const [arrivalError, setArrivalError] = useState(null)
  const [tracks, setTracks] = useState([])

  useEffect(() => {
    if (loading) return
    if (!user) {
      // Unauthenticated: jump into Arrival anyway. NextSteps is meant to be
      // approachable to the no-form-no-function person; we prompt for sign-up
      // at Track-creation time.
      setStage('arrival')
      return
    }
    loadTracks()
  }, [user, loading])

  async function loadTracks() {
    try {
      const res = await authedFetch('/api/nextsteps-track')
      if (!res.ok) throw new Error(`load tracks ${res.status}`)
      const { tracks: list } = await res.json()
      setTracks(list || [])
      setStage(list && list.length > 0 ? 'loop' : 'arrival')
    } catch (err) {
      console.error('NextSteps loadTracks error:', err)
      setStage('arrival')
    }
  }

  // Reflection landed (stage 2 complete). Create the Track, go to the Landing.
  async function handleReflectionLanding(reflection, originalConcern) {
    if (!user) {
      sessionStorage.setItem(
        'nextsteps_pending_reflection',
        JSON.stringify({ reflection, originalConcern })
      )
      window.location.href = `${ROUTES.login}?next=${encodeURIComponent('/tools/nextsteps')}`
      return
    }

    try {
      const res = await authedFetch('/api/nextsteps-track', {
        method: 'POST',
        body: JSON.stringify({
          original_concern: originalConcern,
          toward_sentence: reflection.toward_sentence,
          domains: reflection.domains,
          scale: reflection.scale,
          problem_chains: reflection.problem_chains || [],
          chain_gap: reflection.chain_gap === true,
          concern_shape: reflection.concern_shape || null,
        }),
      })
      if (!res.ok) throw new Error(`create track ${res.status}`)
      const { track } = await res.json()

      setActiveTrack({ ...track, _reframe_text: reflection.reframe_text, _closing: reflection.closing })
      setPhases([])
      setStage('landing')
    } catch (err) {
      console.error('NextSteps reflection landing error:', err)
      // This used to write to draftError, which is only ever rendered on the
      // route stage. The person sat on the arrival screen with a disabled
      // composer, no track, and nothing on screen saying anything had gone
      // wrong. Arrival needs its own visible failure.
      setArrivalError(
        'I could not save that just now. Nothing you wrote is lost. Try again in a moment.'
      )
    }
  }

  // Landing → Route. The drafting act (§2.5). What comes back is explicitly a
  // proposal: nothing is current, and nothing is theirs, until they ratify it.
  async function handleAcceptLanding() {
    if (!activeTrack) return
    setStage('route')
    await draftRoute(activeTrack.id)
  }

  async function draftRoute(trackId) {
    setDrafting(true)
    setDraftError(null)
    try {
      const res = await authedFetch('/api/nextsteps-route-draft', {
        method: 'POST',
        body: JSON.stringify({ track_id: trackId }),
      })
      const data = await res.json()
      if (!res.ok) {
        // A route whose exit conditions did not come out checkable is refused,
        // not softened. Better a retry than a phase that ends on a feeling.
        throw new Error(data.error || 'Could not sketch the route.')
      }
      setPhases(data.phases || [])
      setRouteNote(data.route_note || null)
    } catch (err) {
      console.error('NextSteps draftRoute error:', err)
      setDraftError(err.message || 'Could not sketch the route.')
    } finally {
      setDrafting(false)
    }
  }

  // Retrofit: a track that already has steps and no route asks for one. Same
  // drafting act, entered from the walking surface instead of the landing. This
  // is the door for anyone who used NextSteps before the route layer existed,
  // and for anyone who is already well past the point in the order of
  // operations where this tool nominally sits.
  async function handleSketchRoute() {
    if (!activeTrack) return
    setStage('route')
    await draftRoute(activeTrack.id)
  }

  // Ratified. The route is the person's own artifact from here on.
  function handleRatified(ratifiedPhases) {
    setPhases(ratifiedPhases || [])
    setActiveTrack((t) => (t ? { ...t, route_state: 'ratified', _steps: [] } : t))
    setStage('path')
  }

  // Loop → an existing Track. Where it lands depends on how far the route got.
  async function handleOpenTrack(trackId) {
    try {
      const res = await authedFetch(`/api/nextsteps-track?id=${trackId}`)
      if (!res.ok) throw new Error(`open track ${res.status}`)
      const { track, phases: trackPhases, steps } = await res.json()
      setActiveTrack({ ...track, _steps: steps || [] })
      setPhases(trackPhases || [])
      setRouteNote(null)
      // A failure carried over from a DIFFERENT track used to survive this
      // navigation, and because the error panel suppresses the RouteDraft
      // branch, the person landed on a stale error over a route they had
      // already edited. Its only button was "Try again", which redrafts, and
      // redrafting deletes every phase they had rewritten. Their own words,
      // destroyed by a button offering to retry something they never did here.
      setDraftError(null)

      if (track.route_state === 'ratified') {
        setStage('path')
      } else if (track.route_state === 'drafted' && (trackPhases || []).length > 0) {
        // A draft they never ratified. It comes back as a draft, because an
        // unratified route is a suggestion and has to keep saying so.
        setStage('route')
      } else if (steps && steps.length > 0) {
        // A track from before the route layer. It keeps working exactly as it
        // did, with its steps intact and no route.
        setStage('path')
      } else {
        setStage('landing')
      }
    } catch (err) {
      console.error('NextSteps open track error:', err)
    }
  }

  function handleStartNew() {
    setActiveTrack(null)
    setPhases([])
    setRouteNote(null)
    setDraftError(null)
    setArrivalError(null)
    setStage('arrival')
  }

  async function handleBackToLoop() {
    setActiveTrack(null)
    setPhases([])
    setRouteNote(null)
    setDraftError(null)
    setArrivalError(null)
    await loadTracks()
    setStage('loop')
  }

  if (loading || stage === 'loading') {
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
    <div className="page-shell" style={{ background: '#FAFAF7', minHeight: '100dvh' }}>
      <Nav activePath="nextsteps" />

      <NextStepsHeader stage={stage} hasOtherTracks={tracks.length > 0} onBackToLoop={handleBackToLoop} />

      <div className={`nextsteps-stage${stage === 'arrival' ? ' nextsteps-stage--chat' : ''}`}>
        {stage === 'arrival' && (
          <>
            {arrivalError && (
              <div className="ns-arrival-error">
                <p className="ns-draft-fail-text">{arrivalError}</p>
                <button
                  type="button"
                  className="ns-draft-retry"
                  onClick={() => { setArrivalError(null); window.location.reload() }}
                >
                  Start again
                </button>
              </div>
            )}
            <ArrivalReflection
              user={user}
              onReflectionLanded={handleReflectionLanding}
            />
          </>
        )}

        {stage === 'landing' && activeTrack && (
          <DomainLanding
            track={activeTrack}
            onAccept={handleAcceptLanding}
          />
        )}

        {stage === 'route' && activeTrack && (
          <>
            {drafting && (
              <p className="ns-drafting">
                Sketching the stages between where you are and where you said you are going…
              </p>
            )}

            {!drafting && draftError && (
              <div className="ns-draft-fail">
                <p className="ns-draft-fail-text">{draftError}</p>
                <button type="button" className="ns-draft-retry" onClick={() => draftRoute(activeTrack.id)}>
                  Try again
                </button>
              </div>
            )}

            {!drafting && !draftError && phases.length > 0 && (
              <RouteDraft
                track={activeTrack}
                phases={phases}
                routeNote={routeNote}
                onRatified={handleRatified}
                onBack={tracks.length > 0 ? handleBackToLoop : null}
              />
            )}
          </>
        )}

        {stage === 'path' && activeTrack && (
          <PathView
            track={activeTrack}
            user={user}
            phases={phases}
            onPhasesChanged={setPhases}
            onSketchRoute={handleSketchRoute}
            onBackToLoop={handleBackToLoop}
          />
        )}

        {stage === 'loop' && (
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
          color: #262420;
          text-transform: uppercase;
        }
        .ns-title {
          font-family: 'Lora', Georgia, serif;
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
          color: #262420;
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
        .ns-drafting {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.05rem;
          line-height: 1.6;
          color: rgba(38,36,32,0.68);
          text-align: center;
          padding: 60px 0;
          margin: 0;
        }
        .ns-draft-fail { padding: 32px 0; text-align: center; }
        .ns-arrival-error {
          max-width: 720px;
          margin: 0 auto;
          padding: 20px 24px;
          text-align: center;
        }
        .ns-draft-fail-text {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.02rem;
          line-height: 1.6;
          color: rgba(38,36,32,0.78);
          margin: 0 0 18px;
        }
        .ns-draft-retry {
          background: #4c6b45;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          font-family: 'Cormorant SC', Georgia, serif;
          font-size: 0.85rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
        }
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

function NextStepsHeader({ stage, hasOtherTracks, onBackToLoop }) {
  const showBack =
    hasOtherTracks &&
    (stage === 'arrival' || stage === 'landing' || stage === 'route' || stage === 'path')

  // On arrival the conversation IS the entry point — no header narration.
  if (stage === 'arrival') {
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
        {stage === 'landing' && 'Here is what your caring is for.'}
        {stage === 'route'   && 'The whole journey, on one page. Yours to change.'}
        {stage === 'path'    && 'The stage you are in, and the work inside it.'}
        {stage === 'loop'    && "The work you're walking."}
      </p>
    </div>
  )
}
