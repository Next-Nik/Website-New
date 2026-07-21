// src/app/components/Grove.jsx
//
// BP-11 · The constellation view of many people's tended things — a grove
// becoming a forest. Each small plant is one real person's kept practice.
// NO NAMES: this reads aggregate stage counts only (the grove_stage_counts
// RPC), never who. Absence and privacy both respected.
//
// Atlas rail. Renders a wrapping field of small plants at the stages the
// grove actually holds, capped so a large grove stays a picture not a wall.

import { useEffect, useState } from 'react'
import { at } from '../../lib/designTokens'
import { getGroveCounts } from '../lib/tendedThing'
import TendedThing from './TendedThing'

const serif = { fontFamily: "'Fraunces', Georgia, serif" }
const mono  = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }
const body  = { fontFamily: "'Newsreader', Georgia, serif" }

const CAP = 48  // most glyphs drawn; the rest are summed into a "+N more"

export default function Grove({ challengeId, title = 'The grove' }) {
  const [counts, setCounts] = useState({ total: 0, byStage: {} })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let live = true
    if (!challengeId) { setLoaded(true); return }
    getGroveCounts(challengeId).then(c => { if (live) { setCounts(c); setLoaded(true) } })
    return () => { live = false }
  }, [challengeId])

  if (!loaded || counts.total === 0) return null

  // Expand counts into individual glyphs, highest stages first so the grove
  // reads as growth, capped at CAP.
  const glyphs = []
  for (let stage = 4; stage >= 0; stage--) {
    const n = counts.byStage[stage] || 0
    for (let i = 0; i < n && glyphs.length < CAP; i++) glyphs.push(stage)
  }
  const overflow = counts.total - glyphs.length

  return (
    <section aria-label={title} style={{ marginTop: '28px' }}>
      <div style={{ ...mono, fontSize: '13px', letterSpacing: '0.18em',
        textTransform: 'uppercase', color: at.verdigris, marginBottom: '6px' }}>
        {title}
      </div>
      <p style={{ ...body, fontSize: '15px', color: at.ghost, lineHeight: 1.5,
        margin: '0 0 16px' }}>
        {counts.total} kept {counts.total === 1 ? 'practice' : 'practices'} · one plant each,
        no names · only what has grown.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
        {glyphs.map((stage, i) => (
          <TendedThing key={i} stage={stage} lastTendedAt={new Date().toISOString()}
            size="sm" caption={false} />
        ))}
        {overflow > 0 && (
          <span style={{ ...serif, fontWeight: 300, fontSize: '18px', color: at.ghost,
            alignSelf: 'center', paddingLeft: '4px' }}>
            +{overflow} more
          </span>
        )}
      </div>
    </section>
  )
}
