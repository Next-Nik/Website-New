// src/app/components/ShareArtifactButton.jsx
//
// BP-7 · The button that mints a moment or progress view into a shareable
// image and opens the native share sheet (fallback: download). Distinct from
// ShareButton, which shares a plain URL — this renders an artifact.
//
// `artifact` is either an opts object for renderArtifact, or a function
// returning one (sync or async) — so callers can compute it lazily at click
// time (e.g. to fold in the freshly-loaded horizon). Rail-aware via `tone`.

import { useState } from 'react'
import { shareArtifact } from '../lib/shareArtifact'
import { at, fn } from '../../lib/designTokens'

const mono = { fontFamily: "'Cormorant SC', Georgia, serif" }

export default function ShareArtifactButton({
  artifact,
  filename = 'nextus-moment.png',
  shareText,
  label = 'Share',
  tone = 'dark',
  size = 'md',
}) {
  const [state, setState] = useState('idle')  // idle | busy | done

  async function go(e) {
    e?.stopPropagation?.()
    if (state === 'busy') return
    setState('busy')
    try {
      const opts = typeof artifact === 'function' ? await artifact() : artifact
      await shareArtifact(opts || {}, { filename, shareText })
      setState('done')
      setTimeout(() => setState('idle'), 2400)
    } catch (_) {
      setState('idle')
    }
  }

  const dark = tone !== 'light'
  const ink  = dark ? at.text : fn.ink
  const edge = dark ? at.verdigrisEdge : fn.mossEdge
  const live = dark ? at.verdigris : fn.moss
  const pad  = size === 'sm' ? '6px 14px' : '9px 18px'

  return (
    <button type="button" onClick={go}
      aria-label="Share this as an image"
      style={{ ...mono, fontSize: '13px', letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: state === 'done' ? live : ink,
        background: 'transparent',
        border: `1px dashed ${edge}`, borderRadius: '22px',
        padding: pad, cursor: state === 'busy' ? 'default' : 'pointer',
        opacity: state === 'busy' ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {state === 'busy' ? 'Minting…' : state === 'done' ? 'Sent ✓' : `↑ ${label}`}
    </button>
  )
}
