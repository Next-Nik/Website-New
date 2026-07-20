// src/app/pages/DailySurface.jsx
//
// BP-6 · The daily surface — "window to now". The finite, daily place where
// witnessed moments land: photos and lines from real check-ins. It ends and
// resets each day; dignified when sparse. No infinite scroll, no ranking, no
// most-liked. A quiet report affordance sits on every moment (the moderation
// floor's user side, paired with the founder queue from BP-2).
//
// Honesty: the surface renders each person's own words and photo. It does not
// show a ranked or per-user-per-actor view. Counts are warm, never league
// tables. Working title — naming session pending.

import { useState, useEffect, useCallback } from 'react'
import { Nav } from '../../components/Nav'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../hooks/useSupabase'
import { serif, body, sc, at } from '../../lib/designTokens'
import { momentImageUrl, reportMoment } from '../../lib/momentCapture'

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function timeLabel(ts) {
  try {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
  } catch (_) { return '' }
}

function MomentCard({ moment, onReported }) {
  const [menu, setMenu] = useState(false)
  const [reported, setReported] = useState(false)
  const [busy, setBusy] = useState(false)
  const img = moment.image_path ? momentImageUrl(moment.thumb_path || moment.image_path) : null

  async function report() {
    setBusy(true)
    const ok = await reportMoment(moment.id, null)
    setBusy(false)
    setMenu(false)
    if (ok) { setReported(true); if (onReported) onReported(moment.id) }
  }

  return (
    <div style={{ background: at.object, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '14px', overflow: 'hidden', position: 'relative' }}>
      {img && (
        <img src={img} alt="A moment" style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }} />
      )}
      <div style={{ padding: '14px 16px' }}>
        {moment.line && (
          <p style={{ ...body, fontSize: '15px', color: at.text, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
            &ldquo;{moment.line}&rdquo;
          </p>
        )}
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.ghost, marginTop: moment.line ? '10px' : 0 }}>
          {timeLabel(moment.created_at)}{moment.domain ? ` · ${moment.domain}` : ''}
        </div>
      </div>

      {!reported ? (
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <button type="button" onClick={() => setMenu(m => !m)}
            aria-label="Report this moment"
            style={{ ...sc, fontSize: '16px', lineHeight: 1, color: img ? '#fff' : at.ghost, background: img ? 'rgba(0,0,0,0.35)' : 'none', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>
            ⋯
          </button>
          {menu && (
            <div style={{ position: 'absolute', top: '32px', right: 0, background: at.ground, border: `1px solid ${at.verdigrisEdge}`, borderRadius: '8px', padding: '4px', minWidth: '140px', zIndex: 5 }}>
              <button type="button" onClick={report} disabled={busy}
                style={{ ...body, fontSize: '13px', color: at.text, background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '8px 10px', cursor: 'pointer', borderRadius: '6px' }}>
                {busy ? 'Reporting…' : 'Report this moment'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ position: 'absolute', top: '10px', right: '12px', ...sc, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: at.ghost, background: img ? 'rgba(0,0,0,0.4)' : 'none', padding: '3px 6px', borderRadius: '4px' }}>
          Reported
        </div>
      )}
    </div>
  )
}

export function DailySurfacePage() {
  const { user } = useAuth()
  const [moments, setMoments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hidden, setHidden] = useState(() => new Set())

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const { data, error: qErr } = await supabase
        .from('moments')
        .select('id, line, image_path, thumb_path, domain, created_at')
        .is('deleted_at', null)
        .gte('created_at', startOfTodayISO())
        .order('created_at', { ascending: false })
        .limit(200)
      if (qErr) throw qErr
      setMoments(data || [])
    } catch (_) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const visible = moments.filter(m => !hidden.has(m.id))
  const hero = { ...serif, fontWeight: 300, color: at.text }

  return (
    <div style={{ minHeight: '100dvh', background: at.ground }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', textTransform: 'uppercase', color: at.verdigris, marginBottom: '8px' }}>
          Today
        </div>
        <h1 style={{ ...hero, fontSize: '34px', margin: '0 0 6px' }}>The work being done</h1>
        <p style={{ ...body, fontSize: '15px', color: at.ghost, margin: '0 0 32px', lineHeight: 1.5 }}>
          What people did today, in their own words. It fills through the day and begins again tomorrow.
        </p>

        {loading && <p style={{ ...body, color: at.ghost }}>Loading today…</p>}

        {error && !loading && (
          <div style={{ ...body, color: at.ghost }}>
            Couldn&rsquo;t load the surface just now.{' '}
            <button type="button" onClick={load} style={{ ...sc, fontSize: '13px', color: at.verdigris, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Try again</button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div style={{ ...body, fontSize: '16px', color: at.ghost, lineHeight: 1.6, padding: '30px 0' }}>
            Nothing yet today. The first moment lands here the moment someone checks in and adds a photo or a line.
            {user && <> Yours could be the first — check in on <a href="/challenges" style={{ color: at.verdigris }}>a challenge</a> and add a moment.</>}
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <>
            <div style={{ ...body, fontSize: '13px', color: at.ghost, marginBottom: '18px' }}>
              {visible.length} {visible.length === 1 ? 'moment' : 'moments'} so far today.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '18px' }}>
              {visible.map(m => (
                <MomentCard key={m.id} moment={m} onReported={id => setHidden(h => new Set(h).add(id))} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DailySurfacePage
