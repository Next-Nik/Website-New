// NextSteps — Phase 5 (Loop)
// src/tools/nextsteps/phases/TrackLoop.jsx
//
// The returning surface. A person with one or more Tracks lands here.
// Each Track shows its toward-sentence, status, step counts, and last
// activity. The person picks one to walk, or starts a new Track.
//
// Emotional endpoint: CONTINUED — not finished-and-abandoned, but advanced,
// with the next step waiting.

const STATUS_LABELS = {
  planning: 'Planning',
  active:   'Walking',
  dormant:  'Parked',
  complete: 'Complete',
}

const STATUS_COLOURS = {
  planning: 'rgba(15,21,35,0.55)',
  active:   '#5B8C5A',
  dormant:  '#262420',
  complete: 'rgba(15,21,35,0.42)',
}

const DOMAIN_LABELS = {
  human: 'Human Being', society: 'Society', nature: 'Nature',
  tech: 'Technology', finance: 'Economy', legacy: 'Legacy',
  vision: 'Vision',
  path: 'Path', spark: 'Spark', body: 'Body',
  finances: 'Finances', connection: 'Connection',
  'inner-game': 'Inner Game', signal: 'Signal',
}

function formatRelative(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function TrackLoop({ tracks, onOpenTrack, onStartNew }) {
  // Sort: active first, then planning, then dormant, then complete.
  // Within a status, by updated_at descending.
  const statusOrder = { active: 0, planning: 1, dormant: 2, complete: 3 }
  const sorted = [...tracks].sort((a, b) => {
    const sa = statusOrder[a.status] ?? 99
    const sb = statusOrder[b.status] ?? 99
    if (sa !== sb) return sa - sb
    return new Date(b.updated_at) - new Date(a.updated_at)
  })

  return (
    <div className="ns-loop">
      <div className="ns-loop-actions">
        <button type="button" className="ns-cta-primary" onClick={onStartNew}>
          + Start a new track
        </button>
      </div>

      <ul className="ns-track-list">
        {sorted.map((track) => (
          <li
            key={track.id}
            className="ns-track-card"
            onClick={() => onOpenTrack(track.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpenTrack(track.id) }}
          >
            <div className="ns-track-row">
              <div className="ns-track-status" style={{ color: STATUS_COLOURS[track.status] }}>
                {STATUS_LABELS[track.status] || track.status}
              </div>
              <div className="ns-track-time">{formatRelative(track.updated_at)}</div>
            </div>

            <div className="ns-track-toward">
              {track.toward_sentence || (
                <span className="ns-track-toward-pending">
                  <em>{track.original_concern}</em>
                </span>
              )}
            </div>

            <div className="ns-track-meta">
              {Array.isArray(track.domains) && track.domains.length > 0 && (
                <span className="ns-track-domains">
                  {track.domains.map((d) => DOMAIN_LABELS[d] || d).join(' · ')}
                </span>
              )}
              {typeof track.total_steps === 'number' && track.total_steps > 0 && (
                <span className="ns-track-steps">
                  {track.done_steps || 0} of {track.total_steps} steps complete
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <style>{`
        .ns-loop {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .ns-loop-actions {
          display: flex;
          justify-content: flex-end;
        }
        .ns-cta-primary {
          background: #4c6b45;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 12px 22px;
          font-family: 'IBM Plex Mono', Georgia, serif;
          font-size: 0.82rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .ns-cta-primary:hover { background: #B0801F; }
        .ns-track-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ns-track-card {
          padding: 20px 22px;
          background: #FFFFFF;
          border: 1px solid rgba(38,36,32,0.18);
          border-radius: 14px;
          cursor: pointer;
          transition: border-color 0.15s, transform 0.05s;
        }
        .ns-track-card:hover {
          border-color: #4c6b45;
        }
        .ns-track-card:active {
          transform: scale(0.998);
        }
        .ns-track-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .ns-track-status {
          font-family: 'IBM Plex Mono', Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .ns-track-time {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 0.82rem;
          color: rgba(15,21,35,0.55);
        }
        .ns-track-toward {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.3rem;
          font-weight: 400;
          line-height: 1.45;
          color: #0F1523;
          margin-bottom: 12px;
        }
        .ns-track-toward-pending {
          color: rgba(15,21,35,0.6);
        }
        .ns-track-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          font-family: 'Newsreader', Georgia, serif;
          font-size: 0.88rem;
          color: rgba(15,21,35,0.65);
        }
        .ns-track-domains {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
