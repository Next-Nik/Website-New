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
//
// Social half · item 7 adds the second half of this screen: today's moments,
// and the ask that can put one or two of them at the top of the day. The
// brief called it "lifting"; it is simply asking somebody whether their
// moment may go up there, and them saying yes.
//
// Ordered by time and nothing else. There is no response count anywhere in
// the system to sort on — Echo was cut for exactly that reason — so this
// screen structurally cannot become a leaderboard. The cap of two a day, the
// 30-day rotation rule and the never-ask-twice rule all live in
// ask_to_feature (183), not in this component's discipline.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../hooks/useSupabase'
import { VIRTUES, virtueLabel, askToFeature, getTodaysMoments } from '../lib/featured'

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

// ─── Today's moments · the ask that puts one at the top ──────────────────────

function TodaysMoments({ toast }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [virtue, setVirtue] = useState({})   // momentId → virtue key
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await getTodaysMoments())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function ask(m) {
    setBusy(m.id)
    const r = await askToFeature(m.id, virtue[m.id] || null)
    setBusy(null)
    // The server's refusals are the interesting ones — "they were at the top
    // within the last 30 days", "a day holds two". Show them as written.
    toast && toast(r.ok ? 'Asked. It goes up only if they say yes.' : r.message)
    if (r.ok) await load()
  }

  const box  = { border: '1px solid rgba(15,21,35,0.14)', borderRadius: 8, padding: 14, marginBottom: 12, background: '#fff' }
  const meta = { fontSize: 13, opacity: 0.65 }
  const btn  = { padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(15,21,35,0.2)', background: '#fff', cursor: 'pointer', fontSize: 13 }
  const chip = (on) => ({
    fontSize: 13, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', marginRight: 6, marginTop: 6,
    border: `1px solid ${on ? 'rgba(169,116,63,0.5)' : 'rgba(15,21,35,0.16)'}`,
    background: on ? 'rgba(169,116,63,0.08)' : '#fff',
    color: on ? '#a9743f' : 'inherit',
  })

  const live = rows.filter(m => m.featured_consent === 'yes').length
  const asked = rows.filter(m => m.featured_consent === 'pending').length

  if (loading) return <p style={meta}>Loading today…</p>

  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ margin: '4px 0 2px' }}>Today&rsquo;s moments</h3>
      <p style={meta}>
        {live} at the top · {asked} asked and waiting · {rows.length} today.
        A day holds two, and that cap is the point.
      </p>
      <p style={{ ...meta, marginTop: 2 }}>
        In time order. There is nothing else to order it by, deliberately.
      </p>

      {rows.length === 0 && <p style={meta}>Nothing has landed yet today.</p>}

      {rows.map(m => {
        const state = m.featured_consent
        return (
          <div key={m.id} style={{ ...box, ...(state === 'yes' ? { borderColor: 'rgba(169,116,63,0.45)', background: 'rgba(169,116,63,0.05)' } : null) }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {m.image_path && (
                <img src={imageUrl(m.thumb_path || m.image_path)} alt="A moment"
                  style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 220 }}>
                {m.line && <p style={{ margin: '0 0 6px', fontStyle: 'italic' }}>&ldquo;{m.line}&rdquo;</p>}
                <p style={{ margin: '0 0 2px', ...meta }}>
                  {when(m.created_at)}{m.domain ? ` · ${m.domain}` : ''}
                </p>

                {state === 'none' && (
                  <>
                    <div>
                      {VIRTUES.map(v => (
                        <button key={v.key} type="button"
                          style={chip(virtue[m.id] === v.key)}
                          onClick={() => setVirtue(s => ({ ...s, [m.id]: s[m.id] === v.key ? null : v.key }))}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <button style={btn} disabled={busy === m.id} onClick={() => ask(m)}>
                        {busy === m.id ? 'Asking…' : 'Ask to show at the top'}
                      </button>
                    </div>
                  </>
                )}
                {state === 'pending' && (
                  <p style={{ ...meta, margin: '6px 0 0' }}>
                    Asked{m.featured_virtue ? ` · ${virtueLabel(m.featured_virtue)}` : ''} — waiting on them.
                    Silence is a no.
                  </p>
                )}
                {state === 'yes' && (
                  <p style={{ ...meta, margin: '6px 0 0', color: '#a9743f' }}>
                    At the top of Today{m.featured_virtue ? ` · ${virtueLabel(m.featured_virtue)}` : ''}.
                  </p>
                )}
                {state === 'no' && (
                  <p style={{ ...meta, margin: '6px 0 0' }}>They said no. Not asked again.</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
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

      <TodaysMoments toast={toast} />
    </div>
  )
}
