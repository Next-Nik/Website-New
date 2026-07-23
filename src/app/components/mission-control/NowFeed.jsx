// ─────────────────────────────────────────────────────────────
// NowFeed — the Now beat's expanded state.
//
// The Now surface holds two states in one place: a quiet glance
// (the wheel + a few live counts) and, when you lean in, this
// feed — the real social layer of photos and lines people have
// posted. It reads the live `moments` table (the same source as
// the daily surface), all-time rather than today-only, and lets
// you post one straight from here via the shared MomentCapture
// composer (browser-side downscale + signed upload).
//
// Honesty: the chip on each card is the moment's own `domain`
// tag — the real field we have. The four reading-categories
// (Horizon · Now · Need · Doing) are a lens over the feed, not a
// stored field, so nothing here invents a category a person did
// not choose.
//
// Self-contained: it owns its fetch, loading, empty and error
// states, so a data hiccup degrades this panel alone rather than
// blanking the page.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { momentImageUrl } from '../../../lib/momentCapture'
import MomentCapture from '../MomentCapture'

function initialOf(id) {
  return (id || '?').toString().trim().charAt(0).toUpperCase() || '·'
}

function MomentPost({ moment, isMine }) {
  const img = moment.image_path
    ? momentImageUrl(moment.thumb_path || moment.image_path)
    : null
  const chip = moment.domain ? String(moment.domain).replace(/_/g, ' ') : null

  // Line-only moments (no photo) still belong in the feed — they render
  // as a quiet text card on the accent-soft ground.
  if (!img) {
    return (
      <div className="mc-post mc-post--text">
        {chip && <span className="mc-chip mc-chip--static">{chip}</span>}
        <div className="mc-post-line">{moment.line || 'A moment.'}</div>
        <div className="mc-post-who">
          <span className="mc-post-a">{isMine ? 'Y' : initialOf(moment.user_id)}</span>
          {isMine ? 'You' : 'A member'}
        </div>
      </div>
    )
  }

  return (
    <div className="mc-post">
      <div className="mc-post-media" style={{ backgroundImage: `url(${img})` }}>
        {chip && <span className="mc-chip">{chip}</span>}
        <div className="mc-cap">
          {moment.line && <div className="mc-cap-txt">{moment.line}</div>}
          <div className="mc-cap-who">
            <span className="mc-cap-a">{isMine ? 'Y' : initialOf(moment.user_id)}</span>
            {isMine ? 'You' : 'A member'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NowFeed({ userId, onCompose }) {
  const [moments, setMoments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const { data, error: qErr } = await supabase
        .from('moments')
        .select('id, line, image_path, thumb_path, domain, created_at, user_id')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(60)
      if (qErr) throw qErr
      setMoments(Array.isArray(data) ? data : [])
    } catch (_) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // A freshly posted moment slots straight to the top — no reload.
  const handleCaptured = useCallback((moment) => {
    if (moment) setMoments(prev => [moment, ...prev])
  }, [])

  return (
    <div className="mc-feed">
      <div className="mc-composer">
        <MomentCapture onCaptured={handleCaptured} />
        <div className="mc-composer-ask">
          Post a moment · <b>which of the four is this?</b> Horizon · Now · Need · Doing
        </div>
      </div>

      {loading && (
        <p className="mc-feed-note">Loading the feed…</p>
      )}

      {!loading && error && (
        <p className="mc-feed-note">
          The feed could not load just now.{' '}
          <button type="button" className="mc-feed-retry" onClick={load}>Try again</button>
        </p>
      )}

      {!loading && !error && moments.length === 0 && (
        <p className="mc-feed-note">
          No moments yet. The feed fills as people post what they are doing — be the first.
        </p>
      )}

      {!loading && !error && moments.length > 0 && (
        <div className="mc-feed-grid">
          {moments.map(m => (
            <MomentPost key={m.id} moment={m} isMine={!!userId && m.user_id === userId} />
          ))}
        </div>
      )}
    </div>
  )
}
