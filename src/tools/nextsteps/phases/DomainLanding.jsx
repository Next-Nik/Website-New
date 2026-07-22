// NextSteps — Phase 3 (Domain Landing)
// src/tools/nextsteps/phases/DomainLanding.jsx
//
// Shows the completed toward-sentence anchored in its domain, with the
// domain's Horizon Goal and the "not first, not alone" signal. This is
// where the person feels: not first, not alone — others are already
// building here.

import { useState, useEffect } from 'react'

const DOMAIN_LABELS = {
  human:       'Human Being',
  society:     'Society',
  nature:      'Nature',
  tech:        'Technology',
  finance:     'Economy',
  legacy:      'Legacy',
  vision:      'Vision',
  // self side
  path:        'Path',
  spark:       'Spark',
  body:        'Body',
  finances:    'Finances',
  connection:  'Connection',
  'inner-game':'Inner Game',
  signal:      'Signal',
}

const DOMAIN_COLOURS = {
  human:    '#262420',
  society:  '#5B8C5A',
  nature:   '#6B8E4E',
  tech:     '#4A6F8A',
  finance:  '#8A6F4A',
  legacy:   '#7B5E8E',
  vision:   '#8E5E7B',
  // self side — mirror tones
  path:     '#262420',
  spark:    '#4c6b45',
  body:     '#6B8E4E',
  finances: '#8A6F4A',
  connection: '#5B8C5A',
  'inner-game': '#7B5E8E',
  signal:   '#4A6F8A',
}

export function DomainLanding({ track, onAccept }) {
  const [actors, setActors] = useState([])
  const [loadingActors, setLoadingActors] = useState(true)
  const primaryDomain = (track.domains && track.domains[0]) || null

  useEffect(() => {
    if (!primaryDomain) {
      setLoadingActors(false)
      return
    }
    // Fetch a small sample of Atlas actors in this domain for the
    // "people are already building here" signal. Best-effort — if the
    // Atlas RPC fails or is empty, we render a graceful fallback.
    loadActorSample()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryDomain])

  async function loadActorSample() {
    try {
      // Pass both the primary domain AND the Track's problem_chains so
      // the sample is chain-aware where possible.
      const res = await fetch('/api/nextsteps-actors-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: primaryDomain,
          problem_chains: track.problem_chains || [],
          limit: 3,
        }),
      })
      if (res.ok) {
        const { actors: list } = await res.json()
        setActors(list || [])
      }
    } catch (err) {
      console.error('NextSteps actor sample error:', err)
    } finally {
      setLoadingActors(false)
    }
  }

  const colour = DOMAIN_COLOURS[primaryDomain] || '#262420'

  return (
    <div className="ns-landing">
      {/* The reframe spoken once more — calm, complete */}
      {track._reframe_text && (
        <div className="ns-landing-reframe">{track._reframe_text}</div>
      )}

      {/* The toward-sentence — the centrepiece */}
      {track.toward_sentence && (
        <div className="ns-landing-toward" style={{ borderLeftColor: colour }}>
          <div className="ns-landing-toward-eyebrow">What you’re actually for</div>
          <div className="ns-landing-toward-text">{track.toward_sentence}</div>
        </div>
      )}

      {/* The domain badge + Horizon Goal */}
      {primaryDomain && (
        <div className="ns-landing-domain">
          <div className="ns-landing-domain-badge" style={{ borderColor: colour, color: colour }}>
            {DOMAIN_LABELS[primaryDomain] || primaryDomain}
          </div>
          {track.horizon_goal && (
            <div className="ns-landing-horizon">
              <div className="ns-landing-horizon-eyebrow">The horizon</div>
              <div className="ns-landing-horizon-text">{track.horizon_goal}</div>
            </div>
          )}
        </div>
      )}

      {/* Not first, not alone */}
      <div className="ns-landing-not-alone">
        <div className="ns-landing-not-alone-eyebrow">You are not first</div>
        {loadingActors ? (
          <div className="ns-landing-actors-loading">Finding who’s already in this work…</div>
        ) : actors.length > 0 ? (
          <ul className="ns-landing-actors">
            {actors.map((a) => {
              const sentence = a.mission_statement || a.tagline
              return (
                <li key={a.id} className="ns-landing-actor">
                  <div className="ns-landing-actor-name">{a.name}</div>
                  {sentence && <div className="ns-landing-actor-tagline">{sentence}</div>}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="ns-landing-actors-empty">
            People are building toward this — we’ll surface them in your path.
          </div>
        )}
      </div>

      {/* Closing — the bridge into Phase 4 */}
      {track._closing && (
        <div className="ns-landing-closing">{track._closing}</div>
      )}

      <div className="ns-landing-cta">
        <button type="button" className="ns-cta-primary" onClick={onAccept}>
          Show me my path
        </button>
      </div>

      <style>{`
        .ns-landing {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin-top: 24px;
        }
        .ns-landing-reframe {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.06rem;
          line-height: 1.7;
          color: rgba(15,21,35,0.85);
          padding: 18px 22px;
          background: #FFFFFF;
          border: 1px solid rgba(38,36,32,0.18);
          border-radius: 14px;
          font-style: italic;
        }
        .ns-landing-toward {
          padding: 22px 26px;
          background: #FFFFFF;
          border-left: 4px solid;
          border-radius: 6px;
          box-shadow: 0 1px 0 rgba(15,21,35,0.04);
        }
        .ns-landing-toward-eyebrow {
          font-family: 'IBM Plex Mono', Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          color: rgba(15,21,35,0.55);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .ns-landing-toward-text {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.6rem;
          font-weight: 400;
          color: #0F1523;
          line-height: 1.35;
        }
        .ns-landing-domain {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ns-landing-domain-badge {
          display: inline-block;
          align-self: flex-start;
          font-family: 'IBM Plex Mono', Georgia, serif;
          font-size: 0.82rem;
          letter-spacing: 0.16em;
          padding: 6px 14px;
          border: 1px solid;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .ns-landing-horizon {
          padding: 16px 0 0;
        }
        .ns-landing-horizon-eyebrow {
          font-family: 'IBM Plex Mono', Georgia, serif;
          font-size: 0.7rem;
          letter-spacing: 0.18em;
          color: rgba(15,21,35,0.55);
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .ns-landing-horizon-text {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1rem;
          line-height: 1.65;
          color: rgba(15,21,35,0.82);
        }
        .ns-landing-not-alone {
          padding: 20px 22px;
          background: #FFFFFF;
          border: 1px solid rgba(38,36,32,0.18);
          border-radius: 14px;
        }
        .ns-landing-not-alone-eyebrow {
          font-family: 'IBM Plex Mono', Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          color: rgba(15,21,35,0.55);
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .ns-landing-actors {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ns-landing-actor-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.15rem;
          color: #0F1523;
        }
        .ns-landing-actor-tagline {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 0.94rem;
          color: rgba(15,21,35,0.65);
          line-height: 1.5;
        }
        .ns-landing-actors-loading,
        .ns-landing-actors-empty {
          font-family: 'Newsreader', Georgia, serif;
          color: rgba(15,21,35,0.65);
          font-style: italic;
        }
        .ns-landing-closing {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.3rem;
          line-height: 1.5;
          color: #0F1523;
          padding: 0 4px;
        }
        .ns-landing-cta {
          margin-top: 8px;
        }
        .ns-cta-primary {
          background: #4c6b45;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 14px 28px;
          font-family: 'IBM Plex Mono', Georgia, serif;
          font-size: 0.88rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ns-cta-primary:hover { background: #B0801F; }
      `}</style>
    </div>
  )
}
