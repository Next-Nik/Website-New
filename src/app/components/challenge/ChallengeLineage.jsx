// src/app/components/challenge/ChallengeLineage.jsx
//
// Where a challenge sits in the constellation — the viewer-relative tree from
// migration 140. The focus node sits full; ancestors recede above, descendants
// fan below. The frame is one domain-coloured line at a single weight all the
// way around every card. Renders nothing for a standalone challenge with no
// parent and no children.

import { useState, useEffect } from 'react'
import { serif, sc, body as bodyFont, tokens } from '../../../lib/designTokens'

const HAIR = '1px solid rgba(200,146,42,0.18)'

function distanceStyle(absDist) {
  // The frame never dims. Recession lives in size and a light content softening.
  const map = [
    { title: 21, op: 1.0,  pad: '14px 16px' }, // focus
    { title: 18, op: 0.92, pad: '12px 15px' }, // 1 away
    { title: 16, op: 0.78, pad: '11px 14px' }, // 2 away
    { title: 15, op: 0.66, pad: '10px 14px' }, // 3+
  ]
  return map[Math.min(absDist, 3)]
}

function Node({ n, depthFromFocus, isFocus, colour }) {
  const s = distanceStyle(Math.abs(depthFromFocus))
  const inner = (n.taken_on_count || 0)
  const indent = Math.max(0, (n.tree_depth || 0)) * 22
  return (
    <div style={{ marginLeft: `${indent}px`, marginTop: '8px' }}>
      <div style={{
        border: `1.5px solid ${colour}`, borderRadius: '12px', background: tokens.bgCard,
        padding: s.pad, boxShadow: isFocus ? '0 8px 30px rgba(15,21,35,0.07)' : 'none',
      }}>
        <div style={{ opacity: s.op }}>
          <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: colour, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: colour, display: 'inline-block' }} />
            {(n.domain || '').replace(/(^|\s)\S/g, t => t.toUpperCase())}
            {isFocus && <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: tokens.gold, marginLeft: '8px' }}>YOU ARE HERE</span>}
          </span>
          <div style={{ ...serif, fontWeight: 300, fontSize: `${s.title}px`, color: tokens.dark, lineHeight: 1.2, margin: '4px 0 0' }}>
            {n.slug && !isFocus ? <a href={`/stretch/c/${n.slug}`} style={{ color: tokens.dark, textDecoration: 'none' }}>{n.title}</a> : n.title}
          </div>
          {n.actor_name && <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.1em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginTop: '2px' }}>by {n.actor_name}</div>}
          {inner > 0 && <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.06em', color: tokens.gold, marginTop: '6px' }}>{inner.toLocaleString()} in</div>}
        </div>
      </div>
    </div>
  )
}

export default function ChallengeLineage({ callId, colour }) {
  const [tree, setTree] = useState(null)

  useEffect(() => {
    if (!callId) return
    let live = true
    fetch('/api/challenge-lineage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_lineage', call_id: callId }),
    })
      .then(r => r.json())
      .then(d => { if (live) setTree(d) })
      .catch(() => {})
    return () => { live = false }
  }, [callId])

  if (!tree) return null
  const ancestors   = tree.ancestors   || []   // root-first, includes focus (depth_from_focus 0)
  const descendants = tree.descendants || []
  // Standalone: only the focus node, nothing above or below — don't render a section.
  if (ancestors.length <= 1 && descendants.length === 0) return null

  // assign a shared tree_depth for indentation: root = 0
  const focus = ancestors.find(a => a.depth_from_focus === 0)
  const rootDepth = ancestors.length - 1
  const withDepth = [
    ...ancestors.map(a => ({ ...a, tree_depth: rootDepth - a.depth_from_focus, isFocus: a.depth_from_focus === 0 })),
    ...descendants.map(d => ({ ...d, tree_depth: rootDepth + d.depth_below_focus, isFocus: false, depth_from_focus: d.depth_below_focus })),
  ]

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
      <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em', color: 'rgba(15,21,35,0.55)', textTransform: 'uppercase', marginBottom: '4px' }}>
        Its place in the constellation
      </div>
      {withDepth.map(n => (
        <Node key={n.id} n={n} depthFromFocus={n.depth_from_focus} isFocus={n.isFocus} colour={colour} />
      ))}
    </div>
  )
}
