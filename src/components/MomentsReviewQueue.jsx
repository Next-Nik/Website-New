// src/components/MomentsReviewQueue.jsx
//
// BP-2 · The moderation floor's founder side. Renders inside AdminConsole as
// the Moments tab. Reads open reports (founder RLS), shows the reported moment
// (image + line + who + when), and resolves each report one of two ways:
//
//   Remove  — soft-deletes the moment (deleted_at) and marks the report
//             resolution 'removed'. The owner keeps their data trail; the
//             moment stops rendering anywhere.
//   Keep    — marks the report resolution 'kept'. The moment stands.
//
// Also shows a small tail of recently resolved reports so decisions have a
// visible history. Plain styles, matching the console's register.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../hooks/useSupabase'

function imageUrl(path) {
  if (!path) return null
  const { data } = supabase.storage.from('moment-images').getPublicUrl(path)
  return data?.publicUrl || null
}

function when(ts) {
  try {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch (_) { return '' }
}

export default function MomentsReviewQueue({ toast }) {
  const [open, setOpen] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: openReports }, { data: recentReports }] = await Promise.all([
      supabase
        .from('moment_reports')
        .select('*, moment:moments(id, user_id, line, image_path, thumb_path, challenge_id, domain, created_at, deleted_at)')
        .is('resolved_at', null)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase
        .from('moment_reports')
        .select('id, reason, created_at, resolved_at, resolution, moment:moments(id, line)')
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(10),
    ])
    setOpen(openReports || [])
    setRecent(recentReports || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function resolve(report, resolution) {
    setBusy(report.id)
    try {
      if (resolution === 'removed' && report.moment?.id) {
        const { error: momentErr } = await supabase
          .from('moments')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', report.moment.id)
        if (momentErr) throw momentErr
      }
      const { error } = await supabase
        .from('moment_reports')
        .update({ resolved_at: new Date().toISOString(), resolution })
        .eq('id', report.id)
      if (error) throw error
      toast && toast(resolution === 'removed' ? 'Moment removed.' : 'Report dismissed — moment kept.')
      await load()
    } catch (_) {
      toast && toast('That didn\u2019t save. Try again.')
    }
    setBusy(null)
  }

  const box = { border: '1px solid rgba(15,21,35,0.14)', borderRadius: 8, padding: 14, marginBottom: 12, background: '#fff' }
  const meta = { fontSize: 13, opacity: 0.65 }
  const btn = { padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(15,21,35,0.2)', background: '#fff', cursor: 'pointer', fontSize: 13 }

  if (loading) return <p style={meta}>Loading reports…</p>

  return (
    <div>
      <h3 style={{ margin: '4px 0 2px' }}>Reported moments</h3>
      <p style={meta}>
        {open.length === 0
          ? 'Nothing waiting. Reports land here the moment someone files one.'
          : `${open.length} waiting for a decision.`}
      </p>

      {open.map(r => (
        <div key={r.id} style={box}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {r.moment?.image_path && (
              <img
                src={imageUrl(r.moment.thumb_path || r.moment.image_path)}
                alt="Reported moment"
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 220 }}>
              {r.moment?.line && <p style={{ margin: '0 0 6px', fontStyle: 'italic' }}>&ldquo;{r.moment.line}&rdquo;</p>}
              {!r.moment && <p style={{ margin: '0 0 6px', ...meta }}>The moment behind this report no longer exists.</p>}
              <p style={{ margin: '0 0 2px', ...meta }}>
                Reported {when(r.created_at)}{r.moment?.domain ? ` · domain: ${r.moment.domain}` : ''}
                {r.moment?.deleted_at ? ' · already hidden by its owner' : ''}
              </p>
              {r.reason && <p style={{ margin: '2px 0 0', fontSize: 13 }}>Reason given: {r.reason}</p>}
              {r.moment?.user_id && <p style={{ margin: '2px 0 0', ...meta }}>Poster: {r.moment.user_id}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              style={{ ...btn, borderColor: 'rgba(138,48,48,0.4)', color: '#8A3030' }}
              disabled={busy === r.id}
              onClick={() => resolve(r, 'removed')}
            >
              Remove moment
            </button>
            <button
              style={btn}
              disabled={busy === r.id}
              onClick={() => resolve(r, 'kept')}
            >
              Keep · dismiss report
            </button>
          </div>
        </div>
      ))}

      {recent.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ margin: '0 0 4px' }}>Recently resolved</h4>
          {recent.map(r => (
            <p key={r.id} style={{ ...meta, margin: '2px 0' }}>
              {when(r.resolved_at)} · {r.resolution === 'removed' ? 'removed' : 'kept'}
              {r.moment?.line ? ` · \u201C${String(r.moment.line).slice(0, 60)}\u201D` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
