// src/app/components/pulse/PulseLines.jsx
//
// Social half · item 2 · The pulse, threaded through the daily surface. The
// ticker of true sentences interleaves between moment cards on /today, and
// carries the page on its own when the day is thin.
//
// This is the thing that makes "dignified when sparse" true instead of
// aspirational: on a quiet morning the room is still visibly moving, because
// the motion is real even when no photograph landed.
//
// Every line is backed by a real row. Nothing here is generated, padded, or
// smoothed — if the pulse is empty, the copy says so plainly rather than
// inventing company. See tickerLine.js for the privacy law.

import { useEffect, useState } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import { at, body, sc } from '../../../lib/designTokens'
import { tickerLine, relTime } from './tickerLine'

// Read a short recent window. The daily surface is finite by design, so this
// is a slice of motion, never an infinite scroll.
export function usePulseLines(limit = 24) {
  const [state, setState] = useState({ loading: true, lines: [] })

  useEffect(() => {
    let live = true
    supabase
      .from('nextus_platform_activity')
      .select('id, event_type, subject_type, subject_name, subject_slug, domain, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!live) return
        if (error) { console.warn('pulse read failed', error.message); setState({ loading: false, lines: [] }); return }
        // Drop rows whose copy comes out empty rather than rendering a blank row.
        const lines = (data || []).filter(a => tickerLine(a).trim().length > 0)
        setState({ loading: false, lines })
      })
    return () => { live = false }
  }, [limit])

  return state
}

// A run of lines. `heading` is shown only when the block is carrying the page
// rather than sitting between cards.
export default function PulseLines({ lines = [], heading = null }) {
  if (!lines.length) return null
  return (
    <section aria-label="Motion in the room"
      style={{ borderTop: `1px solid ${at.grid}`, borderBottom: `1px solid ${at.grid}`,
        margin: '22px 0', padding: '4px 0' }}>
      {heading && (
        <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: at.verdigris, padding: '12px 2px 2px' }}>
          {heading}
        </div>
      )}
      {lines.map(a => (
        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', gap: '14px', padding: '11px 2px' }}>
          <span style={{ ...body, fontSize: '14px', color: at.meta, lineHeight: 1.5 }}>
            {tickerLine(a)}
          </span>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.08em', color: at.ghost,
            whiteSpace: 'nowrap' }}>
            {relTime(a.created_at)}
          </span>
        </div>
      ))}
    </section>
  )
}
